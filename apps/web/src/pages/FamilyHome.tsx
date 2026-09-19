import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Sparkles,
  AlertCircle,
  Clock,
  ChevronRight,
  CheckCircle2,
  UserCheck,
  RotateCw,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemoProfile } from '../features/demo/DemoContext';
import {
  getHandoffContext,
  listAvailability,
  listTasks,
  updateTask,
  DEMO_CIRCLE_ID,
  DEMO_RAHUL_ID,
  UUID_TO_NAME,
  type HandoffContext,
  type MemberAvailability,
  type ApiTask,
} from '../lib/api';
import { subscribeToTasks, subscribeToCareEvents, removeRealtimeChannel } from '../lib/supabase';
import {
  ATTENTION_ITEMS,
  SINCE_LAST_VISIT,
  UPCOMING_CARE,
  TASKS,
} from '../lib/mock-data';

interface WellbeingStatus {
  id: string;
  label: string;
  tone: 'sun' | 'peach' | 'success';
  Icon: LucideIcon;
}

const WELLBEING_STATUSES: WellbeingStatus[] = [
  {
    id: 'discomfort',
    label: 'Minor discomfort after lunch',
    tone: 'sun',
    Icon: AlertCircle,
  },
  {
    id: 'lunch',
    label: 'Lunch: Ate less',
    tone: 'peach',
    Icon: Clock,
  },
  {
    id: 'nurse',
    label: 'Nurse visit: Completed',
    tone: 'success',
    Icon: CheckCircle2,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

const catchUpListVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const catchUpItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

export function FamilyHomePage() {
  const navigate = useNavigate();
  const [showCatchUp, setShowCatchUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real data state
  const [handoff, setHandoff] = useState<HandoffContext | null>(null);
  const [availability, setAvailability] = useState<MemberAvailability[]>([]);
  const [taskList, setTaskList] = useState<ApiTask[]>([]);
  const [heroAssignedId, setHeroAssignedId] = useState<string | null>(null);

  const { activeProfile } = useDemoProfile();
  const displayName = activeProfile?.isPatient ? 'Maya' : (activeProfile?.displayName || 'Maya');

  // Load real data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [handoffRes, availRes, tasksRes] = await Promise.all([
        getHandoffContext(activeProfile.id).catch(() => null),
        listAvailability(activeProfile.id).catch(() => []),
        listTasks(activeProfile.id).catch(() => []),
      ]);

      if (handoffRes) setHandoff(handoffRes);
      if (availRes) setAvailability(availRes);
      if (tasksRes && tasksRes.length > 0) setTaskList(tasksRes);
    } catch (err: any) {
      console.warn('FamilyHome using fallback mock data:', err);
      setError(err?.message || 'Could not reach CareLoop server');
    } finally {
      setLoading(false);
    }
  }, [activeProfile.id]);

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates for tasks and care events
    const taskSub = subscribeToTasks(DEMO_CIRCLE_ID, () => {
      listTasks(activeProfile.id)
        .then((tasks) => {
          if (tasks && tasks.length > 0) setTaskList(tasks);
        })
        .catch(() => {});
    });

    const eventSub = subscribeToCareEvents(DEMO_CIRCLE_ID, () => {
      getHandoffContext(activeProfile.id)
        .then((ctx) => {
          if (ctx) setHandoff(ctx);
        })
        .catch(() => {});
    });

    return () => {
      removeRealtimeChannel(taskSub);
      removeRealtimeChannel(eventSub);
    };
  }, [loadData, activeProfile.id]);

  // Handle task coordination: "Ask Rahul"
  const handleAskRahul = async (taskId: string) => {
    // Optimistic UI update
    setHeroAssignedId(taskId);
    setTaskList((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assigned_to: DEMO_RAHUL_ID } : t)),
    );

    try {
      await updateTask(taskId, { assigned_to: DEMO_RAHUL_ID }, activeProfile.id);
    } catch (err: any) {
      console.error('Failed to assign task to Rahul:', err);
      // Rollback on error
      loadData();
    }
  };

  // Find unassigned tasks needing attention
  const unassignedTasks = taskList.filter((t) => !t.assigned_to && t.status !== 'completed' && t.status !== 'done');
  const pendingTasks = taskList.filter((t) => t.status !== 'completed' && t.status !== 'done');
  const completedTasks = taskList.filter((t) => t.status === 'completed' || t.status === 'done');

  // Check if Rahul is available
  const rahulAvail = availability.find((a) => a.profile_id === DEMO_RAHUL_ID);
  const rahulAvailNote = rahulAvail?.note || 'Available tomorrow afternoon';

  // Compute updates count
  const updatesCount = handoff
    ? handoff.events_since_last_seen.length + unassignedTasks.length
    : 4;

  return (
    <motion.div
      className="family-home"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* 1. Greeting */}
      <motion.section className="family-greeting" variants={itemVariants}>
        <div className="greeting-text">
          <h1>Good morning, {displayName}!</h1>
          <p className="greeting-subtitle">Here&apos;s the latest from Amma</p>
        </div>

        {/* Compact status badges in horizontal scrollable row */}
        <div className="wellbeing-badges" role="region" aria-label="Amma's wellbeing status">
          {WELLBEING_STATUSES.map(({ id, label, tone, Icon }) => (
            <div key={id} className={`wellbeing-badge wellbeing-${tone}`}>
              <Icon size={14} className="badge-icon" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* 2. Catch Me Up Hero Card */}
      <motion.section
        className="catch-up-hero"
        variants={itemVariants}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="catch-up-shimmer" aria-hidden="true" />
        <div className="catch-up-content">
          <div className="catch-up-sparkle-row">
            <div className="catch-up-icon-badge">
              <Sparkles size={20} className="sparkle-icon" />
            </div>
            <span className="catch-up-pill-label">Care AI Summary</span>
          </div>

          <h2 className="catch-up-title">Catch me up</h2>
          <p className="catch-up-body">
            {loading ? (
              <span>Checking with Amma&apos;s Care Circle...</span>
            ) : (
              <span>{updatesCount} updates since you last checked</span>
            )}
          </p>

          <button
            type="button"
            className="catch-up-action-btn primary-button"
            onClick={() => setShowCatchUp((prev) => !prev)}
            aria-expanded={showCatchUp}
          >
            <Sparkles size={16} />
            <span>{showCatchUp ? 'Got it, thanks' : 'See what happened'}</span>
          </button>
        </div>

        {/* AnimatePresence staggered list of Catch Me Up items */}
        <AnimatePresence>
          {showCatchUp && (
            <motion.div
              className="catch-up-expanded"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <div className="catch-up-divider" />

              {/* SECTION: Since your last visit */}
              <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9b4e3f', marginBottom: '0.6rem' }}>
                Since your last visit
              </div>
              <motion.div
                className="catch-up-items-list"
                variants={catchUpListVariants}
                initial="hidden"
                animate="show"
              >
                {handoff && handoff.events_since_last_seen.length > 0 ? (
                  handoff.events_since_last_seen.map((event) => (
                    <motion.div
                      key={event.id}
                      className="catch-up-item"
                      variants={catchUpItemVariants}
                    >
                      <span className="item-emoji" role="img" aria-hidden="true">
                        {event.event_type === 'meal' ? '🍽️' : event.event_type === 'visit' ? '👩‍⚕️' : '🗣️'}
                      </span>
                      <div className="item-details">
                        <strong className="item-title">
                          {event.raw_transcript || (event.event_data?.title as string) || `${event.event_type} event recorded`}
                        </strong>
                        <p className="item-subtitle">
                          Reported by {UUID_TO_NAME[event.reported_by] || 'Family'} · {new Date(event.occurred_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  SINCE_LAST_VISIT.map((item) => (
                    <motion.div
                      key={item.id}
                      className="catch-up-item"
                      variants={catchUpItemVariants}
                    >
                      <span className="item-emoji" role="img" aria-hidden="true">
                        {item.emoji}
                      </span>
                      <div className="item-details">
                        <strong className="item-title">{item.title}</strong>
                        <p className="item-subtitle">{item.subtitle}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>

              {/* SECTION: Still Pending */}
              {pendingTasks.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9b4e3f', marginBottom: '0.6rem' }}>
                    Still pending
                  </div>
                  <motion.div className="catch-up-items-list" variants={catchUpListVariants}>
                    {pendingTasks.slice(0, 3).map((task) => (
                      <motion.div key={task.id} className="catch-up-item" variants={catchUpItemVariants}>
                        <span className="item-emoji" role="img" aria-hidden="true">
                          {task.priority === 'high' || task.priority === 'urgent' ? '⚠️' : '📋'}
                        </span>
                        <div className="item-details">
                          <strong className="item-title">{task.title}</strong>
                          <p className="item-subtitle">
                            {task.assigned_to ? `Assigned to ${UUID_TO_NAME[task.assigned_to] || 'someone'}` : 'Needs someone'} · {task.priority} priority
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}

              {/* SECTION: Completed */}
              {completedTasks.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5f8f72', marginBottom: '0.6rem' }}>
                    Completed
                  </div>
                  <motion.div className="catch-up-items-list" variants={catchUpListVariants}>
                    {completedTasks.slice(0, 2).map((task) => (
                      <motion.div key={task.id} className="catch-up-item" variants={catchUpItemVariants}>
                        <span className="item-emoji" role="img" aria-hidden="true">✅</span>
                        <div className="item-details">
                          <strong className="item-title" style={{ textDecoration: 'line-through' }}>{task.title}</strong>
                          <p className="item-subtitle">Completed by family</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* 3. Needs Attention Section */}
      <motion.section className="attention-section" variants={itemVariants}>
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>Needs attention</h2>
            <span className="coral-count-badge">
              {unassignedTasks.length > 0 ? `${unassignedTasks.length} task${unassignedTasks.length > 1 ? 's' : ''} unassigned` : '3 items'}
            </span>
          </div>
        </div>

        <div className="attention-cards-list">
          {/* Unassigned Prescription Task with Rahul Suggestion */}
          {unassignedTasks.map((task) => {
            const isHeroAssigned = heroAssignedId === task.id || task.assigned_to === DEMO_RAHUL_ID;
            return (
              <div
                key={task.id}
                className="attention-card"
                style={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: '0.75rem',
                  border: isHeroAssigned ? '2px solid var(--care-success)' : undefined,
                  background: isHeroAssigned ? 'rgba(95, 143, 114, 0.08)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <span className="attention-emoji" role="img" aria-hidden="true">
                    💊
                  </span>
                  <div className="attention-body">
                    <div className="attention-headline-row">
                      <span className="urgency-dot urgency-high" title="high urgency" />
                      <strong className="attention-title">{task.title}</strong>
                    </div>
                    <p className="attention-subtitle">
                      {task.description || 'Collect the prepared prescription from the pharmacy.'}
                    </p>
                  </div>
                </div>

                {/* Coordination Hero Suggestion */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    padding: '0.65rem 0.9rem',
                    background: isHeroAssigned ? 'rgba(95, 143, 114, 0.15)' : 'var(--care-cream)',
                    borderRadius: 'var(--care-radius-sm, 14px)',
                    border: isHeroAssigned ? '1px solid var(--care-success)' : '1px solid var(--care-sun)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <AnimatePresence mode="wait">
                      {isHeroAssigned ? (
                        <motion.span
                          key="assigned"
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          style={{ fontSize: '1.2rem' }}
                        >
                          👨✨
                        </motion.span>
                      ) : (
                        <span style={{ fontSize: '1.1rem' }}>👨</span>
                      )}
                    </AnimatePresence>
                    <div>
                      {isHeroAssigned ? (
                        <motion.strong
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          style={{ fontSize: '0.85rem', color: 'var(--care-success)', fontWeight: 800 }}
                        >
                          Rahul&apos;s got it ✨
                        </motion.strong>
                      ) : (
                        <div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 750, color: 'var(--care-ink)' }}>
                            Rahul is available:
                          </span>{' '}
                          <span style={{ fontSize: '0.78rem', color: 'var(--care-muted)', fontWeight: 600 }}>
                            {rahulAvailNote}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isHeroAssigned && (
                    <motion.button
                      type="button"
                      className="primary-button compact"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAskRahul(task.id);
                      }}
                      style={{
                        padding: '0.4rem 0.95rem',
                        fontSize: '0.82rem',
                        boxShadow: '0 4px 12px rgba(255, 126, 126, 0.3)',
                      }}
                    >
                      <UserCheck size={14} />
                      <span>Ask Rahul</span>
                    </motion.button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Additional Attention Items */}
          {ATTENTION_ITEMS.map((item) => (
            <div
              key={item.id}
              className="attention-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate('/tasks')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/tasks');
                }
              }}
            >
              <span className="attention-emoji" role="img" aria-hidden="true">
                {item.emoji}
              </span>
              <div className="attention-body">
                <div className="attention-headline-row">
                  <span
                    className={`urgency-dot urgency-${item.urgency}`}
                    title={`${item.urgency} urgency`}
                    aria-label={`${item.urgency} urgency`}
                  />
                  <strong className="attention-title">{item.title}</strong>
                </div>
                <p className="attention-subtitle">{item.subtitle}</p>
              </div>
              <ChevronRight size={18} className="attention-chevron" />
            </div>
          ))}
        </div>
      </motion.section>

      {/* 4. Upcoming Tasks Section */}
      <motion.section className="upcoming-section" variants={itemVariants}>
        <div className="section-header">
          <h2>Upcoming tasks</h2>
          <button
            type="button"
            className="see-all-btn"
            onClick={() => navigate('/tasks')}
          >
            <span>See all</span>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="upcoming-tasks-list">
          {pendingTasks.slice(0, 3).map((task) => {
            const assigneeName = task.assigned_to ? UUID_TO_NAME[task.assigned_to] || 'Assigned' : null;
            const isAssigned = Boolean(assigneeName);

            return (
              <div
                key={task.id}
                className="upcoming-task-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate('/tasks')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/tasks');
                  }
                }}
              >
                <span className="task-emoji" role="img" aria-hidden="true">
                  {task.title.toLowerCase().includes('medicine') ? '💊' : '📋'}
                </span>
                <div className="task-body">
                  <strong className="task-title">{task.title}</strong>
                  <div className="task-meta">
                    <span
                      className={`task-assignee-pill ${
                        !isAssigned ? 'assignee-needed' : 'assignee-assigned'
                      }`}
                    >
                      {assigneeName ? assigneeName : 'Needs someone'}
                    </span>
                    {!isAssigned && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskRahul(task.id);
                        }}
                        style={{
                          background: 'var(--care-coral)',
                          border: 'none',
                          borderRadius: '999px',
                          padding: '0.2rem 0.65rem',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#3c2925',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(255, 126, 126, 0.3)',
                        }}
                      >
                        Ask Rahul
                      </button>
                    )}
                    <span className="task-meta-dot">•</span>
                    <span className="task-due-info">
                      <Clock size={13} className="meta-clock-icon" />
                      <span>{task.due_at ? new Date(task.due_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Today'}</span>
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="task-chevron" />
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* 5. Upcoming Care Section */}
      <motion.section className="upcoming-care-section" variants={itemVariants}>
        <div className="section-header">
          <h2>Upcoming care</h2>
        </div>

        <div className="upcoming-care-list">
          {handoff && handoff.upcoming.length > 0 ? (
            handoff.upcoming.map((item) => (
              <div key={item.id} className="upcoming-care-card">
                <span className="care-emoji" role="img" aria-hidden="true">
                  <Calendar size={18} />
                </span>
                <div className="care-body">
                  <strong className="care-title">{item.title}</strong>
                  <p className="care-subtitle">
                    {new Date(item.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {item.ends_at ? ` – ${new Date(item.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                  </p>
                </div>
              </div>
            ))
          ) : (
            UPCOMING_CARE.map((care) => (
              <div key={care.id} className="upcoming-care-card">
                <span className="care-emoji" role="img" aria-hidden="true">
                  {care.emoji}
                </span>
                <div className="care-body">
                  <strong className="care-title">{care.title}</strong>
                  <p className="care-subtitle">{care.subtitle}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}

export default FamilyHomePage;
