# Manual de execução local — IsaBaby Laços

> Banco de dados: **PostgreSQL 15** via Supabase (não MySQL).
> Se você precisa rodar em MySQL, o DDL precisa ser adaptado (tipos, funções e RLS mudam).

---

## 1. Pré-requisitos

- Node.js 18 ou superior — `node -v`
- npm 9 ou superior — `npm -v`
- Navegador moderno (Chrome, Firefox, Edge)

---

## 2. Instalar dependências

```bash
npm install
```

---

## 3. Rodar o projeto

```bash
npm run dev
```

O Vite sobe o servidor em `http://localhost:5173`.
Abra no navegador.

---

## 4. Banco de dados — como funciona

O projeto já vem com um Supabase provisionado. As credenciais estão no arquivo `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Você **não precisa instalar nada** — o Supabase roda na nuvem e o app se conecta automaticamente.

### 4.1 Verificar o banco pelo SQL Editor do Supabase

1. Acesse o painel do Supabase (https://supabase.com/dashboard).
2. Selecione o projeto.
3. Vá em **SQL Editor** no menu lateral.
4. Cole e rode:

```sql
-- listar tabelas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

-- ver produtos
SELECT id, name, model, price, quantity, status FROM products ORDER BY name;

-- ver perfis
SELECT id, username, role, must_change_password, created_at FROM profiles;

-- ver pedidos
SELECT number, user_id, status, total, pickup_date, created_at FROM orders ORDER BY created_at DESC;

-- ver itens dos pedidos
SELECT * FROM order_items;
```

### 4.2 Ver políticas RLS ativas

```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

### 4.3 Ver grants por role

```sql
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;
```

---

## 5. Contas de teste

### Administradora (acesso total)

| Campo | Valor |
|---|---|
| E-mail |__________ |
| Senha | ____________________ |
| Papel | admin |
| O que pode | cadastrar/editar/excluir produtos, ver todos os pedidos |

No primeiro login, o app pede troca de senha (campo `must_change_password = true`).

### Cliente comum (só compras)

Crie pela própria tela de cadastro do app, ou via SQL Editor:

```sql
-- nao use isso — crie pela tela do app para o trigger criar o perfil automaticamente
```

> Importante: sempre cadastre novos usuários pela tela do app.
> O trigger `on_auth_user_created` cria o perfil `customer` automaticamente.
> Se criar direto no auth.users sem o trigger, o perfil fica NULL.

---

## 6. O que testar

### 6.1 Login

- Login com TasianeM → entra como admin.
- Login com cliente comum → entra como cliente.
- E-mail/senha errados → mensagem de erro.

### 6.2 Catálogo (todos os usuários)

- Ver os 6 laços cadastrados.
- Buscar por nome.
- Clicar num laço → abre detalhes e personalização.
- Laço indisponível (Glitter) → botão "Adicionar ao pedido" desabilitado.

### 6.3 Cadastro de produtos (só admin)

- Login como TasianeM → botão "Novo Cadastro" funciona.
- Login como cliente → botão "Novo Cadastro" não aparece.
- Tentar inserir produto direto no banco como cliente → bloqueado por RLS.

### 6.4 Personalização e pedido

- Escolher cor, tamanho, quantidade.
- Total calcula automaticamente.
- "Adicionar ao pedido" → confirmação.
- "Finalizar pedido" → vai para tela de Pedidos.

### 6.5 Pedidos e agendamento

- Ver total de pedidos e pendentes.
- Agendar retirada (data não pode ser passada, horários indisponíveis bloqueados).
- Ver status de cada pedido.

### 6.6 Validações do formulário

- Nome vazio → erro.
- Preço 0 ou negativo → erro.
- Quantidade negativa → erro.
- Não envia com campos inválidos.

---

## 7. Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera versão de produção na pasta `dist/` |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npm run lint` | Roda o ESLint |
| `npm run preview` | Pré-visualiza a build de produção |

---

## 8. Estrutura das tabelas

```
profiles
  id              uuid PK → auth.users
  username        text UNIQUE (case-insensitive)
  role            text ('admin' | 'customer')
  must_change_password boolean
  created_at      timestamptz

products
  id              uuid PK
  name            text
  model           text
  description     text
  price           numeric(10,2) CHECK > 0
  quantity        integer CHECK >= 0
  status          text ('ativo' | 'sob_encomenda' | 'indisponivel')
  image_url       text
  created_at      timestamptz

orders
  id              uuid PK
  number          integer GENERATED ALWAYS AS IDENTITY
  user_id         uuid FK → auth.users (CASCADE)
  status          text (6 valores)
  pickup_date     date
  pickup_time     text
  duration_minutes integer CHECK 10..480
  client_name     text
  client_phone    text
  total           numeric(10,2) CHECK >= 0
  created_at      timestamptz

order_items
  id              uuid PK
  order_id        uuid FK → orders (CASCADE)
  product_id      uuid FK → products (SET NULL)
  product_name    text
  color           text
  size            text
  quantity        integer CHECK >= 1
  unit_price      numeric(10,2)
  notes           text
```

---

## 9. Regras RLS resumidas

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | dono | dono | dono (só username) | bloqueado |
| products | público | admin | admin | admin |
| orders | dono + admin | dono | dono | bloqueado |
| order_items | dono + admin | dono | bloqueado | bloqueado |

---

## 10. Rodar PostgreSQL local (opcional)

Se quiser rodar o banco local em vez do Supabase na nuvem:

### 10.1 Instalar PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15
```

### 10.2 Criar banco

```bash
sudo -u postgres psql
CREATE DATABASE isababy;
CREATE USER isababy_user WITH PASSWORD 'sua_senha';
GRANT ALL PRIVILEGES ON DATABASE isababy TO isababy_user;
\q
```

### 10.3 Importar o schema

Os arquivos de migration estão em `supabase/migrations/`.
Rode em ordem pelo psql:

```bash
psql -U isababy_user -d isababy -f supabase/migrations/20261115201929_create_auth_catalog_orders_schema.sql.sql
psql -U isababy_user -d isababy -f supabase/migrations/20261116224023_backend_modeling_complete.sql.sql
psql -U isababy_user -d isababy -f supabase/migrations/20261116224035_revoke_trigger_functions_execute.sql.sql
```

> Aviso: as funções `auth.uid()` e `auth.users` são específicas do Supabase.
> Para rodar em PostgreSQL puro, você precisará adaptar:
> - Criar uma tabela `users` própria ou usar `current_user`.
> - Substituir `auth.uid()` por uma função que retorna o ID do usuário da sessão.
> - Remover o trigger `on_auth_user_created` (ele depende do Auth do Supabase).

### 10.4 Apontar o app para o banco local

Crie um arquivo `.env.local`:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=sua_chave_local
```

> Para Supabase local completo (com Auth), use o Supabase CLI:
> `npx supabase init && npx supabase start`
> Isso sobe todos os serviços localmente em Docker.

---

## 11. Problemas comuns

| Problema | Solução |
|---|---|
| Tela branca ao abrir | Verifique se `.env` existe e tem as variáveis |
| "Invalid API key" | Credenciais do Supabase incorretas |
| Login não funciona | Verifique e-mail/senha; a senha tem 8+ caracteres |
| Não vê produtos | Rode o seed (já vem no migration) |
| Cliente não cadastra produto | Comportamento correto — RLS bloqueia |
| Perfil NULL após signup | O trigger pode não ter rodado; crie manualmente |

---

## 12. Resetar dados de teste

```sql
-- limpar pedidos (cascata leva os itens)
DELETE FROM orders;

-- limpar produtos customizados (mantém os 6 do seed se nao deletar)
-- DELETE FROM products;  -- cuidado: apaga tudo

-- resetar senha da TasianeM via painel do Supabase
-- Auth > Users > tasianem@isababy.app > Reset password
```
