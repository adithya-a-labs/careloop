import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Mic, NotebookPen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemoProfile } from '../features/demo/DemoContext';
import {
  DEMO_ANU_ID,
  DEMO_CIRCLE_ID,
  cachedHandoffContext,
  cachedTasks,
  getHandoffContext,
  listTasks,
  updateTask,
  type ApiTask,
  type HandoffContext,
} from '../lib/api';
import { subscribeToCareEvents, subscribeToTasks, removeRealtimeChannel } from '../lib/supabase';

function isOpen(task: ApiTask) {
  return !['completed', 'done', 'cancelled'].includes(task.status);
}

export function CaregiverHomePage() {
  const navigate = useNavigate();
  const { activeProfile, authStatus } = useDemoProfile();
  const [handoff, setHandoff] = useState<HandoffContext | null>(() => cachedHandoffContext(activeProfile.id) ?? null);
  const [tasks, setTasks] = useState<ApiTask[]>(() => cachedTasks(activeProfile.id) ?? []);
  const [loading, setLoading] = useState(() => !(cachedHandoffContext(activeProfile.id) && cachedTasks(activeProfile.id)));
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const currentHandoff = cachedHandoffContext(activeProfile.id);
    const currentTasks = cachedTasks(activeProfile.id);
    const hasCurrentData = Boolean(currentHandoff && currentTasks);
    setHandoff(currentHandoff ?? null);
    setTasks(currentTasks ?? []);
    setError(null);
    setLoading(!hasCurrentData);
    if (authStatus !== 'authenticated') {
      setLoading(authStatus === 'loading' && !hasCurrentData);
      return;
    }
    const refresh = () => Promise.all([getHandoffContext(activeProfile.id), listTasks(activeProfile.id)])
      .then(([nextHandoff, nextTasks]) => {
        if (cancelled) return;
        setHandoff(nextHandoff);
        setTasks(nextTasks);
      })
      .catch(() => {
        if (!cancelled) setError('CareLoop could not load today’s visit. Check your connection and refresh the page to try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    void refresh();
    const eventChannel = subscribeToCareEvents(DEMO_CIRCLE_ID, () => { void refresh(); });
    const taskChannel = subscribeToTasks(DEMO_CIRCLE_ID, () => { void refresh(); });
    return () => {
      cancelled = true;
      void removeRealtimeChannel(eventChannel);
      void removeRealtimeChannel(taskChannel);
    };
  }, [activeProfile.id, authStatus]);

  const myTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to === DEMO_ANU_ID && isOpen(task)),
    [tasks],
  );

  const completeTask = async (task: ApiTask) => {
    setCompletingId(task.id);
    setError(null);
    try {
      const completed = await updateTask(task.id, { status: 'completed' }, activeProfile.id);
      setTasks((current) => [completed, ...current.filter((item) => item.id !== completed.id)]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'CareLoop could not complete this task.');
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="caregiver-home">
      <header className="role-home-header">
        <p className="eyebrow">Professional caregiver</p>
        <h1>Good morning, {activeProfile.displayName}</h1>
        <p>Everything relevant to today’s visit, in one calm view.</p>
      </header>

      <section className="role-voice-hero caregiver-voice-hero">
        <div>
          <p className="eyebrow">Voice-first care work</p>
          <h2>Ready for today’s visit?</h2>
          <p>Ask what changed, log the visit, or report an update.</p>
        </div>
        <button type="button" className="voice-orb-button voice-orb-button--compact" onClick={() => navigate('/voice')} aria-label="Talk to CareLoop">
          <Mic size={34} aria-hidden="true" />
        </button>
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="role-home-grid">
        <section className="role-panel">
          <div className="section-header"><h2>Today’s visit</h2><Clock size={20} aria-hidden="true" /></div>
          {loading && <p className="timeline-ghost-hint" role="status">Loading today’s visit…</p>}
          {!loading && handoff?.upcoming.slice(0, 2).map((item) => (
            <article className="work-row" key={item.id}>
              <div><strong>{item.title}</strong><p>{new Date(item.starts_at).toLocaleString()}</p></div>
            </article>
          ))}
          {!loading && handoff?.upcoming.length === 0 && <p className="timeline-ghost-hint">No scheduled visit items today.</p>}
        </section>

        <section className="role-panel">
          <div className="section-header"><h2>What changed since last visit</h2><NotebookPen size={20} aria-hidden="true" /></div>
          {handoff?.events_since_last_seen.slice(0, 3).map((event) => (
            <article className="work-row" key={event.id}>
              <div>
                <strong>{event.raw_transcript ?? event.event_type.replaceAll('_', ' ')}</strong>
                <p>{event.reporter.display_name} · {new Date(event.occurred_at).toLocaleString()}</p>
              </div>
            </article>
          ))}
          {!loading && handoff?.events_since_last_seen.length === 0 && <p className="timeline-ghost-hint">No new care notes since the last visit.</p>}
        </section>
      </div>

      <section className="role-panel caregiver-tasks">
        <div className="section-header"><h2>My assigned tasks</h2><span className="coral-count-badge">{myTasks.length} open</span></div>
        {myTasks.map((task) => (
          <article className="work-row" key={task.id}>
            <div><strong>{task.title}</strong><p>{task.due_at ? new Date(task.due_at).toLocaleString() : 'No due time set'}</p></div>
            <button type="button" className="secondary-button compact touch-target" onClick={() => void completeTask(task)} disabled={completingId === task.id}>
              <CheckCircle2 size={17} aria-hidden="true" />
              {completingId === task.id ? 'Saving…' : 'Mark complete'}
            </button>
          </article>
        ))}
        {!loading && myTasks.length === 0 && <p className="timeline-ghost-hint">No open tasks are assigned to you.</p>}
      </section>

      <button type="button" className="primary-button caregiver-report-button" onClick={() => navigate('/voice')}>
        <Mic size={18} aria-hidden="true" /> Report or log today’s visit
      </button>
    </div>
  );
}
