/*
# E-commerce refactoring: product_options, category, simplified orders

## Changes
1. New table `product_options` — configurable customization options per product (color, size, finish, accessories, etc.)
   - id uuid PK
   - product_id uuid FK → products ON DELETE CASCADE (options die with the product)
   - option_name text NOT NULL (e.g. "Cor", "Tamanho", "Acabamento")
   - option_values text[] NOT NULL (array of allowed values, e.g. ["Rosa","Lilás","Amarelo"])
   - created_at timestamptz
   - UNIQUE (product_id, option_name) — no duplicate option names per product

2. products: add `category` text column (nullable) for catalog filtering
   - add `updated_at` timestamptz DEFAULT now()
   - trigger to auto-update updated_at on UPDATE

3. orders: add columns for WhatsApp checkout (no payment gateway)
   - customer_name text NOT NULL DEFAULT ''
   - customer_phone text NOT NULL DEFAULT ''
   - items jsonb NOT NULL DEFAULT '[]' — snapshot of cart items
   - notes text (nullable) — customer notes
   - The existing `user_id` can be NULL since customers don't log in
   - Remove payment_status constraint (values used differently now)

4. RLS for product_options — same as products: SELECT public, INSERT/UPDATE/DELETE admin-only

5. RLS for orders — anyone (anon) can INSERT (guest checkout); SELECT restricted to admin; no UPDATE/DELETE from client

6. Security
   - products: anon SELECT only; authenticated admin gets INSERT/UPDATE/DELETE (existing, kept)
   - product_options: same pattern as products
   - orders: anon + authenticated can INSERT (guest checkout); only admin can SELECT; no UPDATE/DELETE
*/

-- ============================================================
-- product_options table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  option_name text NOT NULL,
  option_values text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_options_product_name_key
  ON public.product_options (product_id, option_name);

CREATE INDEX IF NOT EXISTS product_options_product_idx
  ON public.product_options (product_id);

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.product_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_options TO authenticated;

DROP POLICY IF EXISTS "catalog_options_public" ON public.product_options;
CREATE POLICY "catalog_options_public" ON public.product_options FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins_manage_options" ON public.product_options;
CREATE POLICY "admins_manage_options" ON public.product_options FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_update_options" ON public.product_options;
CREATE POLICY "admins_update_options" ON public.product_options FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_delete_options" ON public.product_options;
CREATE POLICY "admins_delete_options" ON public.product_options FOR DELETE
  TO authenticated USING (public.is_admin());

-- ============================================================
-- products: add category + updated_at
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='products' AND column_name='category') THEN
    ALTER TABLE public.products ADD COLUMN category text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='products' AND column_name='updated_at') THEN
    ALTER TABLE public.products ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='products' AND column_name='is_active') THEN
    ALTER TABLE public.products ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='products' AND column_name='promotional_price') THEN
    ALTER TABLE public.products ADD COLUMN promotional_price numeric(10,2);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_touch_updated_at ON public.products;
CREATE TRIGGER products_touch_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- orders: add WhatsApp checkout columns, make user_id nullable
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='orders' AND column_name='items') THEN
    ALTER TABLE public.orders ADD COLUMN items jsonb NOT NULL DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='orders' AND column_name='notes') THEN
    ALTER TABLE public.orders ADD COLUMN notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='orders' AND column_name='payment_status') THEN
    ALTER TABLE public.orders ADD COLUMN payment_status text NOT NULL DEFAULT 'not_required';
  END IF;
END $$;

-- make user_id nullable (guest checkout)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================
-- orders RLS: anon can INSERT (guest), admin can SELECT
-- ============================================================
REVOKE UPDATE, DELETE ON public.orders FROM anon, authenticated;
REVOKE INSERT ON public.orders FROM authenticated;
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT SELECT ON public.orders TO authenticated;

DROP POLICY IF EXISTS "insert_own_orders" ON public.orders;
CREATE POLICY "insert_guest_orders" ON public.orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_own_orders" ON public.orders;
CREATE POLICY "select_admin_orders" ON public.orders FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "admins_update_orders" ON public.orders;

-- ============================================================
-- seed default product options for existing products
-- ============================================================
INSERT INTO public.product_options (product_id, option_name, option_values)
SELECT p.id, 'Cor', ARRAY['Rosa','Lilás','Amarelo','Verde']
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_options po
  WHERE po.product_id = p.id AND po.option_name = 'Cor'
);

INSERT INTO public.product_options (product_id, option_name, option_values)
SELECT p.id, 'Tamanho', ARRAY['Pequeno','Médio','Grande']
FROM public.products p
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_options po
  WHERE po.product_id = p.id AND po.option_name = 'Tamanho'
);

-- assign default categories
UPDATE public.products SET category = 'Clássicos' WHERE name IN ('Laço Boutique','Laço Escolar') AND category IS NULL;
UPDATE public.products SET category = 'Premium' WHERE name IN ('Laço Isa','Laço Luxo') AND category IS NULL;
UPDATE public.products SET category = 'Delicados' WHERE name = 'Laço Florzinha' AND category IS NULL;
UPDATE public.products SET category = 'Brilhantes' WHERE name = 'Laço Glitter' AND category IS NULL;

-- ensure is_active is set for existing products
UPDATE public.products SET is_active = true WHERE is_active IS NULL;
