ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

UPDATE public.products
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND image_url <> '' AND cardinality(image_urls) = 0;

CREATE OR REPLACE FUNCTION public.save_product_with_gallery(
  p_product_id uuid, p_name text, p_model text, p_description text,
  p_price numeric, p_quantity integer, p_status text, p_category text,
  p_options jsonb, p_image_urls text[]
)
RETURNS public.products
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  saved public.products;
BEGIN
  IF p_image_urls IS NULL OR cardinality(p_image_urls) > 20 OR array_position(p_image_urls, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid product images';
  END IF;
  saved := public.save_product_with_options(
    p_product_id, p_name, p_model, p_description, p_price, p_quantity, p_status,
    p_image_urls[1], p_category, p_options
  );
  UPDATE public.products SET image_urls = p_image_urls WHERE id = saved.id RETURNING * INTO saved;
  RETURN saved;
END;
$$;
REVOKE ALL ON FUNCTION public.save_product_with_gallery(uuid, text, text, text, numeric, integer, text, text, jsonb, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product_with_gallery(uuid, text, text, text, numeric, integer, text, text, jsonb, text[]) TO authenticated;

ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_token_hash text UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pendente'
    CHECK (payment_status IN ('pendente', 'pago')),
  ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS customizations jsonb NOT NULL DEFAULT '{}'::jsonb;

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
    OR NEW.guest_token_hash IS DISTINCT FROM OLD.guest_token_hash
    OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
    OR NEW.notes IS DISTINCT FROM OLD.notes
    OR NEW.client_name IS DISTINCT FROM OLD.client_name
  ) THEN
    RAISE EXCEPTION 'Customers may only update order pickup details';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_token text, p_customer_name text, p_notes text, p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  token_hash text;
  existing public.orders;
  new_order public.orders;
  entry jsonb;
  product public.products;
  selections jsonb;
  amount integer;
  verified_total numeric(10,2) := 0;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid order token';
  END IF;
  token_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(token_hash, 0));
  SELECT * INTO existing FROM public.orders WHERE guest_token_hash = token_hash;
  IF FOUND THEN
    RETURN jsonb_build_object('number', existing.number);
  END IF;
  IF length(trim(coalesce(p_customer_name, ''))) NOT BETWEEN 1 AND 100
     OR length(coalesce(p_notes, '')) > 500
     OR p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Dados do pedido inválidos';
  END IF;
  IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'O pedido deve conter entre 1 e 100 itens';
  END IF;

  FOR entry IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF coalesce(entry ->> 'productId', '') !~ '^[0-9a-fA-F-]{36}$'
       OR coalesce(entry ->> 'quantity', '') !~ '^[1-9][0-9]{0,3}$'
       OR jsonb_typeof(entry -> 'customizations') IS DISTINCT FROM 'object'
       OR length(coalesce(entry ->> 'notes', '')) > 200 THEN
      RAISE EXCEPTION 'Dados do item inválidos';
    END IF;
    amount := (entry ->> 'quantity')::integer;
    SELECT * INTO product FROM public.products WHERE id = (entry ->> 'productId')::uuid FOR SHARE;
    IF NOT FOUND OR product.status = 'indisponivel'
      OR (product.status = 'ativo' AND amount > product.quantity)
      OR (entry ->> 'productName') IS DISTINCT FROM product.name
      OR (entry ->> 'unitPrice')::numeric IS DISTINCT FROM product.price THEN
      RAISE EXCEPTION 'Produto indisponível ou preço alterado. Atualize o catálogo e revise o carrinho.';
    END IF;
    selections := entry -> 'customizations';
    IF EXISTS (
      SELECT 1 FROM public.product_options AS opt
      WHERE opt.product_id = product.id
        AND (NOT selections ? opt.option_name OR NOT opt.option_values ? (selections ->> opt.option_name))
    ) OR EXISTS (
      SELECT 1 FROM jsonb_object_keys(selections) AS selection(name)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.product_options AS opt
        WHERE opt.product_id = product.id AND opt.option_name = selection.name
      )
    ) THEN
      RAISE EXCEPTION 'As opções do produto mudaram. Revise o carrinho.';
    END IF;
    verified_total := verified_total + product.price * amount;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS entries(item)
    JOIN public.products AS p ON p.id = (entries.item ->> 'productId')::uuid
    WHERE p.status = 'ativo'
    GROUP BY p.id, p.quantity
    HAVING sum((entries.item ->> 'quantity')::integer) > p.quantity
  ) THEN
    RAISE EXCEPTION 'A quantidade solicitada excede o estoque disponível.';
  END IF;

  INSERT INTO public.orders (user_id, total, client_name, notes, guest_token_hash)
  VALUES (NULL, verified_total, trim(p_customer_name), NULLIF(trim(p_notes), ''), token_hash)
  RETURNING * INTO new_order;

  FOR entry IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO product FROM public.products WHERE id = (entry ->> 'productId')::uuid;
    amount := (entry ->> 'quantity')::integer;
    selections := entry -> 'customizations';
    INSERT INTO public.order_items
      (order_id, product_id, product_name, color, size, quantity, unit_price, notes, customizations)
    VALUES (new_order.id, product.id, product.name, coalesce(selections ->> 'Cor', ''),
      coalesce(selections ->> 'Tamanho', ''), amount, product.price,
      NULLIF(trim(entry ->> 'notes'), ''), selections);
  END LOOP;

  RETURN jsonb_build_object('number', new_order.number);
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_order_status(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  token_hash text;
  result jsonb;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN RETURN NULL; END IF;
  token_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(token_hash, 0));
  SELECT jsonb_build_object('payment_status', payment_status, 'status', status, 'number', number)
    INTO result FROM public.orders WHERE guest_token_hash = token_hash;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_guest_order(text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_order_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_order(text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_order_status(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_order_paid(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only administrators can confirm payments'; END IF;
  UPDATE public.orders SET payment_status = 'pago'
  WHERE id = p_order_id AND status <> 'cancelado' AND payment_status = 'pendente';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido cancelado, já pago ou não encontrado'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_order_paid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_order_paid(uuid) TO authenticated;
