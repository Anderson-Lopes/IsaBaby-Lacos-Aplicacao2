/*
# IsaBaby Laços — modelagem completa do back-end (revisão DBA)

## Decisões de design

1. profiles — perfil de aplicação para cada usuário autenticado.
   - PK id referencia auth.users ON DELETE CASCADE: se o usuário for removido do Auth, seu perfil some junto, sem órfãos.
   - username UNIQUE (case-insensitive via índice funcional lower(username)): "não podem existir 2 usuários com mesmo login".
   - role CHECK IN ('admin','customer'): única fonte de verdade sobre permissões. DEFAULT 'customer'.
   - must_change_password boolean: sinaliza contas pré-definidas que precisam trocar a senha no primeiro acesso.
   - created_at timestamptz DEFAULT now().

2. products — catálogo de laços (entidade "Laços" do domínio).
   - id uuid PK DEFAULT gen_random_uuid().
   - name, model, description text.
   - price numeric(10,2) CHECK (price > 0): "preço > 0".
   - quantity integer CHECK (quantity >= 0): estoque nunca negativo.
   - status text CHECK IN ('ativo','sob_encomenda','indisponivel'): mapeia o campo "ativo" do domínio em três estados operacionais.
   - image_url text (nullable).
   - created_at timestamptz DEFAULT now().

3. orders — pedido/agendamento de retirada (entidade "Agendamento" do domínio).
   - id uuid PK.
   - number integer GENERATED ALWAYS AS IDENTITY: número legível e único, sem colisão entre pedidos concorrentes.
   - user_id uuid FK → auth.users ON DELETE CASCADE: se o usuário for removido, seus pedidos somem junto (não há requisito de retenção neste MVP).
   - status text CHECK IN ('pendente','confirmado','em_producao','pronto_retirada','entregue','cancelado'): superconjunto dos status do domínio (pendente, confirmado, concluído, cancelado) com estágios intermediários de produção.
   - pickup_date date (nullable), pickup_time text (nullable): data e horário da retirada.
   - duration_minutes integer CHECK (duration_minutes BETWEEN 10 AND 480): "duração entre 10 e 480 min".
   - client_name text, client_phone text: dados do cliente informados no agendamento (espelham "cliente nome, cliente telefone" do domínio).
   - total numeric(10,2) CHECK (total >= 0): valor total do pedido, nunca negativo.
   - created_at timestamptz DEFAULT now().

4. order_items — itens personalizados dentro de um pedido.
   - id uuid PK.
   - order_id uuid FK → orders ON DELETE CASCADE: apagar o pedido apaga seus itens (não há sentido em itens órfãos).
   - product_id uuid FK → products ON DELETE SET NULL: se um laço for removido do catálogo, o pedido histórico preserva os dados (product_name, unit_price) e o product_id fica NULL — o pedido não perde informação.
   - product_name, color, size text NOT NULL: snapshot dos dados no momento do pedido, para que o histórico não mude se o produto for editado.
   - quantity integer CHECK (quantity >= 1): mínimo de 1 unidade.
   - unit_price numeric(10,2) NOT NULL: preço unitário no momento do pedido.
   - notes text (nullable).

5. Índices
   - profiles (lower(username)) UNIQUE: login case-insensitive, atende "não 2 usuários com mesmo login".
   - products (status): filtro frequente "ativos" no catálogo público.
   - products (name): busca por nome.
   - orders (user_id): "cada usuário vê só seus pedidos" — toda query filtra por user_id.
   - order_items (order_id): join pedido → itens.

6. RLS (revisão completa)
   - profiles: SELECT/INSERT/UPDATE por dono (auth.uid() = id). UPDATE limitado à coluna username (role e must_change_password não são graváveis pelo cliente). DELETE bloqueado para o cliente.
   - products: SELECT público (anon + authenticated) — catálogo é visível para todos. INSERT/UPDATE/DELETE só para admin via is_admin().
   - orders: SELECT vê próprios pedidos OU admin vê todos. INSERT/UPDATE só do próprio. DELETE bloqueado (não há requisito de o cliente apagar pedidos).
   - order_items: SELECT/INSERT vinculados ao dono do pedido pai. UPDATE/DELETE bloqueados (itens são imutáveis após criação).

7. Correções de segurança aplicadas nesta revisão
   - REVOKE de DELETE em orders, order_items e profiles para anon e authenticated (antes estavam concedidos indevidamente).
   - REVOKE de INSERT/UPDATE/DELETE em products para anon (catálogo é só leitura pública).
   - REVOKE de UPDATE em order_items (itens imutáveis após criação).
   - GRANT cirúrgico: só os verbos que cada role realmente usa, colunas que cada role realmente pode gravar.
   - Trigger on_auth_user_created: cria perfil 'customer' automaticamente no cadastro — antes o perfil ficava NULL para novos usuários.
   - is_admin() continua SECURITY DEFINER SET search_path = public, mas EXECUTE revogado de anon (só authenticated chama).

8. Observações
   - A conta admin pré-definida (TasianeM) é criada via fluxo de signup + atualização direta de role (já feita em etapa anterior).
   - Senhas nunca são armazenadas em tabelas — ficam no auth.users com hash bcrypt gerenciado pelo Supabase Auth.
   - "Catálogo geral para novos pedidos": products com SELECT público permite que qualquer usuário (mesmo sem login) veja o catálogo.
*/

-- =========================================================
-- profiles: já existe; adiciona índice único case-insensitive
-- =========================================================
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username));

-- =========================================================
-- orders: adiciona colunas de duração e cliente do agendamento
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'orders'
                   AND column_name = 'duration_minutes') THEN
    ALTER TABLE public.orders ADD COLUMN duration_minutes integer CHECK (duration_minutes BETWEEN 10 AND 480);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'orders'
                   AND column_name = 'client_name') THEN
    ALTER TABLE public.orders ADD COLUMN client_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'orders'
                   AND column_name = 'client_phone') THEN
    ALTER TABLE public.orders ADD COLUMN client_phone text;
  END IF;
END $$;

-- =========================================================
-- Índices de busca frequente
-- =========================================================
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products (status);
CREATE INDEX IF NOT EXISTS products_name_idx ON public.products (name);
CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);

-- =========================================================
-- Trigger: criar perfil 'customer' automaticamente no signup
-- (impede perfil NULL para novos usuários)
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    'customer'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- is_admin(): helper SECURITY DEFINER — só authenticated chama
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =========================================================
-- Revoga concessões excessivas herdadas da versão anterior
-- (anon e authenticated tinham DELETE em tudo; agora ficam mínimas)
-- =========================================================
REVOKE INSERT, UPDATE, DELETE ON public.products FROM anon;
REVOKE DELETE ON public.orders FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.order_items FROM anon, authenticated;
REVOKE DELETE ON public.profiles FROM anon, authenticated;

-- =========================================================
-- Concessões mínimas e cirúrgicas
-- =========================================================
-- products: leitura pública, escrita só para authenticated (RLS decide quem é admin)
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- orders: authenticated pode ler/criar/editar (RLS filtra por dono)
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

-- order_items: authenticated pode ler/criar (RLS filtra por dono do pedido pai)
GRANT SELECT, INSERT ON public.order_items TO authenticated;

-- profiles: authenticated lê/insere/atualiza apenas username
GRANT SELECT, INSERT ON public.profiles TO authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username) ON public.profiles TO authenticated;

-- =========================================================
-- Políticas RLS — profiles (dono)
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_username" ON public.profiles;
CREATE POLICY "update_own_username" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================
-- Políticas RLS — products (catálogo público, admin gerencia)
-- =========================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalog_is_public" ON public.products;
CREATE POLICY "catalog_is_public" ON public.products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins_manage_products" ON public.products;
CREATE POLICY "admins_manage_products" ON public.products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_update_products" ON public.products;
CREATE POLICY "admins_update_products" ON public.products FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admins_delete_products" ON public.products;
CREATE POLICY "admins_delete_products" ON public.products FOR DELETE
  TO authenticated USING (public.is_admin());

-- =========================================================
-- Políticas RLS — orders (dono vê os seus; admin vê todos)
-- =========================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_orders" ON public.orders;
CREATE POLICY "select_own_orders" ON public.orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_orders" ON public.orders;
CREATE POLICY "insert_own_orders" ON public.orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_orders" ON public.orders;
CREATE POLICY "update_own_orders" ON public.orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- Políticas RLS — order_items (vinculadas ao dono do pedido)
-- =========================================================
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_order_items" ON public.order_items;
CREATE POLICY "select_own_order_items" ON public.order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
              AND (orders.user_id = auth.uid() OR public.is_admin()))
  );

DROP POLICY IF EXISTS "insert_own_order_items" ON public.order_items;
CREATE POLICY "insert_own_order_items" ON public.order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
              AND orders.user_id = auth.uid())
  );
