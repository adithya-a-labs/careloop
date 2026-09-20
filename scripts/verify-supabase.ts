import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  DEMO_IDS,
  isMainModule,
  readSupabaseEnvironment,
  redactSecrets,
  requireRemoteCliEnvironment,
  runSupabaseCli,
  type SupabaseEnvironment,
} from './supabase-tools.js';

const REQUIRED_TABLES = [
  'profiles',
  'care_circles',
  'circle_members',
  'care_events',
  'tasks',
  'scheduled_items',
  'handoffs',
  'memories',
  'availability',
] as const;

const DEMO_PASSWORD = 'careloop-demo';

function adminClient(environment: SupabaseEnvironment): SupabaseClient {
  return createClient(environment.url, environment.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function expectNoError(operation: PromiseLike<unknown>, label: string): Promise<any> {
  const { data, error } = (await operation) as {
    data: any;
    error: { message: string } | null;
  };
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

function verifyDatabaseMetadata(environment: SupabaseEnvironment): void {
  requireRemoteCliEnvironment(environment);
  const sql = `
select check_name
from (
  select 'careloop_schema_ok' as check_name, (
    select count(*) from information_schema.tables
    where table_schema = 'public'
      and table_name = any(array[${REQUIRED_TABLES.map((table) => `'${table}'`).join(',')}])
  ) = ${REQUIRED_TABLES.length} as passed
  union all
  select 'careloop_rls_ok', (
    select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any(array[${REQUIRED_TABLES.map((table) => `'${table}'`).join(',')}])
      and c.relrowsecurity
  ) = ${REQUIRED_TABLES.length}
  union all
  select 'careloop_realtime_ok', (
    select count(*) from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = any(array['care_events','tasks','memories'])
  ) = 3
  union all
  select 'careloop_memory_policy_ok', (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'memories'
      and policyname in (
        'family and recipient read memories',
        'family and recipient create memories',
        'family and recipient update memories'
      )
  ) = 3
) checks
where passed;
`;
  let targetArgs: string[];
  if (environment.local) {
    targetArgs = ['--local'];
  } else if (environment.databaseUrl) {
    targetArgs = ['--db-url', environment.databaseUrl];
  } else {
    runSupabaseCli(['link', '--project-ref', environment.projectRef!, '--yes'], environment);
    targetArgs = ['--linked'];
  }
  const output = runSupabaseCli(['db', 'query', ...targetArgs, sql], environment);
  for (const sentinel of [
    'careloop_schema_ok',
    'careloop_rls_ok',
    'careloop_realtime_ok',
    'careloop_memory_policy_ok',
  ]) {
    if (!output.includes(sentinel)) throw new Error(`Database metadata check failed: ${sentinel}`);
  }
}

async function verifyRoleBoundary(environment: SupabaseEnvironment): Promise<void> {
  const anuClient = createClient(environment.url, environment.publicKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  await expectNoError(
    anuClient.auth.signInWithPassword({ email: 'anu@demo.careloop', password: DEMO_PASSWORD }),
    'Anu demo sign-in failed',
  );
  const memories = await expectNoError(
    anuClient.from('memories').select('id').eq('circle_id', DEMO_IDS.circle).limit(1),
    'Anu MemoryBox boundary check failed',
  );
  if ((memories ?? []).length !== 0) throw new Error('Anu can retrieve private MemoryBox records.');

  const tasks = await expectNoError(
    anuClient.from('tasks').select('id,description').eq('id', DEMO_IDS.prescriptionTask).limit(1),
    'Authenticated task read failed',
  );
  if (!tasks?.[0]) throw new Error('Anu cannot read the shared prescription task.');
  const updated = await expectNoError(
    anuClient
      .from('tasks')
      .update({ description: tasks[0].description })
      .eq('id', DEMO_IDS.prescriptionTask)
      .select('id'),
    'Authenticated task write failed',
  );
  if (!updated?.[0]) throw new Error('The shared task write path returned no row.');
  await anuClient.auth.signOut();
}

export async function verifySupabase(environment = readSupabaseEnvironment()): Promise<void> {
  const client = adminClient(environment);
  await expectNoError(client.auth.admin.listUsers({ page: 1, perPage: 1 }), 'Supabase connection');
  console.log('✓ Supabase connected');

  for (const table of REQUIRED_TABLES) {
    await expectNoError(
      client.from(table).select('*', { count: 'exact', head: true }),
      `Required table ${table}`,
    );
  }
  console.log('✓ Schema initialized');

  verifyDatabaseMetadata(environment);
  console.log('✓ RLS configured');
  console.log('✓ Realtime configured');

  const profiles = await expectNoError(
    client
      .from('profiles')
      .select('id,display_name')
      .in('id', [DEMO_IDS.amma, DEMO_IDS.maya, DEMO_IDS.rahul, DEMO_IDS.anu]),
    'Demo profiles',
  );
  const expectedNames = new Set(['Amma', 'Maya', 'Rahul', 'Anu']);
  if (
    profiles.length !== 4 ||
    profiles.some((profile: { display_name: string }) => !expectedNames.has(profile.display_name))
  ) {
    throw new Error('Expected Amma, Maya, Rahul, and Anu demo profiles.');
  }
  console.log('✓ Demo profiles available');

  const events = await expectNoError(
    client.from('care_events').select('id').eq('circle_id', DEMO_IDS.circle).limit(1),
    'Care events',
  );
  const prescription = await expectNoError(
    client
      .from('tasks')
      .select('id,status,assigned_to,due_at')
      .eq('id', DEMO_IDS.prescriptionTask)
      .single(),
    'Hero prescription task',
  );
  const rahulAvailability = await expectNoError(
    client
      .from('availability')
      .select('id,starts_at,ends_at')
      .eq('circle_id', DEMO_IDS.circle)
      .eq('profile_id', DEMO_IDS.rahul)
      .limit(1),
    'Rahul availability',
  );
  const anuVisit = await expectNoError(
    client
      .from('scheduled_items')
      .select('id')
      .eq('circle_id', DEMO_IDS.circle)
      .ilike('title', '%Anu%visit%')
      .limit(1),
    'Anu upcoming visit',
  );
  const memories = await expectNoError(
    client
      .from('memories')
      .select('approximate_year')
      .eq('circle_id', DEMO_IDS.circle)
      .in('approximate_year', [1978, 1985, 1994, 2001, 2008]),
    'MemoryBox demo records',
  );
  if (!events.length || !rahulAvailability.length || !anuVisit.length || memories.length < 5) {
    throw new Error('The required CareLoop demo data is incomplete.');
  }
  if (prescription.status !== 'pending' || prescription.assigned_to !== null) {
    throw new Error('The prescription task must be pending and unassigned.');
  }
  const due = new Date(prescription.due_at).getTime();
  const window = rahulAvailability[0];
  if (due < new Date(window.starts_at).getTime() || due > new Date(window.ends_at).getTime()) {
    throw new Error('Rahul availability must cover the prescription due time.');
  }
  console.log('✓ Demo data seeded');
  console.log('✓ Hero prescription task ready');

  await verifyRoleBoundary(environment);
  console.log('✓ Role-specific data boundaries verified');
  console.log('✓ CareLoop ready');
}

async function main(): Promise<void> {
  const environment = readSupabaseEnvironment();
  try {
    await verifySupabase(environment);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `CareLoop Supabase verification failed: ${redactSecrets(message, [
        environment.publicKey,
        environment.serviceRoleKey,
        process.env.SUPABASE_DB_PASSWORD,
        process.env.SUPABASE_ACCESS_TOKEN,
        environment.databaseUrl,
      ])}`,
    );
    process.exitCode = 1;
  }
}

if (isMainModule(import.meta.url)) void main();
