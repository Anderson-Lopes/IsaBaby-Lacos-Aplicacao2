BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT extensions.plan(18);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'commerce-test-admin@example.invalid', 'test-hash', now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Test Admin"}', now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'commerce-test-customer@example.invalid', 'test-hash', now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Test Customer"}', now(), now())
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles
SET role = 'admin'
WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

INSERT INTO public.products (
  id, name, model, description, price, quantity, status, is_active
) VALUES (
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
  'RLS test bow', 'Test model', 'Test fixture', 12.50, 5, 'ativo', true
);

INSERT INTO public.orders (id, user_id, total)
VALUES (
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  1
);

INSERT INTO public.addresses (
  id, user_id, recipient_name, postal_code, state, city, district, street, number
) VALUES (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'Test Recipient', '01001000', 'SP', 'São Paulo', 'Centro', 'Rua Teste', '10'
);
INSERT INTO public.carts (id, user_id)
VALUES (
  'ffffffff-ffff-4fff-8fff-fffffffffff6',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
);
INSERT INTO public.cart_items (cart_id, product_id, color, size, quantity)
VALUES (
  'ffffffff-ffff-4fff-8fff-fffffffffff6',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
  'Rosa', 'Pequeno', 1
);

SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claim.sub" = '';
SELECT extensions.ok(
  (SELECT count(*) > 0 FROM public.products WHERE is_active),
  'anonymous users can read the public catalog'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.products (name, model, price, quantity) VALUES ('Anon', 'Denied', 1, 1)$$,
  '42501', NULL, 'anonymous users cannot create products'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
SELECT extensions.throws_ok(
  $$UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid()$$,
  '42501', NULL, 'customers cannot promote their own profile'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.profiles (id, username, role, account_status)
    VALUES (auth.uid(), 'forged-admin', 'admin', 'suspended')$$,
  '42501', NULL, 'customers cannot insert or configure their own profile'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.products (name, model, price, quantity) VALUES ('Customer', 'Denied', 1, 1)$$,
  '42501', NULL, 'customers cannot create products through the API'
);
SELECT extensions.throws_ok(
  $$UPDATE public.orders SET total = 0 WHERE user_id = auth.uid()$$,
  '42501', NULL, 'customers cannot modify order totals'
);
SELECT extensions.throws_ok(
  $$INSERT INTO public.cart_items (cart_id, product_id, color, size, quantity)
    VALUES ('ffffffff-ffff-4fff-8fff-fffffffffff6', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Azul', 'Grande', 1)$$,
  '42501', NULL, 'customers can only change carts through stock-checking RPCs'
);
SELECT extensions.is(
  (SELECT count(*) FROM public.orders WHERE id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4'),
  0::bigint,
  'customers cannot read another customer''s order'
);
SELECT extensions.throws_ok(
  $$SELECT public.admin_update_order_status('dddddddd-dddd-4ddd-8ddd-ddddddddddd4', 'confirmado')$$,
  'P0001', 'Administrator role required', 'customers cannot invoke administrator order actions'
);
SELECT extensions.lives_ok(
  $$SELECT public.add_to_cart(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Rosa', 'Pequeno', 1, NULL
  )$$,
  'a customer can add an in-stock item through the RPC'
);
SELECT extensions.lives_ok(
  $$SELECT public.create_order_from_cart('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5')$$,
  'a customer can place an order from their own cart'
);
SELECT extensions.is(
  (SELECT total FROM public.orders
   WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1),
  25.00::numeric,
  'the database calculates order totals from current product prices'
);
SELECT extensions.is(
  (SELECT quantity FROM public.products WHERE id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3'),
  3,
  'checkout reserves stock atomically'
);
SELECT extensions.throws_ok(
  $$SELECT public.add_to_cart(
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'Rosa', 'Pequeno', 4, NULL
  )$$,
  'P0001', 'Requested quantity exceeds available stock',
  'cart RPC rejects quantities above available stock'
);
SELECT extensions.throws_ok(
  $$SELECT public.request_order_pickup(
    (SELECT id FROM public.orders WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1),
    NULL::date,
    '09:00'
  )$$,
  'P0001', 'Pickup date and time are required',
  'pickup requests require a date and time'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
SELECT extensions.ok(
  (SELECT count(*) >= 2 FROM public.orders),
  'administrators can read orders across customers'
);
SELECT extensions.lives_ok(
  $$SELECT public.admin_update_order_status('dddddddd-dddd-4ddd-8ddd-ddddddddddd4', 'confirmado')$$,
  'administrators can update order status through the guarded RPC'
);
SELECT extensions.is(
  (SELECT entity_id FROM public.audit_logs
   WHERE entity = 'orders' AND entity_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4'
   ORDER BY created_at DESC LIMIT 1),
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
  'administrator audit logs retain the affected entity id'
);

SELECT * FROM extensions.finish();
ROLLBACK;
