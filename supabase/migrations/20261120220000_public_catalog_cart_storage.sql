ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  option_name text NOT NULL CHECK (length(trim(option_name)) BETWEEN 1 AND 60),
  option_values jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(option_values) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_options_product_idx
  ON public.product_options (product_id);

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.product_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_options TO authenticated;

DROP POLICY IF EXISTS "product_options_are_public" ON public.product_options;
CREATE POLICY "product_options_are_public" ON public.product_options FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins_manage_product_options" ON public.product_options;
CREATE POLICY "admins_manage_product_options" ON public.product_options FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "admins_upload_product_images" ON storage.objects;
CREATE POLICY "admins_upload_product_images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "admins_update_product_images" ON storage.objects;
CREATE POLICY "admins_update_product_images" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "admins_delete_product_images" ON storage.objects;
CREATE POLICY "admins_delete_product_images" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'product-images' AND public.is_admin());

CREATE OR REPLACE FUNCTION public.save_product_with_options(
  p_product_id uuid,
  p_name text,
  p_model text,
  p_description text,
  p_price numeric,
  p_quantity integer,
  p_status text,
  p_image_url text,
  p_category text,
  p_options jsonb
)
RETURNS public.products
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  saved_product public.products;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can manage products';
  END IF;
  IF p_options IS NULL OR jsonb_typeof(p_options) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Product options must be an array';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_options) AS entry(value)
    WHERE NULLIF(trim(entry.value ->> 'name'), '') IS NULL
      OR jsonb_typeof(entry.value -> 'values') IS DISTINCT FROM 'array'
      OR CASE
        WHEN jsonb_typeof(entry.value -> 'values') = 'array'
          THEN jsonb_array_length(entry.value -> 'values') = 0
        ELSE true
      END
  ) THEN
    RAISE EXCEPTION 'Each product option needs a name and at least one value';
  END IF;

  IF p_product_id IS NULL THEN
    INSERT INTO public.products (name, model, description, price, quantity, status, image_url, category)
    VALUES (trim(p_name), trim(p_model), trim(p_description), p_price, p_quantity, p_status, p_image_url, NULLIF(trim(p_category), ''))
    RETURNING * INTO saved_product;
  ELSE
    UPDATE public.products
    SET name = trim(p_name),
        model = trim(p_model),
        description = trim(p_description),
        price = p_price,
        quantity = p_quantity,
        status = p_status,
        image_url = p_image_url,
        category = NULLIF(trim(p_category), '')
    WHERE id = p_product_id
    RETURNING * INTO saved_product;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found or access denied';
    END IF;
    DELETE FROM public.product_options WHERE product_id = saved_product.id;
  END IF;

  INSERT INTO public.product_options (product_id, option_name, option_values)
  SELECT saved_product.id, trim(entry.value ->> 'name'), entry.value -> 'values'
  FROM jsonb_array_elements(p_options) AS entry(value);

  RETURN saved_product;
END;
$$;

REVOKE ALL ON FUNCTION public.save_product_with_options(uuid, text, text, text, numeric, integer, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product_with_options(uuid, text, text, text, numeric, integer, text, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
