/*
# Revoke EXECUTE de funções de trigger

As funções force_customer_role() e handle_new_user() são SECURITY DEFINER usadas apenas por triggers internos.
O linter do Supabase apontou que estavam executáveis via /rest/v1/rpc/ por anon e authenticated.
Funções de trigger não devem ser chamáveis pela API — revogamos EXECUTE de PUBLIC, anon e authenticated.
Elas continuam funcionando quando disparadas pelos triggers (que rodam como dono da função).

is_admin() é intencionalmente chamável por authenticated (RLL policies a usam) — não é alterada aqui.
*/

REVOKE EXECUTE ON FUNCTION public.force_customer_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
