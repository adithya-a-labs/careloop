import React, { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mic, ChevronRight, CheckSquare } from 'lucide-react';
import { useDemoProfile } from '../features/demo/DemoContext';
import { CARE_CONTEXT_CARDS, WELLBEING_STATUS } from '../lib/mock-data';
import { listCareEvents } from '../lib/api';
import StatusCard from '../components/cards/StatusCard';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const cardListVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: 'easeOut',
    },
  },
};

const greetingVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export function PatientHomePage() {
  const navigate = useNavigate();
  const { activeProfile } = useDemoProfile();
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [contextCards, setContextCards] = useState(CARE_CONTEXT_CARDS);

  useEffect(() => {
    let cancelled = false;
    listCareEvents(activeProfile.id)
      .then((events) => {
        if (cancelled || !events || events.length === 0) return;
          const derived = [...CARE_CONTEXT_CARDS];
          const lunchEvent = events.find((e) => e.event_type === 'meal');
          if (lunchEvent) {
            const idx = derived.findIndex((c) => c.id === 'lunch');
            if (idx !== -1) {
              derived[idx] = {
                ...derived[idx],
                subtitle: lunchEvent.raw_transcript || 'Ate a little less',
                time: new Date(lunchEvent.occurred_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
              };
            }
          }
          const nurseEvent = events.find((e) => e.event_type === 'visit');
          if (nurseEvent) {
            const idx = derived.findIndex((c) => c.id === 'anu-visit');
            if (idx !== -1) {
              derived[idx] = {
                ...derived[idx],
                subtitle: 'Completed',
                time: new Date(nurseEvent.occurred_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
              };
            }
          }
          setContextCards(derived);
        })
        .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeProfile.id]);

  return (
    <motion.div
      className="patient-home"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 1. Greeting section */}
      <motion.section className="greeting-section" variants={greetingVariants}>
        <div className="greeting-avatar-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="greeting-avatar-emoji" role="img" aria-label={activeProfile.displayName}>
            {activeProfile.emoji}
          </span>
          <span className="greeting-avatar-label">
            {activeProfile.roleLabel || 'Care recipient'}
          </span>
          {activeProfile.preferredLanguage && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--care-ink)',
                fontWeight: 750,
                backgroundColor: 'var(--care-cream)',
                borderRadius: '999px',
                padding: '0.2rem 0.65rem',
                border: '1px solid #efd998',
              }}
            >
              🗣️ {activeProfile.preferredLanguage}
            </span>
          )}
        </div>

        <h1 className="greeting-title">
          Good morning, {activeProfile.displayName}! 🌤️
        </h1>

        <div className="wellbeing-banner">
          <span className="wellbeing-banner-icon" role="img" aria-label="Sun">
            ☀️
          </span>
          <span>
            You're doing well today! A little tired, but in good spirits.
          </span>
        </div>
      </motion.section>

      {/* 2. Wellbeing mini-status row */}
      <motion.div className="wellbeing-row" variants={cardListVariants}>
        {WELLBEING_STATUS.map((item) => (
          <motion.div
            key={item.label}
            className="wellbeing-pill"
            variants={itemVariants}
            whileHover={{ scale: 1.02, translateY: -2 }}
            transition={{ duration: 0.18 }}
          >
            <div className="wellbeing-pill-emoji">
              <span role="img" aria-label={item.label}>
                {item.emoji}
              </span>
            </div>
            <div className="wellbeing-pill-content">
              <span className="wellbeing-pill-label">{item.label}</span>
              <span className="wellbeing-pill-value">{item.value}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* 3. Voice CTA hero */}
      <motion.section className="voice-hero" variants={itemVariants}>
        <h2 className="voice-hero-title">How are you today?</h2>
        <p className="voice-hero-subtitle">Tap and just talk</p>

        <motion.button
          type="button"
          className="voice-orb-button"
          aria-label="Start talking to CareLoop"
          onClick={() => navigate('/voice')}
          animate={{
            scale: [1, 1.045, 1],
            boxShadow: [
              '0 0 0 10px rgba(255, 203, 86, 0.28), 0 16px 36px rgba(255, 126, 126, 0.35)',
              '0 0 0 18px rgba(255, 203, 86, 0.45), 0 20px 44px rgba(255, 126, 126, 0.5)',
              '0 0 0 10px rgba(255, 203, 86, 0.28), 0 16px 36px rgba(255, 126, 126, 0.35)',
            ],
          }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: 'easeInOut',
          }}
          whileHover={{
            scale: 1.08,
            boxShadow: '0 0 0 22px rgba(255, 203, 86, 0.55), 0 24px 48px rgba(255, 126, 126, 0.6)',
          }}
          whileTap={{ scale: 0.94 }}
        >
          <Mic size={48} strokeWidth={2.4} color="#3c2925" />
        </motion.button>
      </motion.section>

      {/* 4. Today's care context */}
      <motion.section className="care-context-section" variants={itemVariants}>
        <div className="section-header">
          <h2 className="section-title">Today's care</h2>
          <button
            type="button"
            className="section-see-all"
            onClick={() => navigate('/timeline')}
          >
            <span>See all</span>
            <ChevronRight size={16} />
          </button>
        </div>

        <motion.div className="cards-list" variants={cardListVariants}>
          {contextCards.map((card) => (
            <motion.div key={card.id} variants={itemVariants}>
              <StatusCard
                id={card.id}
                emoji={card.emoji}
                title={card.title}
                subtitle={card.subtitle}
                tone={card.tone}
                time={card.time}
                onClick={() => navigate('/timeline')}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* 5. Quick actions grid */}
      <motion.section className="quick-actions-section" variants={itemVariants}>
        <div className="quick-actions-grid">
          <motion.div
            className="quick-action-card"
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/voice')}
            onMouseEnter={() => setHoveredAction('voice')}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <div
              className="quick-action-icon-wrap"
              style={{ backgroundColor: 'var(--care-cream)', color: '#b45345' }}
            >
              <Mic size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="quick-action-title">Talk to CareLoop</div>
              <div className="quick-action-desc">Voice check-in & updates</div>
            </div>
            <ChevronRight
              size={18}
              style={{
                color: hoveredAction === 'voice' ? 'var(--care-ink)' : 'var(--care-muted)',
                transform: hoveredAction === 'voice' ? 'translateX(2px)' : 'none',
                transition: 'transform 0.2s, color 0.2s',
              }}
            />
          </motion.div>

          <motion.div
            className="quick-action-card"
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/tasks')}
            onMouseEnter={() => setHoveredAction('tasks')}
            onMouseLeave={() => setHoveredAction(null)}
          >
            <div
              className="quick-action-icon-wrap"
              style={{ backgroundColor: 'var(--care-cream)', color: '#b45345' }}
            >
              <CheckSquare size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="quick-action-title">Today's tasks</div>
              <div className="quick-action-desc">View care schedule</div>
            </div>
            <ChevronRight
              size={18}
              style={{
                color: hoveredAction === 'tasks' ? 'var(--care-ink)' : 'var(--care-muted)',
                transform: hoveredAction === 'tasks' ? 'translateX(2px)' : 'none',
                transition: 'transform 0.2s, color 0.2s',
              }}
            />
          </motion.div>
        </div>
      </motion.section>
    </motion.div>
  );
}

export default PatientHomePage;
