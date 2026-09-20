import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { DemoProfileId } from './mock-data';
import { reconcileReadCache } from './read-cache';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enable real mode whenever Supabase credentials are provided
export const isRealMode = Boolean(supabaseUrl && publishableKey);
export const supabase =
  supabaseUrl && publishableKey ? createClient(supabaseUrl, publishableKey) : null;

interface CachedDemoSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const sessionCache = new Map<DemoProfileId, CachedDemoSession>();
const sessionRequests = new Map<DemoProfileId, Promise<string | null>>();
let authenticationQueue: Promise<unknown> = Promise.resolve();

export const DEMO_EMAILS: Record<DemoProfileId, string> = {
  amma: 'amma@demo.careloop',
  maya: 'maya@demo.careloop',
  rahul: 'rahul@demo.careloop',
  anu: 'anu@demo.careloop',
};

function demoProfileForEmail(email: string | undefined): DemoProfileId | null {
  if (!email) return null;
  const match = Object.entries(DEMO_EMAILS).find(([, demoEmail]) => demoEmail === email);
  return (match?.[0] as DemoProfileId | undefined) ?? null;
}

async function establishDemoSession(profileId: DemoProfileId): Promise<string | null> {
  if (!isRealMode) return null;
  if (!supabase) throw new Error('Supabase public configuration is missing.');

  const expectedEmail = DEMO_EMAILS[profileId];
  const { data: current } = await supabase.auth.getSession();
  if (
    current.session?.user.email === expectedEmail
    && (current.session.expires_at ?? 0) * 1000 > Date.now() + 30_000
  ) {
    sessionCache.set(profileId, {
      accessToken: current.session.access_token,
      refreshToken: current.session.refresh_token,
      expiresAt: current.session.expires_at ?? 0,
    });
    supabase.realtime.setAuth(current.session.access_token);
    return current.session.access_token;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: expectedEmail,
    password: 'careloop-demo',
  });
  if (error || !data.session) throw new Error(`The demo profile ${profileId} could not sign in: ${error?.message}`);
  sessionCache.set(profileId, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? 0,
  });
  supabase.realtime.setAuth(data.session.access_token);
  return data.session.access_token;
}

export function ensureDemoSession(profileId: DemoProfileId): Promise<string | null> {
  if (!isRealMode) return Promise.resolve(null);
  const cached = sessionCache.get(profileId);
  if (cached && cached.expiresAt * 1000 > Date.now() + 30_000) {
    return Promise.resolve(cached.accessToken);
  }
  const currentRequest = sessionRequests.get(profileId);
  if (currentRequest) return currentRequest;

  const request = authenticationQueue
    .catch(() => null)
    .then(() => establishDemoSession(profileId))
    .finally(() => {
      if (sessionRequests.get(profileId) === request) sessionRequests.delete(profileId);
    });
  authenticationQueue = request;
  sessionRequests.set(profileId, request);
  return request;
}

// Switching the visible identity must also switch the persisted Auth session.
// Reading an API token alone must not switch the global Realtime identity.
export function activateDemoSession(profileId: DemoProfileId): Promise<string | null> {
  const request = authenticationQueue.catch(() => null).then(async () => {
    if (!isRealMode || !supabase) return null;
    const cached = sessionCache.get(profileId);
    if (cached && cached.expiresAt * 1000 > Date.now() + 30_000) {
      const { data, error } = await supabase.auth.setSession({
        access_token: cached.accessToken,
        refresh_token: cached.refreshToken,
      });
      if (error || !data.session) throw new Error('CareLoop could not restore this profile.');
      await supabase.realtime.setAuth(data.session.access_token);
      return data.session.access_token;
    }
    return establishDemoSession(profileId);
  });
  authenticationQueue = request;
  return request;
}

export async function bootstrapDemoSession(
  defaultProfileId: DemoProfileId = 'amma',
): Promise<DemoProfileId> {
  if (!isRealMode || !supabase) return defaultProfileId;

  const { data } = await supabase.auth.getSession();
  const existingProfileId = demoProfileForEmail(data.session?.user.email);
  const hasUsableSession = (data.session?.expires_at ?? 0) * 1000 > Date.now() + 30_000;
  const profileId = existingProfileId && hasUsableSession ? existingProfileId : defaultProfileId;

  const accessToken = await ensureDemoSession(profileId);
  if (!accessToken) throw new Error('The demo session could not be established.');
  return profileId;
}

export function subscribeToCareEvents(
  circleId: string,
  onInsert: (row: Record<string, unknown>, deleted?: boolean) => void,
): RealtimeChannel | null {
  if (!isRealMode || !supabase) return null;
  return supabase
    .channel(`care-events:${circleId}:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'care_events',
        filter: `circle_id=eq.${circleId}`,
      },
      (payload: any) => {
        const deleted = payload.eventType === 'DELETE';
        const row = deleted ? payload.old : payload.new;
        reconcileReadCache(circleId, 'events', row, deleted);
        onInsert(row, deleted);
      },
    )
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'care_events' }, (payload) => {
      reconcileReadCache(circleId, 'events', payload.old, true);
      onInsert(payload.old, true);
    })
    .subscribe();
}

export function subscribeToTasks(
  circleId: string,
  onChange: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void,
): RealtimeChannel | null {
  if (!isRealMode || !supabase) return null;
  return supabase
    .channel(`tasks:${circleId}:${Date.now()}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `circle_id=eq.${circleId}`,
      },
      (payload: any) => {
        reconcileReadCache(circleId, 'tasks', payload.eventType === 'DELETE' ? payload.old : payload.new, payload.eventType === 'DELETE');
        onChange({
        eventType: payload.eventType,
        new: (payload.new || {}) as Record<string, unknown>,
        old: (payload.old || {}) as Record<string, unknown>,
        });
      },
    )
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload) => {
      reconcileReadCache(circleId, 'tasks', payload.old, true);
      onChange({ eventType: 'DELETE', new: {}, old: payload.old });
    })
    .subscribe();
}

export function subscribeToMemories(
  circleId: string,
  onInsert: (row: Record<string, unknown>, deleted?: boolean) => void,
): RealtimeChannel | null {
  if (!isRealMode || !supabase) return null;
  return supabase
    .channel(`memories:${circleId}:${Date.now()}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'memories',
        filter: `circle_id=eq.${circleId}`,
      },
      (payload: any) => {
        const deleted = payload.eventType === 'DELETE';
        const row = deleted ? payload.old : payload.new;
        reconcileReadCache(circleId, 'memories', row, deleted);
        onInsert(row, deleted);
      },
    )
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'memories' }, (payload) => {
      reconcileReadCache(circleId, 'memories', payload.old, true);
      onInsert(payload.old, true);
    })
    .subscribe();
}

export async function removeRealtimeChannel(channel: RealtimeChannel | null) {
  if (channel && supabase) await supabase.removeChannel(channel);
}
