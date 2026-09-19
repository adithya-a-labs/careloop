import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertCircle, Clock, ChevronRight, CheckCircle2, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemoProfile } from '../features/demo/DemoContext';
import { ATTENTION_ITEMS, SINCE_LAST_VISIT, UPCOMING_CARE, TASKS } from '../lib/mock-data';

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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

const catchUpListVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const catchUpItemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

export function FamilyHomePage() {
  const navigate = useNavigate();
  const [showCatchUp, setShowCatchUp] = useState(false);

  // Safe fallback if activeProfile is undefined or patient view
  const demo = useDemoProfile();
  const activeProfile = demo?.activeProfile;
  const displayName = activeProfile?.isPatient ? 'Maya' : (activeProfile?.displayName || 'Maya');

  const [taskList, setTaskList] = useState(TASKS);

  // Filter first 3 upcoming non-done tasks
  const upcomingTasks = taskList.filter((task) => task.status !== 'done').slice(0, 3);

  const handleClaimTask = (taskId: string) => {
    setTaskList((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assignee: displayName } : t))
    );
  };

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
          <p className="catch-up-body">4 updates since you last checked</p>

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

        {/* AnimatePresence staggered list of SINCE_LAST_VISIT items */}
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
              <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9b4e3f', marginBottom: '0.6rem' }}>
                Since your last visit
              </div>
              <motion.div
                className="catch-up-items-list"
                variants={catchUpListVariants}
                initial="hidden"
                animate="show"
              >
                {SINCE_LAST_VISIT.map((item) => (
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
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* 3. Needs Attention Section */}
      <motion.section className="attention-section" variants={itemVariants}>
        <div className="section-header">
          <div className="section-title-wrap">
            <h2>Needs attention</h2>
            <span className="coral-count-badge">3 things need attention</span>
          </div>
        </div>

        <div className="attention-cards-list">
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
          {upcomingTasks.map((task) => (
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
                {task.emoji}
              </span>
              <div className="task-body">
                <strong className="task-title">{task.title}</strong>
                <div className="task-meta">
                  <span
                    className={`task-assignee-pill ${
                      !task.assignee ? 'assignee-needed' : 'assignee-assigned'
                    }`}
                  >
                    {task.assignee ? task.assignee : 'Needs someone'}
                  </span>
                  {!task.assignee && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaimTask(task.id);
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
                      I&apos;ll take this
                    </button>
                  )}
                  <span className="task-meta-dot">•</span>
                  <span className="task-due-info">
                    <Clock size={13} className="meta-clock-icon" />
                    <span>{task.dueLabel}</span>
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="task-chevron" />
            </div>
          ))}
        </div>
      </motion.section>

      {/* 5. Upcoming Care Section */}
      <motion.section className="upcoming-care-section" variants={itemVariants}>
        <div className="section-header">
          <h2>Upcoming care</h2>
        </div>

        <div className="upcoming-care-list">
          {UPCOMING_CARE.map((care) => (
            <div key={care.id} className="upcoming-care-card">
              <span className="care-emoji" role="img" aria-hidden="true">
                {care.emoji}
              </span>
              <div className="care-body">
                <strong className="care-title">{care.title}</strong>
                <p className="care-subtitle">{care.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
