import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Plus, Check, Clock, AlertCircle } from 'lucide-react';
import { TASKS, type DemoTask } from '../lib/mock-data';
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
  const [tasks, setTasks] = useState<DemoTask[]>(TASKS);
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDay, setNewTaskDay] = useState<'Today' | 'Tomorrow'>('Today');

  // Safely attempt to read active demo profile
  let activeProfileName = 'Amma';
  try {
    const demoCtx = useDemoProfile();
    if (demoCtx?.activeProfile?.displayName) {
      activeProfileName = demoCtx.activeProfile.displayName;
    }
  } catch {
    // Context might be optional in tests
  }

  const toggleTaskDone = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const isDone = t.status === 'done';
          return {
            ...t,
            status: isDone ? 'open' : 'done',
            dueLabel: isDone ? (t.dueLabel === 'Completed' ? 'Today' : t.dueLabel) : 'Completed',
          };
        }
        return t;
      })
    );
  };

  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: DemoTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      emoji: '📋',
      status: 'open',
      dueLabel: newTaskDay === 'Today' ? 'Today, upcoming' : 'Tomorrow',
      assignee: undefined,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'My Tasks') {
      return (
        task.assignee?.toLowerCase() === activeProfileName.toLowerCase() ||
        (!task.assignee && activeProfileName.toLowerCase() === 'amma')
      );
    }
    if (activeTab === 'Assigned') return Boolean(task.assignee);
    if (activeTab === 'Done') return task.status === 'done';
    return true;
  });

  const isTomorrow = (task: DemoTask) =>
    task.dueLabel.toLowerCase().includes('tomorrow');

  const todayTasks = filteredTasks.filter((t) => !isTomorrow(t));
  const tomorrowTasks = filteredTasks.filter((t) => isTomorrow(t));

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
          <input
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
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
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
            const isDone = task.status === 'done';
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
                  onClick={() => toggleTaskDone(task.id)}
                  aria-label={isDone ? 'Mark task as not done' : 'Mark task as done'}
                  className={`task-checkbox-btn ${isDone ? 'done' : ''}`}
                  style={{
                    width: '30px',
                    height: '30px',
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
                    {task.emoji}
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
                    {task.assignee ? (
                      <span style={{ color: 'var(--care-muted)', fontWeight: 600 }}>
                        {task.assignee}
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
                    color: task.isUrgent ? 'var(--care-coral)' : 'var(--care-muted)',
                    backgroundColor: task.isUrgent ? 'rgba(255, 126, 126, 0.12)' : 'rgba(234, 223, 206, 0.35)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '999px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {task.isUrgent ? (
                    <AlertCircle size={13} style={{ color: 'var(--care-coral)' }} />
                  ) : (
                    <Clock size={13} />
                  )}
                  <span>{task.dueLabel}</span>
                </div>
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
            const isDone = task.status === 'done';
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
                  onClick={() => toggleTaskDone(task.id)}
                  aria-label={isDone ? 'Mark task as not done' : 'Mark task as done'}
                  className={`task-checkbox-btn ${isDone ? 'done' : ''}`}
                  style={{
                    width: '30px',
                    height: '30px',
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
                    {task.emoji}
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
                    {task.assignee ? (
                      <span style={{ color: 'var(--care-muted)', fontWeight: 600 }}>
                        {task.assignee}
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
                    color: task.isUrgent ? 'var(--care-coral)' : 'var(--care-muted)',
                    backgroundColor: task.isUrgent ? 'rgba(255, 126, 126, 0.12)' : 'rgba(234, 223, 206, 0.35)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '999px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {task.isUrgent ? (
                    <AlertCircle size={13} style={{ color: 'var(--care-coral)' }} />
                  ) : (
                    <Clock size={13} />
                  )}
                  <span>{task.dueLabel}</span>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.section>

      {/* Floating '+ Add a task' button at bottom */}
      <motion.button
        type="button"
        className="task-floating-btn"
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
