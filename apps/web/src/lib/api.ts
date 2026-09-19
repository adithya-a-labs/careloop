const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const DEMO_CIRCLE_ID = '20000000-0000-0000-0000-000000000001';
export const DEMO_AMMA_ID = '10000000-0000-0000-0000-000000000001';

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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) throw new Error(`CareLoop API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function extractVoiceEvents(transcript: string) {
  return api<{ events: ExtractedCareEvent[] }>('/api/v1/voice/extract', {
    method: 'POST',
    body: JSON.stringify({
      circle_id: DEMO_CIRCLE_ID,
      transcript,
      speaker_id: DEMO_AMMA_ID,
      patient_id: DEMO_AMMA_ID,
      role: 'patient',
      relationship: 'self',
      patient_name: 'Amma',
      preferred_language: 'English',
    }),
  });
}

export function createCareEvent(event: ExtractedCareEvent) {
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
  });
}

export function listCareEvents() {
  return api<CareEvent[]>(`/api/v1/circles/${DEMO_CIRCLE_ID}/events`);
}
