CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_valid'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_valid
      CHECK (length(trim(username)) BETWEEN 1 AND 60);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_username text;
BEGIN
  profile_username := NULLIF(trim(NEW.raw_user_meta_data ->> 'username'), '');
  IF profile_username IS NULL THEN
    profile_username := split_part(NEW.email, '@', 1);
  END IF;

  INSERT INTO public.profiles (id, username, role, must_change_password)
  VALUES (NEW.id, profile_username, 'customer', false)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.complete_password_setup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET must_change_password = false
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for authenticated user';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_password_setup() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_password_setup() TO authenticated;

DROP POLICY IF EXISTS "update_own_orders" ON public.orders;
CREATE POLICY "customers_and_admins_update_orders" ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.prevent_customer_order_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.number IS DISTINCT FROM OLD.number
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.total IS DISTINCT FROM OLD.total
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Customers may only update order pickup details';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_customer_order_changes ON public.orders;
CREATE TRIGGER prevent_customer_order_changes
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_customer_order_changes();

CREATE OR REPLACE FUNCTION public.create_order_with_items(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_order public.orders;
  verified_total numeric(10,2);
  matched_items integer;
  requested_items integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS entry(item)
    WHERE NULLIF(entry.item ->> 'productId', '') IS NULL
      OR NULLIF(trim(entry.item ->> 'color'), '') IS NULL
      OR NULLIF(trim(entry.item ->> 'size'), '') IS NULL
      OR COALESCE(entry.item ->> 'quantity', '') !~ '^[1-9][0-9]*$'
  ) THEN
    RAISE EXCEPTION 'Order contains invalid item details';
  END IF;

  SELECT count(*)::integer, COALESCE(sum(product.price * (entry.item ->> 'quantity')::integer), 0)
  INTO matched_items, verified_total
  FROM jsonb_array_elements(p_items) AS entry(item)
  JOIN public.products AS product
    ON product.id = (entry.item ->> 'productId')::uuid
   AND product.status <> 'indisponivel';

  requested_items := jsonb_array_length(p_items);
  IF matched_items <> requested_items THEN
    RAISE EXCEPTION 'One or more selected products are unavailable';
  END IF;

  INSERT INTO public.orders (total)
  VALUES (verified_total)
  RETURNING * INTO new_order;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, color, size, quantity, unit_price, notes
  )
  SELECT
    new_order.id,
    product.id,
    product.name,
    trim(entry.item ->> 'color'),
    trim(entry.item ->> 'size'),
    (entry.item ->> 'quantity')::integer,
    product.price,
    NULLIF(trim(entry.item ->> 'notes'), '')
  FROM jsonb_array_elements(p_items) AS entry(item)
  JOIN public.products AS product
    ON product.id = (entry.item ->> 'productId')::uuid
   AND product.status <> 'indisponivel';

  RETURN jsonb_build_object(
    'id', new_order.id,
    'number', new_order.number,
    'total', new_order.total,
    'status', new_order.status,
    'pickup_date', new_order.pickup_date,
    'created_at', new_order.created_at,
    'order_items', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'product_id', item.product_id,
          'product_name', item.product_name,
          'color', item.color,
          'size', item.size,
          'quantity', item.quantity,
          'unit_price', item.unit_price,
          'notes', item.notes
        ))
        FROM public.order_items AS item
        WHERE item.order_id = new_order.id
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_items(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(jsonb) TO authenticated;
