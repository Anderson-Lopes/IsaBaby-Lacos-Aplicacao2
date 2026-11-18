ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended'));

UPDATE public.profiles AS profile
SET email = auth_user.email
FROM auth.users AS auth_user
WHERE auth_user.id = profile.id AND profile.email IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_key
  ON public.profiles (lower(email)) WHERE email IS NOT NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS promotional_price numeric(10, 2),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT products_promotional_price_check
    CHECK (promotional_price IS NULL OR (promotional_price > 0 AND promotional_price < price));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS address_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required'
    CHECK (payment_status IN ('not_required', 'pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  ADD COLUMN IF NOT EXISTS payment_provider text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND account_status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND account_status = 'active'
  );
$$;

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  recipient_name text NOT NULL,
  postal_code text NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  reference text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_user
  ON public.addresses (user_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS addresses_user_idx ON public.addresses (user_id);

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path text,
  image_url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_images_product_idx ON public.product_images (product_id);
CREATE UNIQUE INDEX IF NOT EXISTS product_images_one_primary_per_product
  ON public.product_images (product_id) WHERE is_primary;

INSERT INTO public.product_images (product_id, image_url, alt_text, is_primary)
SELECT id, image_url, name, true
FROM public.products
WHERE image_url IS NOT NULL AND image_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.product_images AS image WHERE image.product_id = products.id
  );

CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color text NOT NULL,
  size text NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id, color, size)
);
CREATE INDEX IF NOT EXISTS cart_items_cart_idx ON public.cart_items (cart_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('mercado_pago')),
  provider_preference_id text,
  provider_payment_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_order_idx ON public.payments (order_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs (actor_id);

ALTER TABLE public.addresses
  ADD CONSTRAINT addresses_recipient_name_check CHECK (length(trim(recipient_name)) BETWEEN 2 AND 120),
  ADD CONSTRAINT addresses_postal_code_check CHECK (postal_code ~ '^[0-9]{8}$'),
  ADD CONSTRAINT addresses_state_check CHECK (state ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT addresses_city_check CHECK (length(trim(city)) BETWEEN 1 AND 100),
  ADD CONSTRAINT addresses_district_check CHECK (length(trim(district)) BETWEEN 1 AND 100),
  ADD CONSTRAINT addresses_street_check CHECK (length(trim(street)) BETWEEN 1 AND 150),
  ADD CONSTRAINT addresses_number_check CHECK (length(trim(number)) BETWEEN 1 AND 20),
  ADD CONSTRAINT addresses_complement_check CHECK (complement IS NULL OR length(complement) <= 120),
  ADD CONSTRAINT addresses_reference_check CHECK (reference IS NULL OR length(reference) <= 200);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY profiles_select_owner_or_admin ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "products_public_read" ON public.products;
DROP POLICY IF EXISTS "catalog_is_public" ON public.products;
CREATE POLICY catalog_is_public ON public.products FOR SELECT
  TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS admins_view_all_products ON public.products;
CREATE POLICY admins_view_all_products ON public.products FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "select_own_orders" ON public.orders;
CREATE POLICY select_own_orders ON public.orders FOR SELECT
  TO authenticated USING (
    (auth.uid() = user_id AND public.is_active_user()) OR public.is_admin()
  );
DROP POLICY IF EXISTS "select_own_order_items" ON public.order_items;
CREATE POLICY select_own_order_items ON public.order_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND ((orders.user_id = auth.uid() AND public.is_active_user()) OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "product_images_public_read" ON public.product_images;
CREATE POLICY product_images_public_read ON public.product_images FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admins_manage_product_images" ON public.product_images;
CREATE POLICY admins_manage_product_images ON public.product_images FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY addresses_owner_all ON public.addresses FOR ALL
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user())
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

CREATE POLICY carts_owner_select ON public.carts FOR SELECT
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY carts_owner_insert ON public.carts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_active_user());
CREATE POLICY carts_owner_update ON public.carts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id AND public.is_active_user())
  WITH CHECK (auth.uid() = user_id AND public.is_active_user());

CREATE POLICY cart_items_owner_select ON public.cart_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
    AND public.is_active_user()
  );
CREATE POLICY cart_items_owner_delete ON public.cart_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
    AND public.is_active_user()
  );

CREATE POLICY payments_owner_or_admin_select ON public.payments FOR SELECT
  TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()
      AND public.is_active_user()
    )
  );
CREATE POLICY audit_logs_admin_select ON public.audit_logs FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, email, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    'customer',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$;

GRANT SELECT ON public.product_images, public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses, public.carts, public.cart_items TO authenticated;
REVOKE INSERT, UPDATE ON public.cart_items FROM anon, authenticated;
GRANT SELECT, DELETE ON public.cart_items TO authenticated;
GRANT SELECT ON public.payments, public.audit_logs TO authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, full_name, phone) ON public.profiles TO authenticated;
REVOKE INSERT ON public.profiles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_touch_updated_at ON public.products;
CREATE TRIGGER products_touch_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS addresses_touch_updated_at ON public.addresses;
CREATE TRIGGER addresses_touch_updated_at BEFORE UPDATE ON public.addresses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS carts_touch_updated_at ON public.carts;
CREATE TRIGGER carts_touch_updated_at BEFORE UPDATE ON public.carts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS cart_items_touch_updated_at ON public.cart_items;
CREATE TRIGGER cart_items_touch_updated_at BEFORE UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS payments_touch_updated_at ON public.payments;
CREATE TRIGGER payments_touch_updated_at BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "product_images_public_storage_read" ON storage.objects;
CREATE POLICY product_images_public_storage_read ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "admins_upload_product_images" ON storage.objects;
CREATE POLICY admins_upload_product_images ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
DROP POLICY IF EXISTS "admins_update_product_images" ON storage.objects;
CREATE POLICY admins_update_product_images ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
DROP POLICY IF EXISTS "admins_delete_product_images" ON storage.objects;
CREATE POLICY admins_delete_product_images ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'product-images' AND public.is_admin());

CREATE OR REPLACE FUNCTION public.create_order_from_cart(p_address_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cart_id uuid;
  v_address public.addresses%ROWTYPE;
  v_item record;
  v_product public.products%ROWTYPE;
  v_order_id uuid;
  v_order_number integer;
  v_total numeric(10, 2) := 0;
  v_lines jsonb := '[]'::jsonb;
  v_price numeric(10, 2);
  v_stock_reserved boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Active account required';
  END IF;

  SELECT * INTO v_address
  FROM public.addresses
  WHERE id = p_address_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery address not found';
  END IF;

  SELECT id INTO v_cart_id
  FROM public.carts
  WHERE user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shopping cart is empty';
  END IF;

  PERFORM products.id
  FROM public.products
  JOIN public.cart_items ON cart_items.product_id = products.id
  WHERE cart_items.cart_id = v_cart_id
  ORDER BY products.id
  FOR UPDATE OF products;

  FOR v_item IN
    SELECT product_id, color, size, quantity, notes
    FROM public.cart_items
    WHERE cart_id = v_cart_id
    ORDER BY product_id, color, size
  LOOP
    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_item.product_id;

    IF NOT FOUND OR NOT v_product.is_active OR v_product.status = 'indisponivel' THEN
      RAISE EXCEPTION 'A product in the cart is no longer available';
    END IF;

    IF v_item.quantity < 1 OR v_item.quantity > 99 THEN
      RAISE EXCEPTION 'Invalid product quantity';
    END IF;

    v_price := COALESCE(v_product.promotional_price, v_product.price);
    v_stock_reserved := v_product.status = 'ativo';
    IF v_stock_reserved THEN
      IF v_product.quantity < v_item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product %', v_product.name;
      END IF;
      UPDATE public.products
      SET quantity = quantity - v_item.quantity, updated_at = now()
      WHERE id = v_product.id;
    END IF;

    v_total := v_total + v_price * v_item.quantity;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'color', v_item.color,
      'size', v_item.size,
      'quantity', v_item.quantity,
      'unit_price', v_price,
      'notes', v_item.notes,
      'stock_reserved', v_stock_reserved
    ));
  END LOOP;

  IF jsonb_array_length(v_lines) = 0 THEN
    RAISE EXCEPTION 'Shopping cart is empty';
  END IF;

  INSERT INTO public.orders (user_id, status, payment_status, payment_provider, total, address_snapshot)
  VALUES (
    v_user_id,
    'pendente',
    'pending',
    'mercado_pago',
    v_total,
    jsonb_build_object(
      'recipient_name', v_address.recipient_name,
      'postal_code', v_address.postal_code,
      'state', v_address.state,
      'city', v_address.city,
      'district', v_address.district,
      'street', v_address.street,
      'number', v_address.number,
      'complement', v_address.complement,
      'reference', v_address.reference
    )
  )
  RETURNING id, number INTO v_order_id, v_order_number;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, color, size, quantity, unit_price, notes, stock_reserved
  )
  SELECT
    v_order_id,
    (line.value ->> 'product_id')::uuid,
    line.value ->> 'product_name',
    line.value ->> 'color',
    line.value ->> 'size',
    (line.value ->> 'quantity')::integer,
    (line.value ->> 'unit_price')::numeric,
    NULLIF(line.value ->> 'notes', ''),
    (line.value ->> 'stock_reserved')::boolean
  FROM jsonb_array_elements(v_lines) AS line(value);

  INSERT INTO public.payments (order_id, provider, amount)
  VALUES (v_order_id, 'mercado_pago', v_total);

  DELETE FROM public.cart_items WHERE cart_id = v_cart_id;
  RETURN jsonb_build_object('id', v_order_id, 'number', v_order_number, 'total', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_to_cart(
  p_product_id uuid,
  p_color text,
  p_size text,
  p_quantity integer,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cart_id uuid;
  v_product public.products%ROWTYPE;
  v_quantity integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'Active account required'; END IF;
  IF p_quantity < 1 OR p_quantity > 99 THEN RAISE EXCEPTION 'Invalid product quantity'; END IF;
  IF length(p_color) NOT BETWEEN 1 AND 40 OR length(p_size) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'Invalid product customization';
  END IF;
  IF length(COALESCE(p_notes, '')) > 200 THEN RAISE EXCEPTION 'Notes are too long'; END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND OR NOT v_product.is_active OR v_product.status = 'indisponivel' THEN
    RAISE EXCEPTION 'Product is unavailable';
  END IF;

  INSERT INTO public.carts (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO v_cart_id FROM public.carts WHERE user_id = v_user_id;

  INSERT INTO public.cart_items (cart_id, product_id, color, size, quantity, notes)
  VALUES (v_cart_id, p_product_id, p_color, p_size, p_quantity, NULLIF(p_notes, ''))
  ON CONFLICT (cart_id, product_id, color, size) DO UPDATE
    SET quantity = cart_items.quantity + EXCLUDED.quantity,
        notes = EXCLUDED.notes,
        updated_at = now()
  RETURNING quantity INTO v_quantity;

  IF v_quantity > 99 OR (v_product.status = 'ativo' AND v_quantity > v_product.quantity) THEN
    RAISE EXCEPTION 'Requested quantity exceeds available stock';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_cart_item_quantity(p_item_id uuid, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_product public.products%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'Active account required'; END IF;
  IF p_quantity < 1 OR p_quantity > 99 THEN RAISE EXCEPTION 'Invalid product quantity'; END IF;

  SELECT products.* INTO v_product
  FROM public.products
  JOIN public.cart_items ON cart_items.product_id = products.id
  JOIN public.carts ON carts.id = cart_items.cart_id
  WHERE cart_items.id = p_item_id AND carts.user_id = v_user_id
  FOR UPDATE OF products, cart_items;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cart item not found'; END IF;
  IF NOT v_product.is_active OR v_product.status = 'indisponivel' THEN
    RAISE EXCEPTION 'Product is unavailable';
  END IF;
  IF v_product.status = 'ativo' AND p_quantity > v_product.quantity THEN
    RAISE EXCEPTION 'Requested quantity exceeds available stock';
  END IF;

  UPDATE public.cart_items SET quantity = p_quantity, updated_at = now()
  WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_default_address(p_address_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'Active account required'; END IF;
  UPDATE public.addresses SET is_default = false
  WHERE user_id = auth.uid() AND is_default;
  UPDATE public.addresses SET is_default = true, updated_at = now()
  WHERE id = p_address_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Address not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_product_primary_image(p_product_id uuid, p_image_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_image_url text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator role required'; END IF;
  SELECT image_url INTO v_image_url
  FROM public.product_images
  WHERE id = p_image_id AND product_id = p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product image not found'; END IF;

  UPDATE public.product_images SET is_primary = false WHERE product_id = p_product_id AND is_primary;
  UPDATE public.product_images SET is_primary = true WHERE id = p_image_id;
  UPDATE public.products SET image_url = v_image_url, updated_at = now() WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_payment_preference(p_order_id uuid, p_preference_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.payments
  SET provider_preference_id = p_preference_id, updated_at = now()
  FROM public.orders
  WHERE payments.order_id = p_order_id
    AND orders.id = payments.order_id
    AND orders.user_id = auth.uid()
    AND payments.status = 'pending'
    AND length(p_preference_id) BETWEEN 1 AND 200;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending payment not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_unpaid_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.orders
  SET status = 'cancelado', payment_status = 'cancelled'
  WHERE id = p_order_id AND status = 'pendente' AND payment_status = 'pending';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.products
  SET quantity = products.quantity + order_items.quantity, updated_at = now()
  FROM public.order_items
  WHERE order_items.order_id = p_order_id
    AND order_items.product_id = products.id
    AND order_items.stock_reserved;

  UPDATE public.payments
  SET status = 'cancelled', updated_at = now()
  WHERE order_id = p_order_id AND status = 'pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.record_mercado_pago_result(
  p_order_id uuid,
  p_payment_id text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous_status text;
  v_previous_payment_id text;
BEGIN
  IF p_status NOT IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment status';
  END IF;

  SELECT status, provider_payment_id INTO v_previous_status, v_previous_payment_id
  FROM public.payments
  WHERE order_id = p_order_id AND provider = 'mercado_pago'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;
  IF v_previous_status IN ('rejected', 'cancelled', 'refunded')
    AND p_status NOT IN (v_previous_status, 'refunded') THEN
    RETURN;
  END IF;
  IF v_previous_status = 'approved' AND p_status NOT IN ('approved', 'refunded') THEN
    RETURN;
  END IF;
  IF v_previous_status = 'approved' AND p_status = 'approved'
    AND v_previous_payment_id IS NOT NULL AND v_previous_payment_id <> p_payment_id THEN
    RAISE EXCEPTION 'A different payment is already approved for this order';
  END IF;

  UPDATE public.payments
  SET provider_payment_id = NULLIF(p_payment_id, ''),
      status = p_status,
      updated_at = now()
  WHERE order_id = p_order_id;

  UPDATE public.orders
  SET payment_status = p_status,
      status = CASE
        WHEN p_status = 'approved' THEN 'confirmado'
        WHEN p_status IN ('rejected', 'cancelled') AND status = 'pendente' THEN 'cancelado'
        ELSE status
      END
  WHERE id = p_order_id;

  IF p_status IN ('rejected', 'cancelled') AND v_previous_status = 'pending' THEN
    UPDATE public.products
    SET quantity = products.quantity + order_items.quantity, updated_at = now()
    FROM public.order_items
    WHERE order_items.order_id = p_order_id
      AND order_items.product_id = products.id
      AND order_items.stock_reserved;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_order_status(p_order_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator role required';
  END IF;
  IF p_status NOT IN ('pendente', 'confirmado', 'em_producao', 'pronto_retirada', 'entregue', 'cancelado') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;

  UPDATE public.orders SET status = p_status WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_order_pickup(p_order_id uuid, p_date date, p_time text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Active authenticated account required';
  END IF;
  IF p_date IS NULL OR p_time IS NULL THEN
    RAISE EXCEPTION 'Pickup date and time are required';
  END IF;
  IF p_date < current_date THEN RAISE EXCEPTION 'Pickup date cannot be in the past'; END IF;
  IF p_time NOT IN ('09:00', '10:00', '14:00', '16:00', '17:00', '18:00') THEN
    RAISE EXCEPTION 'Pickup time is unavailable';
  END IF;

  UPDATE public.orders
  SET pickup_date = p_date, pickup_time = p_time
  WHERE id = p_order_id
    AND user_id = auth.uid()
    AND payment_status IN ('approved', 'not_required')
    AND status NOT IN ('cancelado', 'entregue');
  IF NOT FOUND THEN RAISE EXCEPTION 'Eligible order not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_password_change()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.profiles SET must_change_password = false WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(p_user_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Administrator role required'; END IF;
  IF p_status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'Invalid account status'; END IF;
  IF p_user_id = auth.uid() AND p_status = 'suspended' THEN
    RAISE EXCEPTION 'Administrators cannot suspend their own account';
  END IF;
  UPDATE public.profiles SET account_status = p_status WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_admin_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_id text;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP <> 'INSERT' THEN v_old := jsonb_build_object('status', OLD.status); END IF;
    IF TG_OP <> 'DELETE' THEN v_new := jsonb_build_object('status', NEW.status); END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF TG_OP <> 'INSERT' THEN v_old := jsonb_build_object('role', OLD.role, 'account_status', OLD.account_status); END IF;
    IF TG_OP <> 'DELETE' THEN v_new := jsonb_build_object('role', NEW.role, 'account_status', NEW.account_status); END IF;
  ELSIF TG_TABLE_NAME = 'product_images' THEN
    IF TG_OP <> 'INSERT' THEN v_old := jsonb_build_object('product_id', OLD.product_id, 'is_primary', OLD.is_primary); END IF;
    IF TG_OP <> 'DELETE' THEN v_new := jsonb_build_object('product_id', NEW.product_id, 'is_primary', NEW.is_primary); END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN
      v_old := jsonb_build_object(
        'name', OLD.name, 'price', OLD.price, 'promotional_price', OLD.promotional_price,
        'quantity', OLD.quantity, 'status', OLD.status, 'is_active', OLD.is_active
      );
    END IF;
    IF TG_OP <> 'DELETE' THEN
      v_new := jsonb_build_object(
        'name', NEW.name, 'price', NEW.price, 'promotional_price', NEW.promotional_price,
        'quantity', NEW.quantity, 'status', NEW.status, 'is_active', NEW.is_active
      );
    END IF;
  END IF;
  v_id := CASE
    WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ->> 'id'
    ELSE to_jsonb(NEW) ->> 'id'
  END;
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, v_id, jsonb_build_object('old', v_old, 'new', v_new));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS products_admin_audit ON public.products;
CREATE TRIGGER products_admin_audit
AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.audit_admin_changes();
DROP TRIGGER IF EXISTS product_images_admin_audit ON public.product_images;
CREATE TRIGGER product_images_admin_audit
AFTER INSERT OR UPDATE OR DELETE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.audit_admin_changes();
DROP TRIGGER IF EXISTS profiles_admin_audit ON public.profiles;
CREATE TRIGGER profiles_admin_audit
AFTER UPDATE OF role, account_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_admin_changes();
DROP TRIGGER IF EXISTS orders_admin_audit ON public.orders;
CREATE TRIGGER orders_admin_audit
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_admin_changes();

REVOKE ALL ON FUNCTION public.create_order_from_cart(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.add_to_cart(uuid, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_to_cart(uuid, text, text, integer, text) TO authenticated;
REVOKE ALL ON FUNCTION public.update_cart_item_quantity(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_cart_item_quantity(uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.set_default_address(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_default_address(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.set_product_primary_image(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_primary_image(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_password_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_password_change() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_set_account_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
REVOKE ALL ON FUNCTION public.set_payment_preference(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_payment_preference(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_unpaid_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_unpaid_order(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.record_mercado_pago_result(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_mercado_pago_result(uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.request_order_pickup(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_order_pickup(uuid, date, text) TO authenticated;
REVOKE ALL ON FUNCTION public.audit_admin_changes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_admin_changes() TO service_role;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
