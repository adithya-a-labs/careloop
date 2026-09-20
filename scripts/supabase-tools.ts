import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const DEMO_IDS = {
  amma: '10000000-0000-0000-0000-000000000001',
  maya: '10000000-0000-0000-0000-000000000002',
  rahul: '10000000-0000-0000-0000-000000000003',
  anu: '10000000-0000-0000-0000-000000000004',
  circle: '20000000-0000-0000-0000-000000000001',
  prescriptionTask: '40000000-0000-0000-0000-000000000001',
} as const;

export interface SupabaseEnvironment {
  url: string;
  publicKey: string;
  serviceRoleKey: string;
  projectRef?: string;
  databaseUrl?: string;
  local: boolean;
}

export function parseEnvText(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values[name] = value;
  }
  return values;
}

export function loadRootEnv(): void {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const values = parseEnvText(readFileSync(envPath, 'utf8'));
  for (const [name, value] of Object.entries(values)) {
    if (process.env[name] === undefined) process.env[name] = value;
  }
}

function firstEnvironmentValue(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

export function projectRefFromUrl(url: string): string | undefined {
  const parsed = new URL(url);
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return undefined;
  const match = parsed.hostname.match(/^([a-z0-9-]+)\.supabase\.(?:co|net)$/i);
  return match?.[1];
}

export function readSupabaseEnvironment(): SupabaseEnvironment {
  loadRootEnv();
  const url = firstEnvironmentValue('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const publicKey = firstEnvironmentValue(
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_ANON_KEY',
  );
  const serviceRoleKey = firstEnvironmentValue('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
  const projectRef = firstEnvironmentValue('SUPABASE_PROJECT_REF') || projectRefFromUrl(url);
  const databaseUrl = firstEnvironmentValue('DATABASE_URL') || undefined;
  const missing = [
    !url && 'SUPABASE_URL',
    !publicKey && 'SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY',
    !serviceRoleKey && 'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing required environment values: ${missing.join(', ')}`);

  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('SUPABASE_URL must use http or https.');
  }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (!local && !projectRef) {
    throw new Error('SUPABASE_PROJECT_REF is required for a hosted Supabase project.');
  }
  const urlRef = projectRefFromUrl(url);
  if (urlRef && projectRef && urlRef !== projectRef) {
    throw new Error('SUPABASE_PROJECT_REF does not match SUPABASE_URL.');
  }
  return { url, publicKey, serviceRoleKey, projectRef, databaseUrl, local };
}

export function requireRemoteCliEnvironment(environment: SupabaseEnvironment): void {
  if (environment.local) return;
  const missing = [
    !process.env.SUPABASE_DB_PASSWORD?.trim() && 'SUPABASE_DB_PASSWORD',
    !process.env.SUPABASE_ACCESS_TOKEN?.trim() && 'SUPABASE_ACCESS_TOKEN',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing required remote CLI values: ${missing.join(', ')}`);
}

export function redactSecrets(message: string, secrets: Array<string | undefined>): string {
  return secrets.reduce<string>(
    (safe, secret) => (secret ? safe.split(secret).join('[redacted]') : safe),
    message,
  );
}

export function runSupabaseCli(args: string[], environment: SupabaseEnvironment): string {
  const cliScript = resolve(ROOT, 'node_modules', 'supabase', 'dist', 'supabase.js');
  if (!existsSync(cliScript)) {
    throw new Error('Supabase CLI is not installed. Run pnpm install first.');
  }
  const result = spawnSync(process.execPath, [cliScript, ...args], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (result.error || result.status !== 0) {
    const safeOutput = redactSecrets(output || result.error?.message || 'Unknown CLI error', [
      environment.publicKey,
      environment.serviceRoleKey,
      process.env.SUPABASE_DB_PASSWORD,
      process.env.SUPABASE_ACCESS_TOKEN,
      environment.databaseUrl,
    ]);
    throw new Error(`Supabase CLI failed: ${safeOutput}`);
  }
  return output;
}

export function isMainModule(metaUrl: string): boolean {
  return process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(metaUrl) : false;
}
