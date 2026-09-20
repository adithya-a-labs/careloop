import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PROFILES } from './mock-data';

const ensureDemoSession = vi.fn();

vi.mock('./supabase', () => ({
  ensureDemoSession,
  isRealMode: true,
  supabase: null,
}));

describe('authenticated CareLoop API client', () => {
  beforeEach(() => {
    ensureDemoSession.mockReset();
    vi.restoreAllMocks();
  });

  it('attaches the selected Amma session to voice extraction', async () => {
    ensureDemoSession.mockResolvedValue('amma-access-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ events: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const { extractVoiceEvents } = await import('./api');

    await extractVoiceEvents("I didn't sleep well.", PROFILES.amma);

    expect(ensureDemoSession).toHaveBeenCalledWith('amma');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/voice/extract'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer amma-access-token' }),
      }),
    );
  });

  it('sends only the strict voice-turn context with the selected JWT', async () => {
    ensureDemoSession.mockResolvedValue('amma-access-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          tool: 'no_action',
          status: 'no_action',
          preview: {},
          requires_confirmation: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { routeVoiceTurn } = await import('./api');

    await routeVoiceTurn('Hello.', PROFILES.amma);

    expect(ensureDemoSession).toHaveBeenCalledWith('amma');
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer amma-access-token' }),
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      transcript: 'Hello.',
      user_id: '10000000-0000-0000-0000-000000000001',
      circle_id: '20000000-0000-0000-0000-000000000001',
      speaker_id: '10000000-0000-0000-0000-000000000001',
      speaker_name: 'Amma',
      patient_id: '10000000-0000-0000-0000-000000000001',
      role: 'patient',
      relationship: 'self',
      patient_name: 'Amma',
      preferred_language: 'Malayalam',
      referenced_task_id: null,
    });
  });

  it('uses Maya authentication for Maya-reported event writes', async () => {
    ensureDemoSession.mockResolvedValue('maya-access-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'event-id',
          circle_id: 'circle-id',
          subject_id: 'subject-id',
          reported_by: 'reporter-id',
          event_type: 'meal',
          event_data: {},
          source: 'voice',
          raw_transcript: 'Amma ate little.',
          confidence: 0.9,
          occurred_at: '2026-09-20T00:00:00Z',
          created_at: '2026-09-20T00:00:00Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { createCareEvent } = await import('./api');

    await createCareEvent(
      {
        type: 'meal',
        data: { meal: 'lunch', intake: 'low' },
        subject_id: 'subject-id',
        reported_by: 'reporter-id',
        source: 'voice',
        raw_transcript: 'Amma ate little.',
        confidence: 0.9,
      },
      'maya',
    );

    expect(ensureDemoSession).toHaveBeenCalledWith('maya');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/events'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer maya-access-token' }),
      }),
    );
  });

  it('never sends a protected real-mode request without a session', async () => {
    ensureDemoSession.mockResolvedValue(null);
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const { listCareEvents } = await import('./api');

    await expect(listCareEvents('amma')).rejects.toThrow('authentication is not ready');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent reads and reuses fresh circle data', async () => {
    ensureDemoSession.mockResolvedValue('maya-access-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const { listCircleMembers } = await import('./api');

    await Promise.all([listCircleMembers('maya'), listCircleMembers('maya')]);
    await listCircleMembers('maya');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(ensureDemoSession).toHaveBeenCalledTimes(1);
  });
});
