# Manual de execução — IsaBaby Laços

## Pré-requisitos

- Node.js 20.19+ ou 22.12+ e npm.
- Um projeto Supabase configurado (hospedado ou local).
- Supabase CLI e Docker Desktop apenas para aplicar migrations/testes localmente ou publicar funções.

## 1. Configurar o frontend

Na raiz do projeto, copie o exemplo e preencha as credenciais públicas do seu projeto Supabase:

```powershell
Copy-Item .env.example .env.local
```

Edite `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

Essas variáveis são usadas no navegador. **Nunca** coloque `service_role`, token do Mercado Pago ou segredo de webhook em variáveis `VITE_*`. O arquivo `.env.local` é ignorado pelo Git.

## 2. Preparar o banco Supabase

Para um projeto hospedado, instale a Supabase CLI conforme a documentação oficial e execute:

```powershell
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

`db push` aplica as migrations em `supabase/migrations/`; elas criam o schema, regras de acesso, bucket de imagens e alguns produtos de exemplo. No painel Supabase, configure a URL do site e as URLs de redirecionamento do Auth, incluindo `http://localhost:5173`. Configure também o provedor de e-mail e o mínimo de senha para pelo menos 10 caracteres. A confirmação de e-mail e o envio de recuperação de senha dependem das configurações de Auth/SMTP do projeto.

### Criar a primeira conta administradora

O cadastro público cria somente clientes. Depois de aplicar as migrations, abra um PowerShell na raiz e informe a URL do projeto, a chave `service_role` apenas para esta operação administrativa, o e-mail da administradora e uma senha inicial forte (16 ou mais caracteres):

```powershell
$keyPointer = [IntPtr]::Zero
$passwordPointer = [IntPtr]::Zero
$secureServiceRoleKey = $null
$secureInitialPassword = $null
try {
  $env:SUPABASE_URL = Read-Host 'URL do projeto Supabase'
  $secureServiceRoleKey = Read-Host 'Chave service_role' -AsSecureString
  $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureServiceRoleKey)
  $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
  $env:ADMIN_EMAIL = Read-Host 'E-mail da administradora'
  $secureInitialPassword = Read-Host 'Senha inicial (mínimo 16 caracteres)' -AsSecureString
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureInitialPassword)
  $env:ADMIN_INITIAL_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  node scripts/provision-admin.mjs
  if ($LASTEXITCODE -ne 0) { throw 'O provisionamento da conta falhou.' }
} finally {
  Remove-Item Env:SUPABASE_URL, Env:SUPABASE_SERVICE_ROLE_KEY, Env:ADMIN_EMAIL, Env:ADMIN_INITIAL_PASSWORD -ErrorAction SilentlyContinue
  if ($keyPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
  if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  if ($secureServiceRoleKey) { $secureServiceRoleKey.Dispose() }
  if ($secureInitialPassword) { $secureInitialPassword.Dispose() }
}
```

O script cria o usuário e o perfil de admin sem salvar a senha no repositório. No primeiro acesso, a aplicação exige a troca da senha. Não reutilize a senha inicial nem compartilhe a chave `service_role`.

## 3. Configurar pagamentos (opcional)

O catálogo, autenticação, perfil, produtos, carrinho, endereços, pedidos e agendamento podem ser exercitados sem configurar o Mercado Pago; o checkout de pagamento precisa das Edge Functions e de credenciais do provedor.

Configure credenciais de teste no Mercado Pago. Copie o exemplo localmente, preencha os valores (sem os incluir no repositório) e envie-os ao projeto:

```powershell
Copy-Item supabase/functions/.env.example supabase/functions/.env
```

Edite `supabase/functions/.env` com `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` e `PUBLIC_APP_URL` (URL pública HTTPS do site) e rode:

```powershell
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy create-payment
supabase functions deploy mercado-pago-webhook
```

O `.env` é ignorado pelo Git; mantenha-o apenas local e não o compartilhe. Use uma URL pública HTTPS acessível pelo Mercado Pago para testar o retorno e as notificações de pagamento; `localhost` não é acessível pelo provedor. O endereço do webhook é informado pela função de checkout ao criar a preferência de pagamento. Os segredos ficam no Supabase, não no frontend.

## 4. Executar a aplicação

Com `.env.local` preenchido e o banco preparado, no PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abra `http://localhost:5173/`. Para encerrar o servidor, pressione `Ctrl+C`. Se `npm` funcionar normalmente no seu terminal, pode usá-lo no lugar de `npm.cmd`.

Crie uma conta de cliente pela tela de cadastro ou entre com a conta administradora provisionada. O app exige sessão para carrinho, pedidos e conta; a administração de produtos e usuários fica restrita ao perfil `admin`.

## 5. Supabase local e testes

Com Supabase CLI e Docker Desktop instalados e iniciados:

```powershell
supabase start
supabase status
```

Copie a URL e a chave `anon` exibidas por `supabase status` para `.env.local` e execute:

```powershell
supabase test db
```

O teste SQL verifica permissões, isolamento de dados, cálculo de total, reserva de estoque e validação de retirada. Ele roda contra o banco local, não contra o projeto de produção. Para encerrar os serviços locais, use `supabase stop`.

## 6. Verificações do frontend

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

`preview` serve a build de produção localmente; abra o endereço que o Vite indicar.

## Problemas comuns

- **A tela pede configuração Supabase:** verifique `.env.local` e reinicie o Vite depois de alterá-lo.
- **Perfil não carrega após cadastro:** confirme que todas as migrations foram aplicadas e que o Auth do projeto permite o cadastro.
- **Checkout indisponível:** confirme que as Edge Functions foram publicadas e que os segredos do Mercado Pago foram configurados.
- **Não consegue agendar retirada:** somente pedidos pagos podem ser agendados; use um pedido elegível.
