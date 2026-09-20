import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Plus, Check, Clock, AlertCircle, UserCheck } from 'lucide-react';
import {
  listTasks,
  cachedAvailability,
  cachedTasks,
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

interface TaskRowProps {
  task: ApiTask;
  dueLabel: string;
  saving: boolean;
  rahulSlot?: MemberAvailability;
  rahulAssigned: boolean;
  onToggle: (task: ApiTask) => void;
  onAskRahul: (taskId: string) => void;
}

function TaskRow({
  task,
  dueLabel,
  saving,
  rahulSlot,
  rahulAssigned,
  onToggle,
  onAskRahul,
}: TaskRowProps) {
  const isDone = task.status === 'completed' || task.status === 'done';
  const assigneeName = task.assigned_to ? UUID_TO_NAME[task.assigned_to] || 'Assigned' : null;
  const isUnassigned = !task.assigned_to && !isDone;
  const isUrgent = task.priority === 'high' || task.priority === 'urgent';
  const hasMedicineIcon = /prescription|medicine/i.test(task.title);

  return (
    <motion.article
      variants={itemVariants}
      className={`task-item ${isDone ? 'task-item--done' : ''} ${rahulAssigned && !isDone ? 'task-item--assigned' : ''}`}
    >
      <div className="task-row-grid">
        <button
          type="button"
          onClick={() => onToggle(task)}
          aria-label={isDone ? 'Mark task as not done' : 'Mark task as done'}
          className={`task-checkbox-btn ${isDone ? 'done' : ''}`}
          disabled={saving}
        >
          {isDone && <Check size={16} strokeWidth={3} />}
        </button>

        <div className="task-icon" aria-hidden="true">
          {hasMedicineIcon ? '💊' : '📋'}
        </div>

        <div className="task-content">
          <div className="task-title">{task.title}</div>
          <div className={`task-assignee ${isUnassigned ? 'task-assignee--unassigned' : ''}`}>
            {assigneeName ?? 'Unassigned'}
          </div>
        </div>

        <div className={`task-time-badge ${isUrgent ? 'task-time-badge--urgent' : ''}`}>
          {isUrgent ? (
            <AlertCircle size={13} aria-hidden="true" />
          ) : (
            <Clock size={13} aria-hidden="true" />
          )}
          <span>{dueLabel}</span>
        </div>

        <div className="task-action-slot">
          {isUnassigned && rahulSlot ? (
            <button
              type="button"
              className="primary-button compact task-assign-button"
              onClick={() => onAskRahul(task.id)}
              disabled={saving}
            >
              <UserCheck size={14} aria-hidden="true" />
              <span>{saving ? 'Assigning…' : 'Ask Rahul'}</span>
            </button>
          ) : rahulAssigned && !isDone ? (
            <span className="task-assigned-confirmation">Rahul&apos;s got it ✨</span>
          ) : (
            <span className="task-action-placeholder" aria-hidden="true" />
          )}
        </div>
      </div>

      {isUnassigned && rahulSlot ? (
        <p className="task-availability-note">
          <UserCheck size={15} aria-hidden="true" />
          <span>
            <strong>Rahul is available.</strong> {rahulSlot.note}
          </span>
        </p>
      ) : null}
    </motion.article>
  );
}

export function TasksPage() {
  const { activeProfile, authStatus } = useDemoProfile();
  const [tasks, setTasks] = useState<ApiTask[]>(() => cachedTasks(activeProfile.id) ?? []);
  const [availability, setAvailability] = useState<MemberAvailability[]>(
    () => cachedAvailability(activeProfile.id) ?? [],
  );
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDay, setNewTaskDay] = useState<'Today' | 'Tomorrow'>('Today');
  const [heroAssignedId, setHeroAssignedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(
    () => !(cachedTasks(activeProfile.id) && cachedAvailability(activeProfile.id)),
  );
  const [error, setError] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const activeProfileUuid = PROFILE_UUIDS[activeProfile.id];
  const activeProfileName = activeProfile.displayName;

  // Load real tasks and availability
  const loadTasksData = useCallback(async () => {
    const hasCurrentData = Boolean(
      cachedTasks(activeProfile.id) && cachedAvailability(activeProfile.id),
    );
    setLoading(!hasCurrentData);
    setError(null);
    try {
      const [fetchedTasks, fetchedAvail] = await Promise.all([
        listTasks(activeProfile.id),
        listAvailability(activeProfile.id),
      ]);
      setTasks(fetchedTasks);
      setAvailability(fetchedAvail);
    } catch {
      setError(
        'CareLoop could not load tasks. Check your connection and refresh the page to try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [activeProfile.id]);

  useEffect(() => {
    let cancelled = false;
    let taskSub: ReturnType<typeof subscribeToTasks> = null;
    const currentTasks = cachedTasks(activeProfile.id);
    const currentAvailability = cachedAvailability(activeProfile.id);
    const hasCurrentData = Boolean(currentTasks && currentAvailability);
    setTasks(currentTasks ?? []);
    setAvailability(currentAvailability ?? []);
    setHeroAssignedId(null);
    if (authStatus !== 'authenticated') {
      setLoading(authStatus === 'loading' && !hasCurrentData);
      return;
    }
    void loadTasksData().then(() => {
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

    const dueAt =
      newTaskDay === 'Today'
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

  const rahulIsAvailableFor = (task: ApiTask) =>
    availability.find((slot) => {
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
        <h1
          style={{
            margin: '0 0 0.5rem 0',
            fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
            fontWeight: 900,
          }}
        >
          Care Tasks
        </h1>
        <p style={{ margin: 0, color: 'var(--care-muted)', fontSize: '1rem' }}>
          Clear family coordination without the group-chat scramble.
        </p>
      </header>

      {loading && (
        <p className="timeline-ghost-hint" role="status">
          Loading real Care Circle tasks…
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {/* Task controls */}
      <div className="task-toolbar">
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
        <motion.button
          type="button"
          className="task-fab"
          whileHover={{ scale: 1.02, translateY: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsAddingTask((prev) => !prev)}
          aria-expanded={isAddingTask}
        >
          <Plus size={20} strokeWidth={2.5} aria-hidden="true" />
          <span>Add a task</span>
        </motion.button>
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
          todayTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              dueLabel={
                task.due_at
                  ? new Date(task.due_at).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'Today'
              }
              saving={savingTaskId === task.id}
              rahulSlot={rahulIsAvailableFor(task)}
              rahulAssigned={heroAssignedId === task.id}
              onToggle={(item) => void toggleTaskDone(item)}
              onAskRahul={(taskId) => void handleAskRahul(taskId)}
            />
          ))
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
          tomorrowTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              dueLabel="Tomorrow"
              saving={savingTaskId === task.id}
              rahulSlot={rahulIsAvailableFor(task)}
              rahulAssigned={heroAssignedId === task.id}
              onToggle={(item) => void toggleTaskDone(item)}
              onAskRahul={(taskId) => void handleAskRahul(taskId)}
            />
          ))
        )}
      </motion.section>
    </div>
  );
}

export default TasksPage;
