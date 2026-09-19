import type { DemoProfile, DemoProfileId } from './mock-data';
import { ensureDemoSession } from './supabase';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const DEMO_CIRCLE_ID = '20000000-0000-0000-0000-000000000001';
export const DEMO_AMMA_ID = '10000000-0000-0000-0000-000000000001';

const PROFILE_UUIDS: Record<DemoProfileId, string> = {
  amma: DEMO_AMMA_ID,
  maya: '10000000-0000-0000-0000-000000000002',
  rahul: '10000000-0000-0000-0000-000000000003',
  anu: '10000000-0000-0000-0000-000000000004',
};

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

export async function api<T>(path: string, init?: RequestInit, profileId: DemoProfileId = 'maya'): Promise<T> {
  const accessToken = await ensureDemoSession(profileId);
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`CareLoop API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

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

export function extractVoiceEvents(transcript: string, profile: DemoProfile) {
  const context = voiceContext(profile);
  return api<{ events: ExtractedCareEvent[] }>('/api/v1/voice/extract', {
    method: 'POST',
    body: JSON.stringify({
      transcript,
      ...context,
    }),
  }, profile.id);
}

export function createCareEvent(event: ExtractedCareEvent, profileId: DemoProfileId) {
  return api<CareEvent>(`/api/v1/circles/${DEMO_CIRCLE_ID}/events`, {
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
  }, profileId);
}

export function listCareEvents(profileId: DemoProfileId) {
  return api<CareEvent[]>(`/api/v1/circles/${DEMO_CIRCLE_ID}/events`, undefined, profileId);
}

export interface LiveSessionResponse {
  session: { id: string };
  transport: { type: 'webrtc'; sdp: string };
}

export function createLiveSession(sdp: string, profile: DemoProfile) {
  return api<LiveSessionResponse>('/api/v1/voice/session', {
    method: 'POST',
    body: JSON.stringify({
      sdp,
      user_id: PROFILE_UUIDS[profile.id],
      ...voiceContext(profile),
    }),
  }, profile.id);
}
