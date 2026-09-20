import type { DemoProfile, DemoProfileId } from './mock-data';
import { ensureDemoSession, isRealMode } from './supabase';

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
    user_id: PROFILE_UUIDS[profile.id],
    circle_id: DEMO_CIRCLE_ID,
    speaker_id: PROFILE_UUIDS[profile.id],
    patient_id: DEMO_AMMA_ID,
    role: isPatient ? 'patient' : profile.role === 'caregiver' ? 'caregiver' : 'family',
    relationship: isPatient ? 'self' : profile.role,
    patient_name: 'Amma',
    preferred_language: profile.preferredLanguage ?? 'English',
  };
}

export interface HandoffMemberReference {
  profile_id: string;
  display_name: string;
  role: string | null;
  relationship: string | null;
  preferred_language: string | null;
}

export interface HandoffEvent extends CareEvent {
  subject: HandoffMemberReference;
  reporter: HandoffMemberReference;
}

export interface HandoffTask extends ApiTask {
  assignee: HandoffMemberReference | null;
}

export interface HandoffSummary {
  important: HandoffEvent[];
  pending: HandoffTask[];
  completed: HandoffTask[];
  upcoming: ScheduledItem[];
  summary: string;
}

export interface CoordinationSuggestion {
  action: 'suggest_assignee' | 'create_task' | 'assign_task' | 'complete_task' | 'list_availability';
  task_id: string | null;
  assignee_id: string | null;
  message: string;
  requires_confirmation: boolean;
}

export interface VoiceTurnPreview {
  user_id: string;
  circle_id: string;
  speaker_id: string;
  speaker_name: string | null;
  patient_id: string;
  patient_name: string;
  role: string;
  relationship: string;
  preferred_language: string;
  source: 'voice';
  text: string;
  intent: 'care_update' | 'catch_up' | 'coordination' | 'memory' | 'unknown';
  extracted_events?: ExtractedCareEvent[];
  handoff_summary?: HandoffSummary;
  coordination_suggestion?: CoordinationSuggestion;
  memory_extraction?: {
    title: string;
    approximate_year: number | null;
    people: string[];
    places: string[];
    themes: string[];
    body: string;
    confidence: number;
  };
  memory_create?: MemoryCreatePayload;
  message?: string;
}

export interface VoiceTurnResult {
  tool: 'record_care_event' | 'draft_task' | 'draft_handoff' | 'save_memory' | 'no_action';
  status: 'draft' | 'ready' | 'no_action';
  preview: VoiceTurnPreview;
  requires_confirmation: boolean;
}

export function routeVoiceTurn(
  transcript: string,
  profile: DemoProfile,
  referencedTaskId?: string | null,
) {
  return api<VoiceTurnResult>(
    '/api/v1/voice/turn',
    {
      method: 'POST',
      body: JSON.stringify({
        transcript,
        ...voiceContext(profile),
        referenced_task_id: referencedTaskId ?? null,
      }),
    },
    profile.id,
  );
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
  return api<CareEvent[]>(`/api/v1/circles/${circleId}/events?limit=50`, undefined, profileId);
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
  return api<ApiTask[]>(`/api/v1/circles/${circleId}/tasks?limit=50`, undefined, profileId);
}

export async function createTask(payload: TaskCreatePayload, profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<ApiTask> {
  return api<ApiTask>(
    `/api/v1/circles/${circleId}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    profileId,
  );
}

export async function updateTask(taskId: string, payload: TaskUpdatePayload, profileId: DemoProfileId = 'maya'): Promise<ApiTask> {
  return api<ApiTask>(
    `/api/v1/tasks/${taskId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    profileId,
  );
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
  events_since_last_seen: HandoffEvent[];
  pending_tasks: HandoffTask[];
  completed_tasks: HandoffTask[];
  upcoming: ScheduledItem[];
}

export async function getHandoffContext(profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID, since?: string): Promise<HandoffContext> {
  const query = since ? `?since=${encodeURIComponent(since)}` : '';
  return api<HandoffContext>(`/api/v1/circles/${circleId}/handoff-context${query}`, undefined, profileId);
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
  return api<MemberAvailability[]>(`/api/v1/circles/${circleId}/availability`, undefined, profileId);
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
  return api<CircleMember[]>(`/api/v1/circles/${circleId}/members`, undefined, profileId);
}

export async function listScheduledItems(profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<ScheduledItem[]> {
  return api<ScheduledItem[]>(`/api/v1/circles/${circleId}/scheduled-items`, undefined, profileId);
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
  return api<ApiMemory>(
    `/api/v1/circles/${circleId}/memories`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    profileId,
  );
}

export async function listMemories(profileId: DemoProfileId = 'maya', circleId = DEMO_CIRCLE_ID): Promise<ApiMemory[]> {
  return api<ApiMemory[]>(`/api/v1/circles/${circleId}/memories?limit=50`, undefined, profileId);
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
        ...voiceContext(profile),
      }),
    },
    profile.id,
  );
}
