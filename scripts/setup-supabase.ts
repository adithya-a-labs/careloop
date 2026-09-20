import { createClient } from '@supabase/supabase-js';

import {
  DEMO_IDS,
  isMainModule,
  readSupabaseEnvironment,
  redactSecrets,
  requireRemoteCliEnvironment,
  runSupabaseCli,
} from './supabase-tools.js';
import { verifySupabase } from './verify-supabase.js';

const DEMO_EMAILS = [
  ['amma@demo.careloop', DEMO_IDS.amma],
  ['maya@demo.careloop', DEMO_IDS.maya],
  ['rahul@demo.careloop', DEMO_IDS.rahul],
  ['anu@demo.careloop', DEMO_IDS.anu],
] as const;

async function main(): Promise<void> {
  const environment = readSupabaseEnvironment();
  try {
    requireRemoteCliEnvironment(environment);
    const client = createClient(environment.url, environment.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error)
      throw new Error(`Could not connect to the target Supabase project: ${error.message}`);
    const users = data.users as Array<{ id: string; email?: string }>;
    for (const [email, expectedId] of DEMO_EMAILS) {
      const existing = users.find((user) => user.email?.toLowerCase() === email);
      if (existing && existing.id !== expectedId) {
        throw new Error(
          `The target already contains ${email} with a different ID. Use a fresh project or remove that synthetic demo account.`,
        );
      }
    }
    console.log('✓ Target Supabase project connected');

    if (environment.local) {
      runSupabaseCli(['db', 'reset', '--local', '--yes'], environment);
    } else {
      runSupabaseCli(['link', '--project-ref', environment.projectRef!, '--yes'], environment);
      runSupabaseCli(['db', 'push', '--linked', '--include-seed', '--yes'], environment);
    }
    console.log('✓ Migrations applied from supabase/migrations');
    console.log('✓ Synthetic demo users and data seeded from supabase/seed.sql');

    await verifySupabase(environment);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `CareLoop Supabase setup failed: ${redactSecrets(message, [
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
