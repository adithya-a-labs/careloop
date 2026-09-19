import type { DemoProfile, DemoProfileId } from './mock-data';
import { ensureDemoSession, isRealMode, supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const DEMO_CIRCLE_ID = '20000000-0000-0000-0000-000000000001';
export const DEMO_AMMA_ID = '10000000-0000-0000-0000-000000000001';
export const DEMO_MAYA_ID = '10000000-0000-0000-0000-000000000002';
export const DEMO_RAHUL_ID = '10000000-0000-0000-0000-000000000003';
export const DEMO_ANU_ID = '10000000-0000-0000-0000-000000000004';

export const PROFILE_UUIDS: Record<DemoProfileId, string> = {
  amma: DEMO_AMMA_ID,
  maya: DEMO_MAYA_ID,
  rahul: DEMO_RAHUL_ID,
  anu: DEMO_ANU_ID,
};

export const UUID_TO_PROFILE_ID: Record<string, DemoProfileId> = {
  [DEMO_AMMA_ID]: 'amma',
  [DEMO_MAYA_ID]: 'maya',
  [DEMO_RAHUL_ID]: 'rahul',
  [DEMO_ANU_ID]: 'anu',
};

export const UUID_TO_NAME: Record<string, string> = {
  [DEMO_AMMA_ID]: 'Amma',
  [DEMO_MAYA_ID]: 'Maya',
  [DEMO_RAHUL_ID]: 'Rahul',
  [DEMO_ANU_ID]: 'Nurse Anu',
};

// ─── API Core ────────────────────────────────────────────────

export async function api<T>(
  path: string,
  init?: RequestInit,
  profileId: DemoProfileId = 'maya',
): Promise<T> {
  const accessToken = await ensureDemoSession(profileId);
  if (isRealMode && !accessToken) {
    throw new Error('CareLoop authentication is not ready. Please try again.');
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let errorDetail = '';
    try {
      const err = await response.json();
      errorDetail = err?.detail?.message || JSON.stringify(err);
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(`CareLoop API request failed (${response.status}): ${errorDetail}`);
  }
  return response.json() as Promise<T>;
}

// ─── Voice Context ───────────────────────────────────────────

export function voiceContext(profile: DemoProfile) {
  const isPatient = profile.id === 'amma';
  return {
    circle_id: DEMO_CIRCLE_ID,
    speaker_id: PROFILE_UUIDS[profile.id],
    patient_id: DEMO_AMMA_ID,
    role: isPatient ? 'patient' : profile.role === 'caregiver' ? 'caregiver' : 'family',
    relationship: isPatient ? 'self' : profile.role,
    patient_name: 'Amma',
    preferred_language: profile.preferredLanguage ?? 'English',
  };
}

// ─── Care Events ─────────────────────────────────────────────

export interface ExtractedCareEvent {
  type: string;
  data: Record<string, unknown>;
  subject_id: string;
  reported_by: string;
  source: 'voice';
  raw_transcript: string;
  confidence: number;
}

export interface CareEvent {
  id: string;
  circle_id: string;
  subject_id: string;
  reported_by: string;
  event_type: string;
  event_data: Record<string, unknown>;
  source: 'manual' | 'voice' | 'import' | 'system';
  raw_transcript: string | null;
  confidence: number | null;
  occurred_at: string;
  created_at: string;
}

export function extractVoiceEvents(transcript: string, profile: DemoProfile) {
  const context = voiceContext(profile);
  return api<{ events: ExtractedCareEvent[] }>(
    '/api/v1/voice/extract',
    {
      method: 'POST',
      body: JSON.stringify({
        transcript,
        ...context,
      }),
    },
    profile.id,
  );
}

export function createCareEvent(event: ExtractedCareEvent, profileId: DemoProfileId) {
  return api<CareEvent>(
    `/api/v1/circles/${DEMO_CIRCLE_ID}/events`,
    {
      method: 'POST',
      body: JSON.stringify({
        event_type: event.type,
        event_data: event.data,
        subject_id: event.subject_id,
        reported_by: event.reported_by,
        source: event.source,
        raw_transcript: event.raw_transcript,
        confidence: event.confidence,
      }),
    },
    profileId,
  );
}

export async function listCareEvents(profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<CareEvent[]> {
  try {
    return await api<CareEvent[]>(`/api/v1/circles/${circleId}/events?limit=50`, undefined, profileId);
  } catch (err) {
    if (isRealMode && supabase) {
      await ensureDemoSession(profileId);
      const { data, error } = await supabase
        .from('care_events')
        .select('*')
        .eq('circle_id', circleId)
        .order('occurred_at', { ascending: false });
      if (!error && data) return data as CareEvent[];
    }
    throw err;
  }
}

// ─── Tasks ───────────────────────────────────────────────────

export interface ApiTask {
  id: string;
  circle_id: string;
  title: string;
  description: string | null;
  created_by: string;
  assigned_to: string | null;
  status: 'pending' | 'open' | 'in_progress' | 'completed' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_at: string | null;
  completed_at: string | null;
  source_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCreatePayload {
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  status?: 'pending' | 'open' | 'in_progress';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_at?: string | null;
  source_event_id?: string | null;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string | null;
  assigned_to?: string | null;
  status?: 'pending' | 'open' | 'in_progress' | 'completed' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_at?: string | null;
}

export async function listTasks(profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<ApiTask[]> {
  try {
    return await api<ApiTask[]>(`/api/v1/circles/${circleId}/tasks?limit=50`, undefined, profileId);
  } catch (err) {
    if (isRealMode && supabase) {
      await ensureDemoSession(profileId);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as ApiTask[];
    }
    throw err;
  }
}

export async function createTask(payload: TaskCreatePayload, profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<ApiTask> {
  try {
    return await api<ApiTask>(
      `/api/v1/circles/${circleId}/tasks`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      profileId,
    );
  } catch (err) {
    if (isRealMode && supabase) {
      await ensureDemoSession(profileId);
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          circle_id: circleId,
          title: payload.title,
          description: payload.description ?? null,
          created_by: PROFILE_UUIDS[profileId],
          assigned_to: payload.assigned_to ?? null,
          status: payload.status ?? 'pending',
          priority: payload.priority ?? 'medium',
          due_at: payload.due_at ?? null,
          source_event_id: payload.source_event_id ?? null,
        })
        .select()
        .single();
      if (!error && data) return data as ApiTask;
    }
    throw err;
  }
}

export async function updateTask(taskId: string, payload: TaskUpdatePayload, profileId: DemoProfileId = 'maya'): Promise<ApiTask> {
  try {
    return await api<ApiTask>(
      `/api/v1/tasks/${taskId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      profileId,
    );
  } catch (err) {
    if (isRealMode && supabase) {
      await ensureDemoSession(profileId);
      const updateData: Record<string, unknown> = { ...payload, updated_at: new Date().toISOString() };
      if (payload.status === 'completed' || payload.status === 'done') {
        updateData.completed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();
      if (!error && data) return data as ApiTask;
    }
    throw err;
  }
}

// ─── Handoff Context ─────────────────────────────────────────

export interface ScheduledItem {
  id: string;
  circle_id: string;
  created_by: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  recurrence_rule: string | null;
  created_at: string;
}

export interface HandoffContext {
  events_since_last_seen: CareEvent[];
  pending_tasks: ApiTask[];
  completed_tasks: ApiTask[];
  upcoming: ScheduledItem[];
}

export async function getHandoffContext(profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID, since?: string): Promise<HandoffContext> {
  try {
    const query = since ? `?since=${encodeURIComponent(since)}` : '';
    return await api<HandoffContext>(`/api/v1/circles/${circleId}/handoff-context${query}`, undefined, profileId);
  } catch (err) {
    if (isRealMode && supabase) {
      await ensureDemoSession(profileId);
      const [eventsRes, pendingRes, completedRes, upcomingRes] = await Promise.all([
        supabase.from('care_events').select('*').eq('circle_id', circleId).order('occurred_at', { ascending: false }).limit(20),
        supabase.from('tasks').select('*').eq('circle_id', circleId).in('status', ['pending', 'open', 'in_progress']).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('circle_id', circleId).in('status', ['completed', 'done']).order('completed_at', { ascending: false }).limit(10),
        supabase.from('scheduled_items').select('*').eq('circle_id', circleId).order('starts_at', { ascending: true }),
      ]);
      return {
        events_since_last_seen: (eventsRes.data as CareEvent[]) ?? [],
        pending_tasks: (pendingRes.data as ApiTask[]) ?? [],
        completed_tasks: (completedRes.data as ApiTask[]) ?? [],
        upcoming: (upcomingRes.data as ScheduledItem[]) ?? [],
      };
    }
    throw err;
  }
}

// ─── Availability & Members ──────────────────────────────────

export interface MemberAvailability {
  id: string;
  circle_id: string;
  profile_id: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
}

export async function listAvailability(profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<MemberAvailability[]> {
  try {
    return await api<MemberAvailability[]>(`/api/v1/circles/${circleId}/availability`, undefined, profileId);
  } catch (err) {
    if (isRealMode && supabase) {
      await ensureDemoSession(profileId);
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('circle_id', circleId);
      if (!error && data) return data as MemberAvailability[];
    }
    throw err;
  }
}

export interface CircleMember {
  circle_id: string;
  profile_id: string;
  display_name: string;
  role: 'patient' | 'care_recipient' | 'family' | 'caregiver' | 'coordinator';
  relationship: string | null;
  preferred_language: string;
  avatar_url: string | null;
  joined_at: string;
}

export async function listCircleMembers(profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<CircleMember[]> {
  try {
    return await api<CircleMember[]>(`/api/v1/circles/${circleId}/members`, undefined, profileId);
  } catch (err) {
    if (isRealMode && supabase) {
      await ensureDemoSession(profileId);
      const { data, error } = await supabase
        .from('circle_members')
        .select('circle_id, profile_id, role, relationship, is_active, profiles(display_name, preferred_language)')
        .eq('circle_id', circleId)
        .eq('is_active', true);
      if (!error && data) {
        return (data as unknown as any[]).map((row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          return {
            circle_id: row.circle_id,
            profile_id: row.profile_id,
            display_name: profile?.display_name ?? UUID_TO_NAME[row.profile_id] ?? 'Member',
            role: row.role,
            relationship: row.relationship,
            preferred_language: profile?.preferred_language ?? 'en',
            avatar_url: null,
            joined_at: new Date().toISOString(),
          };
        });
      }
    }
    throw err;
  }
}

export async function listScheduledItems(profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<ScheduledItem[]> {
  try {
    return await api<ScheduledItem[]>(`/api/v1/circles/${circleId}/scheduled-items`, undefined, profileId);
  } catch (err) {
    if (isRealMode && supabase) {
      await ensureDemoSession(profileId);
      const { data, error } = await supabase
        .from('scheduled_items')
        .select('*')
        .eq('circle_id', circleId)
        .order('starts_at', { ascending: true });
      if (!error && data) return data as ScheduledItem[];
    }
    throw err;
  }
}

// ─── Memories ────────────────────────────────────────────────

export interface ApiMemory {
  id: string;
  circle_id: string;
  author_id: string;
  subject_id: string;
  kind: 'story' | 'photo' | 'voice';
  title: string;
  body: string | null;
  media_path: string | null;
  approximate_year: number | null;
  created_at: string;
}

export interface MemoryCreatePayload {
  subject_id: string;
  kind?: 'story' | 'photo' | 'voice';
  title: string;
  body?: string | null;
  media_path?: string | null;
  approximate_year?: number | null;
}

export async function createMemory(payload: MemoryCreatePayload, profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<ApiMemory> {
  try {
    return await api<ApiMemory>(
      `/api/v1/circles/${circleId}/memories`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      profileId,
    );
  } catch (err) {
    if (isRealMode && supabase) {
      await ensureDemoSession(profileId);
      const { data, error } = await supabase
        .from('memories')
        .insert({
          circle_id: circleId,
          author_id: PROFILE_UUIDS[profileId],
          subject_id: payload.subject_id,
          kind: payload.kind ?? 'story',
          title: payload.title,
          body: payload.body ?? null,
          media_path: payload.media_path ?? null,
          approximate_year: payload.approximate_year ?? null,
        })
        .select()
        .single();
      if (!error && data) return data as ApiMemory;
    }
    throw err;
  }
}

export async function listMemories(profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<ApiMemory[]> {
  if (isRealMode && supabase) {
    const accessToken = await ensureDemoSession(profileId);
    if (accessToken) {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as ApiMemory[];
    }
  }
  return [];
}

// ─── WebRTC Live Voice ───────────────────────────────────────

export interface LiveSessionResponse {
  session: { id: string };
  transport: { type: 'webrtc'; sdp: string };
}

export function createLiveSession(sdp: string, profile: DemoProfile) {
  return api<LiveSessionResponse>(
    '/api/v1/voice/session',
    {
      method: 'POST',
      body: JSON.stringify({
        sdp,
        user_id: PROFILE_UUIDS[profile.id],
        ...voiceContext(profile),
      }),
    },
    profile.id,
  );
}
