import { beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => {
  let session: any = null;
  const makeSession = (email: string) => ({
    access_token: email, refresh_token: `refresh-${email}`,
    expires_at: Date.now() / 1000 + 3600, user: { email },
  });
  return {
    reset: () => { session = null; },
    client: {
      auth: {
        getSession: vi.fn(async () => ({ data: { session } })),
        signInWithPassword: vi.fn(async ({ email }: { email: string }) => {
          session = makeSession(email);
          return { data: { session }, error: null };
        }),
        setSession: vi.fn(async ({ access_token }: { access_token: string }) => {
          session = makeSession(access_token);
          return { data: { session }, error: null };
        }),
      },
      realtime: { setAuth: vi.fn() },
    },
  };
});
vi.mock('@supabase/supabase-js', () => ({ createClient: () => mock.client }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mock.reset();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-test-key');
});

it('restores the real cached identity on A → B → A, including reload bootstrap', async () => {
  const { activateDemoSession, bootstrapDemoSession } = await import('./supabase');
  expect(await bootstrapDemoSession()).toBe('amma');
  await activateDemoSession('maya');
  await activateDemoSession('amma');
  expect(mock.client.auth.signInWithPassword).toHaveBeenCalledTimes(2);
  expect(mock.client.auth.setSession).toHaveBeenCalledWith({
    access_token: 'amma@demo.careloop', refresh_token: 'refresh-amma@demo.careloop',
  });
  expect(await bootstrapDemoSession()).toBe('amma');
});

it('an old viewer API token request cannot change the active Realtime identity', async () => {
  const { activateDemoSession, ensureDemoSession } = await import('./supabase');
  await activateDemoSession('amma');
  await activateDemoSession('anu');
  mock.client.realtime.setAuth.mockClear();
  expect(await ensureDemoSession('amma')).toBe('amma@demo.careloop');
  expect(mock.client.realtime.setAuth).not.toHaveBeenCalled();
  expect((await mock.client.auth.getSession()).data.session.user.email).toBe('anu@demo.careloop');
});
