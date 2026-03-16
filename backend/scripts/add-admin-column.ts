import { supabaseAdmin } from '../src/config/supabase';

async function migrate() {
  // List current users so we know which one to flag as admin
  const { data: allUsers, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('id, email, display_name')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Error fetching users:', fetchError);
    process.exit(1);
  }

  console.log('Current users:');
  allUsers?.forEach((u) => {
    console.log(`  ID: ${u.id}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Name: ${u.display_name || '(none)'}`);
    console.log('');
  });

  console.log('Run this SQL in your Supabase Dashboard (SQL Editor):');
  console.log('');
  console.log('  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;');
  
  if (allUsers && allUsers.length > 0) {
    const firstUser = allUsers[0];
    console.log('');
    console.log(`To set ${firstUser.email} as admin:`);
    console.log(`  UPDATE public.users SET is_admin = true WHERE id = '${firstUser.id}';`);
  }

  process.exit(0);
}

migrate().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
