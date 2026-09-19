import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, CheckCircle2, ChevronRight, Clock, Sparkles, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemoProfile } from '../features/demo/DemoContext';
import {
  DEMO_CIRCLE_ID,
  DEMO_RAHUL_ID,
  getHandoffContext,
  listAvailability,
  listTasks,
  routeVoiceTurn,
  updateTask,
  type ApiTask,
  type CoordinationSuggestion,
  type HandoffContext,
  type HandoffSummary,
  type MemberAvailability,
} from '../lib/api';
import {
  removeRealtimeChannel,
  subscribeToCareEvents,
  subscribeToTasks,
} from '../lib/supabase';

function isOpen(task: ApiTask) {
  return !['completed', 'done', 'cancelled'].includes(task.status);
}

function taskOccursDuring(task: ApiTask, slot: MemberAvailability) {
  if (!task.due_at) return false;
  const due = new Date(task.due_at).getTime();
  return due >= new Date(slot.starts_at).getTime() && due <= new Date(slot.ends_at).getTime();
}

export function FamilyHomePage() {
  const navigate = useNavigate();
  const { activeProfile, authStatus } = useDemoProfile();
  const [handoff, setHandoff] = useState<HandoffContext | null>(null);
  const [handoffSummary, setHandoffSummary] = useState<HandoffSummary | null>(null);
  const [availability, setAvailability] = useState<MemberAvailability[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, CoordinationSuggestion>>({});
  const [loading, setLoading] = useState(true);
  const [catchingUp, setCatchingUp] = useState(false);
  const [coordinatingTaskId, setCoordinatingTaskId] = useState<string | null>(null);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [confirmedTaskId, setConfirmedTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [nextHandoff, nextAvailability, nextTasks] = await Promise.all([
      getHandoffContext(activeProfile.id),
      listAvailability(activeProfile.id),
      listTasks(activeProfile.id),
    ]);
    setHandoff(nextHandoff);
    setAvailability(nextAvailability);
    setTasks(nextTasks);
  }, [activeProfile.id]);

  useEffect(() => {
    let cancelled = false;
    let taskChannel: ReturnType<typeof subscribeToTasks> = null;
    let eventChannel: ReturnType<typeof subscribeToCareEvents> = null;

    setLoading(true);
    setError(null);
    setHandoff(null);
    setHandoffSummary(null);
    setAvailability([]);
    setTasks([]);
    setSuggestions({});
    setConfirmedTaskId(null);

    if (authStatus !== 'authenticated') {
      setLoading(authStatus === 'loading');
      return;
    }

    loadData()
      .then(() => {
        if (cancelled) return;
        taskChannel = subscribeToTasks(DEMO_CIRCLE_ID, (payload) => {
          const changed = (payload.eventType === 'DELETE' ? payload.old : payload.new) as unknown as ApiTask;
          if (!changed.id) return;
          setTasks((current) => {
            if (payload.eventType === 'DELETE') {
              return current.filter((task) => task.id !== changed.id);
            }
            return [changed, ...current.filter((task) => task.id !== changed.id)];
          });
        });
        eventChannel = subscribeToCareEvents(DEMO_CIRCLE_ID, () => {
          getHandoffContext(activeProfile.id)
            .then((context) => {
              if (!cancelled) {
                setHandoff(context);
                setHandoffSummary(null);
              }
            })
            .catch(() => undefined);
        });
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'CareLoop could not load family updates.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      void removeRealtimeChannel(taskChannel);
      void removeRealtimeChannel(eventChannel);
    };
  }, [activeProfile.id, authStatus, loadData]);

  const pendingTasks = useMemo(() => tasks.filter(isOpen), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => !isOpen(task)), [tasks]);

  const handleCatchUp = async () => {
    setCatchingUp(true);
    setError(null);
    try {
      const result = await routeVoiceTurn('Catch me up.', activeProfile);
      if (!result.preview.handoff_summary) throw new Error('A handoff summary was not returned.');
      setHandoffSummary(result.preview.handoff_summary);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'CareLoop could not prepare the handoff.');
    } finally {
      setCatchingUp(false);
    }
  };

  const handleFindHelper = async (task: ApiTask) => {
    setCoordinatingTaskId(task.id);
    setError(null);
    try {
      const result = await routeVoiceTurn(
        `Who can help with ${task.title} tomorrow?`,
        activeProfile,
        task.id,
      );
      const suggestion = result.preview.coordination_suggestion;
      if (!suggestion || suggestion.task_id !== task.id) {
        throw new Error('CareLoop could not match this task to current availability.');
      }
      setSuggestions((current) => ({ ...current, [task.id]: suggestion }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'CareLoop could not check availability.');
    } finally {
      setCoordinatingTaskId(null);
    }
  };

  const handleAskRahul = async (taskId: string) => {
    setAssigningTaskId(taskId);
    setError(null);
    try {
      const preview = await routeVoiceTurn('Ask Rahul.', activeProfile, taskId);
      const suggestion = preview.preview.coordination_suggestion;
      if (
        suggestion?.action !== 'assign_task' ||
        suggestion.task_id !== taskId ||
        suggestion.assignee_id !== DEMO_RAHUL_ID
      ) {
        throw new Error('CareLoop could not confirm Rahul for this task.');
      }
      const persisted = await updateTask(taskId, { assigned_to: DEMO_RAHUL_ID }, activeProfile.id);
      setTasks((current) => [persisted, ...current.filter((task) => task.id !== persisted.id)]);
      setConfirmedTaskId(taskId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'CareLoop could not assign the task.');
    } finally {
      setAssigningTaskId(null);
    }
  };

  return (
    <motion.div className="family-home" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="family-greeting">
        <div className="greeting-text">
          <h1>Good morning, {activeProfile.displayName}!</h1>
          <p className="greeting-subtitle">Here&apos;s the latest from Amma&apos;s Care Circle</p>
        </div>
      </section>

      {error && <p className="form-error" role="alert">{error}</p>}

      <motion.section className="catch-up-hero" initial={{ y: 8 }} animate={{ y: 0 }}>
        <div className="catch-up-content">
          <div className="catch-up-sparkle-row">
            <div className="catch-up-icon-badge"><Sparkles size={20} aria-hidden="true" /></div>
            <span className="catch-up-pill-label">Real Care Circle handoff</span>
          </div>
          <h2 className="catch-up-title">Catch me up</h2>
          <p className="catch-up-body">
            {loading
              ? 'Loading shared updates…'
              : `${handoff?.events_since_last_seen.length ?? 0} recent updates, ${pendingTasks.length} pending tasks`}
          </p>
          <button
            type="button"
            className="catch-up-action-btn primary-button"
            onClick={() => void handleCatchUp()}
            disabled={loading || catchingUp}
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>{catchingUp ? 'Preparing handoff…' : 'Catch me up'}</span>
          </button>
        </div>

        <AnimatePresence>
          {handoffSummary && (
            <motion.div
              className="catch-up-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              aria-live="polite"
            >
              <div className="catch-up-divider" />
              <p className="catch-up-summary-copy">{handoffSummary.summary}</p>
              {handoffSummary.important.map((event) => (
                <div className="catch-up-item" key={event.id}>
                  <span className="item-emoji" aria-hidden="true">💬</span>
                  <div className="item-details">
                    <strong className="item-title">{event.raw_transcript ?? `${event.event_type.replaceAll('_', ' ')} update`}</strong>
                    <p className="item-subtitle">
                      {event.reporter.display_name} · {new Date(event.occurred_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {handoffSummary.important.length === 0 && (
                <p className="item-subtitle">No new care events in this handoff window.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <section className="attention-section">
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>Needs attention</h2>
            <span className="coral-count-badge">{pendingTasks.length} open</span>
          </div>
        </div>
        <div className="attention-cards-list">
          {pendingTasks.length === 0 && !loading && <p className="item-subtitle">Nothing needs attention right now.</p>}
          {pendingTasks.map((task) => {
            const suggestion = suggestions[task.id];
            const rahulSlot = availability.find(
              (slot) => slot.profile_id === DEMO_RAHUL_ID && taskOccursDuring(task, slot),
            );
            const isRahulAssigned = task.assigned_to === DEMO_RAHUL_ID;
            const showRahulSuggestion = suggestion?.assignee_id === DEMO_RAHUL_ID && Boolean(rahulSlot);
            return (
              <article className="attention-card" key={task.id}>
                <div className="attention-body">
                  <strong className="attention-title">{task.title}</strong>
                  <p className="attention-subtitle">
                    {task.due_at ? `Due ${new Date(task.due_at).toLocaleString()}` : 'No due time set'}
                  </p>
                  {isRahulAssigned && confirmedTaskId === task.id && (
                    <motion.p initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="assignment-success" aria-live="polite">
                      Rahul&apos;s got it ✨
                    </motion.p>
                  )}
                  {!task.assigned_to && !suggestion && (
                    <button
                      type="button"
                      className="primary-button compact touch-target"
                      onClick={() => void handleFindHelper(task)}
                      disabled={coordinatingTaskId === task.id}
                    >
                      {coordinatingTaskId === task.id ? 'Checking real availability…' : 'Who can help?'}
                    </button>
                  )}
                  {!task.assigned_to && suggestion && (
                    <div className="coordination-result">
                      <p>{suggestion.message}</p>
                      {showRahulSuggestion && (
                        <button
                          type="button"
                          className="primary-button compact touch-target"
                          onClick={() => void handleAskRahul(task.id)}
                          disabled={assigningTaskId === task.id}
                        >
                          <UserCheck size={16} aria-hidden="true" />
                          {assigningTaskId === task.id ? 'Assigning…' : 'Ask Rahul'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="upcoming-section">
        <div className="section-header">
          <h2>Recently completed</h2>
          <button type="button" className="see-all-btn touch-target" onClick={() => navigate('/tasks')}>
            See all <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        {completedTasks.slice(0, 3).map((task) => (
          <div className="upcoming-task-card" key={task.id}>
            <CheckCircle2 size={20} color="var(--care-success)" aria-hidden="true" />
            <div className="task-body"><strong className="task-title">{task.title}</strong></div>
          </div>
        ))}
        {completedTasks.length === 0 && <p className="item-subtitle">No recently completed tasks.</p>}
      </section>

      <section className="upcoming-care-section">
        <div className="section-header"><h2>Upcoming care</h2></div>
        <div className="upcoming-care-list">
          {handoff?.upcoming.map((item) => (
            <div className="upcoming-care-card" key={item.id}>
              <span className="care-emoji"><Calendar size={18} aria-hidden="true" /></span>
              <div className="care-body">
                <strong className="care-title">{item.title}</strong>
                <p className="care-subtitle"><Clock size={13} aria-hidden="true" /> {new Date(item.starts_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {!loading && handoff?.upcoming.length === 0 && <p className="item-subtitle">No upcoming care items.</p>}
        </div>
      </section>
    </motion.div>
  );
}

export default FamilyHomePage;
