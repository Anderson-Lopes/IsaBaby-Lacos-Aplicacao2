import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_INITIAL_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'Administradora';

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  throw new Error('Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL e ADMIN_INITIAL_PASSWORD no ambiente.');
}
if (password.length < 16) {
  throw new Error('ADMIN_INITIAL_PASSWORD deve ter pelo menos 16 caracteres.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let existingUser;
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  existingUser = data.users.find((user) => user.email?.toLowerCase() === email);
  if (existingUser || data.users.length < 1000) break;
}

if (existingUser) {
  const { data: existingProfile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', existingUser.id)
    .maybeSingle();
  if (error) throw error;
  if (existingProfile?.role !== 'admin') {
    throw new Error('Esse e-mail já pertence a uma conta não administradora. Use um endereço dedicado e seguro.');
  }
  console.log('A conta administradora já está provisionada; nenhuma senha foi alterada.');
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: email, full_name: fullName },
  });
  if (error) throw error;
  if (!data.user) throw new Error('O provedor não retornou o usuário criado.');

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    email,
    username: email,
    full_name: fullName,
    role: 'admin',
    account_status: 'active',
    must_change_password: true,
  }, { onConflict: 'id' });
  if (profileError) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(data.user.id);
    if (cleanupError) console.error('Could not remove the incomplete admin account', cleanupError);
    throw profileError;
  }
  console.log('Conta administradora criada. No primeiro acesso, será exigida a troca da senha inicial.');
}
