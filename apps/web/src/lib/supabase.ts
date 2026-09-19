import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { DemoProfileId } from './mock-data';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isRealMode = import.meta.env.VITE_DEMO_MODE === 'false';
export const supabase =
  supabaseUrl && publishableKey ? createClient(supabaseUrl, publishableKey) : null;

let sessionOperation: Promise<string | null> = Promise.resolve(null);

const DEMO_EMAILS: Record<DemoProfileId, string> = {
  amma: 'amma@demo.careloop',
  maya: 'maya@demo.careloop',
  rahul: 'rahul@demo.careloop',
  anu: 'anu@demo.careloop',
};

async function establishDemoSession(profileId: DemoProfileId): Promise<string | null> {
  if (!isRealMode) return null;
  if (!supabase) throw new Error('Supabase public configuration is missing.');

  const expectedEmail = DEMO_EMAILS[profileId];
  const { data: current } = await supabase.auth.getSession();
  if (current.session?.user.email === expectedEmail) {
    supabase.realtime.setAuth(current.session.access_token);
    return current.session.access_token;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: expectedEmail,
    password: 'careloop-demo',
  });
  if (error || !data.session) throw new Error('The demo profile could not sign in.');
  supabase.realtime.setAuth(data.session.access_token);
  return data.session.access_token;
}

export function ensureDemoSession(profileId: DemoProfileId): Promise<string | null> {
  sessionOperation = sessionOperation.catch(() => null).then(() => establishDemoSession(profileId));
  return sessionOperation;
}

export function subscribeToCareEvents(
  circleId: string,
  onInsert: (row: Record<string, unknown>) => void,
): RealtimeChannel | null {
  if (!isRealMode || !supabase) return null;
  return supabase
    .channel(`care-events:${circleId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'care_events',
        filter: `circle_id=eq.${circleId}`,
      },
      (payload) => onInsert(payload.new),
    )
    .subscribe();
}

export async function removeRealtimeChannel(channel: RealtimeChannel | null) {
  if (channel && supabase) await supabase.removeChannel(channel);
}
