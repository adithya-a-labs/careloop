import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Plus, Check, Clock, AlertCircle, UserCheck } from 'lucide-react';
import {
  listTasks,
  updateTask,
  createTask,
  listAvailability,
  routeVoiceTurn,
  DEMO_CIRCLE_ID,
  DEMO_RAHUL_ID,
  PROFILE_UUIDS,
  UUID_TO_NAME,
  type ApiTask,
  type MemberAvailability,
} from '../lib/api';
import { subscribeToTasks, removeRealtimeChannel } from '../lib/supabase';
import { useDemoProfile } from '../features/demo/DemoContext';

type TabType = 'All' | 'My Tasks' | 'Assigned' | 'Done';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

export function TasksPage() {
  const { activeProfile, authStatus } = useDemoProfile();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [availability, setAvailability] = useState<MemberAvailability[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDay, setNewTaskDay] = useState<'Today' | 'Tomorrow'>('Today');
  const [heroAssignedId, setHeroAssignedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const activeProfileUuid = PROFILE_UUIDS[activeProfile.id];
  const activeProfileName = activeProfile.displayName;

  // Load real tasks and availability
  const loadTasksData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedTasks, fetchedAvail] = await Promise.all([
        listTasks(activeProfile.id),
        listAvailability(activeProfile.id),
      ]);
      setTasks(fetchedTasks);
      setAvailability(fetchedAvail);
    } catch (reason) {
      setTasks([]);
      setAvailability([]);
      setError(reason instanceof Error ? reason.message : 'CareLoop could not load tasks.');
    } finally {
      setLoading(false);
    }
  }, [activeProfile.id]);

  useEffect(() => {
    let cancelled = false;
    let taskSub: ReturnType<typeof subscribeToTasks> = null;
    setTasks([]);
    setAvailability([]);
    setHeroAssignedId(null);
    if (authStatus !== 'authenticated') {
      setLoading(authStatus === 'loading');
      return;
    }
    void loadTasksData()
      .then(() => {
        if (cancelled) return;
        taskSub = subscribeToTasks(DEMO_CIRCLE_ID, (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedTask = payload.old as unknown as ApiTask;
            setTasks((prev) => prev.filter((task) => task.id !== deletedTask.id));
            return;
          }
          const changed = payload.new as unknown as ApiTask;
          if (!changed.id) return;
          setTasks((prev) => [changed, ...prev.filter((task) => task.id !== changed.id)]);
        });
      });

    return () => {
      cancelled = true;
      void removeRealtimeChannel(taskSub);
    };
  }, [activeProfile.id, authStatus, loadTasksData]);

  const toggleTaskDone = async (task: ApiTask) => {
    const isDone = task.status === 'completed' || task.status === 'done';
    const newStatus = isDone ? 'pending' : 'completed';

    setSavingTaskId(task.id);
    setError(null);
    try {
      const persisted = await updateTask(task.id, { status: newStatus }, activeProfile.id);
      setTasks((prev) => [persisted, ...prev.filter((item) => item.id !== persisted.id)]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'CareLoop could not update the task.');
    } finally {
      setSavingTaskId(null);
    }
  };

  // Assign task to Rahul: "Ask Rahul"
  const handleAskRahul = async (taskId: string) => {
    setSavingTaskId(taskId);
    setError(null);
    try {
      const preview = await routeVoiceTurn('Ask Rahul.', activeProfile, taskId);
      const suggestion = preview.preview.coordination_suggestion;
      if (suggestion?.action !== 'assign_task' || suggestion.assignee_id !== DEMO_RAHUL_ID) {
        throw new Error('CareLoop could not confirm Rahul for this task.');
      }
      const persisted = await updateTask(taskId, { assigned_to: DEMO_RAHUL_ID }, activeProfile.id);
      setTasks((prev) => [persisted, ...prev.filter((task) => task.id !== persisted.id)]);
      setHeroAssignedId(taskId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'CareLoop could not assign the task.');
    } finally {
      setSavingTaskId(null);
    }
  };

  // Add new task
  const handleAddNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const dueAt = newTaskDay === 'Today'
      ? new Date().toISOString()
      : new Date(Date.now() + 86400000).toISOString();

    setError(null);
    try {
      const created = await createTask(
        {
          title: newTaskTitle.trim(),
          due_at: dueAt,
          priority: 'medium',
          status: 'pending',
        },
        activeProfile.id,
      );
      setTasks((prev) => [created, ...prev.filter((task) => task.id !== created.id)]);
      setNewTaskTitle('');
      setIsAddingTask(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'CareLoop could not create the task.');
    }
  };

  // Filter tasks based on activeTab
  const filteredTasks = tasks.filter((task) => {
    const isDone = task.status === 'completed' || task.status === 'done';
    if (activeTab === 'All') return true;
    if (activeTab === 'My Tasks') {
      if (task.assigned_to === activeProfileUuid) return true;
      if (!task.assigned_to && activeProfile.isPatient) return true;
      return false;
    }
    if (activeTab === 'Assigned') return Boolean(task.assigned_to);
    if (activeTab === 'Done') return isDone;
    return true;
  });

  const isTomorrow = (task: ApiTask) => {
    if (!task.due_at) return false;
    const due = new Date(task.due_at);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return due.toDateString() === tomorrow.toDateString();
  };

  const todayTasks = filteredTasks.filter((t) => !isTomorrow(t));
  const tomorrowTasks = filteredTasks.filter((t) => isTomorrow(t));

  const rahulIsAvailableFor = (task: ApiTask) => availability.find((slot) => {
    if (slot.profile_id !== DEMO_RAHUL_ID || !task.due_at) return false;
    const due = new Date(task.due_at).getTime();
    return due >= new Date(slot.starts_at).getTime() && due <= new Date(slot.ends_at).getTime();
  });

  const tabs: TabType[] = ['All', 'My Tasks', 'Assigned', 'Done'];

  return (
    <div className="tasks-page">
      {/* Header */}
      <header style={{ marginBottom: '1.5rem' }}>
        <p className="eyebrow" style={{ margin: 0, marginBottom: '0.4rem' }}>
          Shared care
        </p>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 900 }}>
          Care Tasks
        </h1>
        <p style={{ margin: 0, color: 'var(--care-muted)', fontSize: '1rem' }}>
          Clear family coordination without the group-chat scramble.
        </p>
      </header>

      {loading && <p className="timeline-ghost-hint">Loading real Care Circle tasks…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {/* Filter tabs */}
      <div className="task-tabs" role="tablist" aria-label="Task filters">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`task-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Inline Quick Add Form Modal/Drawer if opened */}
      <AnimatePresence>
        {isAddingTask && (
          <motion.form
            onSubmit={handleAddNewTask}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              background: 'var(--care-cream)',
              border: '1.5px solid var(--care-sun)',
              borderRadius: 'var(--care-radius-md, 20px)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              boxShadow: '0 8px 24px rgba(99, 65, 40, 0.08)',
            }}
          >
            <div style={{ fontWeight: 800, color: 'var(--care-ink)' }}>
              Add a new family care task
            </div>
            <label htmlFor="newTaskTitle" style={{ fontWeight: 700, color: 'var(--care-ink)' }}>
              Task
            </label>
            <input
              id="newTaskTitle"
              type="text"
              placeholder="What needs to be done? e.g. Pick up eye drops"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              autoFocus
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '14px',
                border: '1.5px solid var(--care-border)',
                background: 'white',
                fontSize: '0.95rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--care-muted)', fontWeight: 700 }}>
                Due:
              </span>
              <button
                type="button"
                onClick={() => setNewTaskDay('Today')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '999px',
                  border: '1px solid var(--care-border)',
                  background: newTaskDay === 'Today' ? 'var(--care-ink)' : 'white',
                  color: newTaskDay === 'Today' ? 'white' : 'var(--care-ink)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setNewTaskDay('Tomorrow')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '999px',
                  border: '1px solid var(--care-border)',
                  background: newTaskDay === 'Tomorrow' ? 'var(--care-ink)' : 'white',
                  color: newTaskDay === 'Tomorrow' ? 'white' : 'var(--care-ink)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Tomorrow
              </button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '999px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--care-muted)',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.45rem 1.1rem',
                    borderRadius: '999px',
                    border: 'none',
                    background: 'var(--care-coral)',
                    color: '#3c2925',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Save task
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Today Section */}
      <motion.section
        className="task-section"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div
          className="task-section-title"
          style={{
            fontSize: '1.2rem',
            fontWeight: 850,
            color: 'var(--care-ink)',
            marginBottom: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Today</span>
          <span
            className="task-section-count"
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              background: 'var(--care-cream)',
              color: 'var(--care-ink)',
              padding: '0.15rem 0.55rem',
              borderRadius: '999px',
            }}
          >
            {todayTasks.length}
          </span>
        </div>

        {todayTasks.length === 0 ? (
          <p
            style={{
              color: 'var(--care-muted)',
              fontSize: '0.92rem',
              fontStyle: 'italic',
              margin: '0.5rem 0 1.5rem',
            }}
          >
            No tasks for today in this view.
          </p>
        ) : (
          todayTasks.map((task) => {
            const isDone = task.status === 'completed' || task.status === 'done';
            const assigneeName = task.assigned_to ? UUID_TO_NAME[task.assigned_to] || 'Assigned' : null;
            const isRahulHero = heroAssignedId === task.id || task.assigned_to === DEMO_RAHUL_ID;
            const isUnassigned = !task.assigned_to && !isDone;
            const rahulSlot = rahulIsAvailableFor(task);

            return (
              <motion.div
                key={task.id}
                variants={itemVariants}
                className={`task-item ${isDone ? 'task-item--done' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  backgroundColor: isDone ? 'rgba(255, 253, 248, 0.7)' : 'var(--care-surface)',
                  border: isRahulHero && !isDone ? '2px solid var(--care-success)' : `1.5px solid ${isDone ? '#e4decb' : 'var(--care-border)'}`,
                  borderRadius: 'var(--care-radius-md, 20px)',
                  padding: '1rem 1.2rem',
                  marginBottom: '0.75rem',
                  boxShadow: isDone ? 'none' : '0 4px 14px rgba(99, 65, 40, 0.04)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  {/* Checkbox circle */}
                  <button
                    type="button"
                    onClick={() => toggleTaskDone(task)}
                    aria-label={isDone ? 'Mark task as not done' : 'Mark task as done'}
                    className={`task-checkbox-btn ${isDone ? 'done' : ''}`}
                    disabled={savingTaskId === task.id}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      border: isDone ? '2px solid var(--care-success)' : '2px solid var(--care-peach)',
                      backgroundColor: isDone ? 'var(--care-success)' : 'transparent',
                      color: 'white',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      padding: 0,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isDone && <Check size={16} strokeWidth={3} />}
                  </button>

                  {/* Emoji badge */}
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '14px',
                      backgroundColor: 'var(--care-cream)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '1.35rem',
                      flexShrink: 0,
                    }}
                  >
                    <span role="img" aria-hidden="true">
                      {task.title.toLowerCase().includes('prescription') || task.title.toLowerCase().includes('medicine') ? '💊' : '📋'}
                    </span>
                  </div>

                  {/* Title and Assignee */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="task-title"
                      style={{
                        fontWeight: 750,
                        fontSize: '1rem',
                        color: isDone ? 'var(--care-muted)' : 'var(--care-ink)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        lineHeight: 1.3,
                        marginBottom: '0.2rem',
                      }}
                    >
                      {task.title}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      {assigneeName ? (
                        <span style={{ color: 'var(--care-muted)', fontWeight: 600 }}>
                          {assigneeName}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--care-coral)', fontWeight: 750 }}>
                          Unassigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Due Label & Priority */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: task.priority === 'high' || task.priority === 'urgent' ? 'var(--care-coral)' : 'var(--care-muted)',
                      backgroundColor: task.priority === 'high' || task.priority === 'urgent' ? 'rgba(255, 126, 126, 0.12)' : 'rgba(234, 223, 206, 0.35)',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '999px',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {task.priority === 'high' || task.priority === 'urgent' ? (
                      <AlertCircle size={13} style={{ color: 'var(--care-coral)' }} />
                    ) : (
                      <Clock size={13} />
                    )}
                    <span>{task.due_at ? new Date(task.due_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Today'}</span>
                  </div>
                </div>

                {/* Hero coordination row for unassigned tasks */}
                {isUnassigned && rahulSlot && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      padding: '0.55rem 0.85rem',
                      background: 'var(--care-cream)',
                      borderRadius: 'var(--care-radius-sm, 14px)',
                      border: '1px solid var(--care-sun)',
                      marginTop: '0.2rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.05rem' }}>👨</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--care-ink)' }}>
                        Rahul is available:
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--care-muted)', fontWeight: 600 }}>
                        {rahulSlot.note ?? `${new Date(rahulSlot.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}–${new Date(rahulSlot.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="primary-button compact"
                      onClick={() => handleAskRahul(task.id)}
                      disabled={savingTaskId === task.id}
                      style={{
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.8rem',
                        boxShadow: '0 4px 12px rgba(255, 126, 126, 0.25)',
                      }}
                    >
                      <UserCheck size={14} />
                      <span>{savingTaskId === task.id ? 'Assigning…' : 'Ask Rahul'}</span>
                    </button>
                  </div>
                )}

                {/* Hero spring animation indicator when Rahul is assigned */}
                {isRahulHero && !isDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.8rem',
                      background: 'rgba(95, 143, 114, 0.12)',
                      borderRadius: '999px',
                      color: 'var(--care-success)',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      width: 'fit-content',
                    }}
                  >
                    <span>👨✨</span>
                    <span>Rahul&apos;s got it ✨</span>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </motion.section>

      {/* Tomorrow Section */}
      <motion.section
        className="task-section"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ marginTop: '2rem' }}
      >
        <div
          className="task-section-title"
          style={{
            fontSize: '1.2rem',
            fontWeight: 850,
            color: 'var(--care-ink)',
            marginBottom: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>Tomorrow</span>
          <span
            className="task-section-count"
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              background: 'var(--care-cream)',
              color: 'var(--care-ink)',
              padding: '0.15rem 0.55rem',
              borderRadius: '999px',
            }}
          >
            {tomorrowTasks.length}
          </span>
        </div>

        {tomorrowTasks.length === 0 ? (
          <p
            style={{
              color: 'var(--care-muted)',
              fontSize: '0.92rem',
              fontStyle: 'italic',
              margin: '0.5rem 0 1.5rem',
            }}
          >
            No tasks scheduled for tomorrow in this view.
          </p>
        ) : (
          tomorrowTasks.map((task) => {
            const isDone = task.status === 'completed' || task.status === 'done';
            const assigneeName = task.assigned_to ? UUID_TO_NAME[task.assigned_to] || 'Assigned' : null;

            return (
              <motion.div
                key={task.id}
                variants={itemVariants}
                className={`task-item ${isDone ? 'task-item--done' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem',
                  backgroundColor: isDone ? 'rgba(255, 253, 248, 0.7)' : 'var(--care-surface)',
                  border: `1.5px solid ${isDone ? '#e4decb' : 'var(--care-border)'}`,
                  borderRadius: 'var(--care-radius-md, 20px)',
                  padding: '1rem 1.2rem',
                  marginBottom: '0.75rem',
                  boxShadow: isDone ? 'none' : '0 4px 14px rgba(99, 65, 40, 0.04)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Checkbox circle */}
                <button
                  type="button"
                  onClick={() => toggleTaskDone(task)}
                  aria-label={isDone ? 'Mark task as not done' : 'Mark task as done'}
                  className={`task-checkbox-btn ${isDone ? 'done' : ''}`}
                  disabled={savingTaskId === task.id}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: isDone ? '2px solid var(--care-success)' : '2px solid var(--care-peach)',
                    backgroundColor: isDone ? 'var(--care-success)' : 'transparent',
                    color: 'white',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    padding: 0,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isDone && <Check size={16} strokeWidth={3} />}
                </button>

                {/* Emoji badge */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--care-cream)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '1.35rem',
                    flexShrink: 0,
                  }}
                >
                  <span role="img" aria-hidden="true">
                    📋
                  </span>
                </div>

                {/* Title and Assignee */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="task-title"
                    style={{
                      fontWeight: 750,
                      fontSize: '1rem',
                      color: isDone ? 'var(--care-muted)' : 'var(--care-ink)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      lineHeight: 1.3,
                      marginBottom: '0.2rem',
                    }}
                  >
                    {task.title}
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    {assigneeName ? (
                      <span style={{ color: 'var(--care-muted)', fontWeight: 600 }}>
                        {assigneeName}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--care-coral)', fontWeight: 750 }}>
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Due Label & Urgent indicator */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: task.priority === 'high' || task.priority === 'urgent' ? 'var(--care-coral)' : 'var(--care-muted)',
                    backgroundColor: task.priority === 'high' || task.priority === 'urgent' ? 'rgba(255, 126, 126, 0.12)' : 'rgba(234, 223, 206, 0.35)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '999px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {task.priority === 'high' || task.priority === 'urgent' ? (
                    <AlertCircle size={13} style={{ color: 'var(--care-coral)' }} />
                  ) : (
                    <Clock size={13} />
                  )}
                  <span>Tomorrow</span>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.section>

      {/* Floating '+ Add a task' button at bottom */}
      <motion.button
        type="button"
        className="task-fab"
        whileHover={{ scale: 1.04, translateY: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setIsAddingTask((prev) => !prev)}
      >
        <Plus size={20} strokeWidth={2.5} />
        <span>+ Add a task</span>
      </motion.button>
    </div>
  );
}

export default TasksPage;
