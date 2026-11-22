import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_INITIAL_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD before continuing.');
}

if (password.length < 8) {
  throw new Error('The initial admin password must contain at least 8 characters.');
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: userPage, error: listError } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw new Error(`Could not check existing admin account: ${listError.message}`);

const existing = userPage.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
let userId = existing?.id;
let existingProfile = null;
let isExistingAdmin = false;

if (existing) {
  const { data: profile, error: existingProfileError } = await client
    .from('profiles')
    .select('role, must_change_password')
    .eq('id', existing.id)
    .maybeSingle();
  if (existingProfileError) throw new Error(`Could not check the existing profile: ${existingProfileError.message}`);
  existingProfile = profile;
  isExistingAdmin = profile?.role === 'admin';

  const { error } = await client.auth.admin.updateUserById(existing.id, {
    email_confirm: true,
    user_metadata: { ...existing.user_metadata, username: 'TasianeM' },
    ...(isExistingAdmin ? {} : { password }),
  });
  if (error) throw new Error(`Could not update the admin account: ${error.message}`);
} else {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: 'TasianeM' },
  });
  if (error) throw new Error(`Could not create the admin account: ${error.message}`);
  userId = data.user.id;
}

if (!userId) throw new Error('Supabase did not return an admin user ID.');

if (!existingProfile) {
  const { error: createProfileError } = await client
    .from('profiles')
    .insert({ id: userId, username: 'TasianeM', role: 'customer' });
  if (createProfileError && createProfileError.code !== '23505') {
    throw new Error(`Could not create the admin profile: ${createProfileError.message}`);
  }
}

const { error: profileError } = await client
  .from('profiles')
  .update({
    username: 'TasianeM',
    role: 'admin',
    must_change_password: isExistingAdmin
      ? existingProfile.must_change_password
      : true,
  })
  .eq('id', userId)
  .select('id')
  .single();
if (profileError) throw new Error(`Could not grant admin access: ${profileError.message}`);

console.info('Admin account is ready. Sign in with its email and change the initial password immediately.');
