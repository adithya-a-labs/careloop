import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Clock, Sparkles, PlusCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { TIMELINE_EVENTS, type TimelineEvent } from '../lib/mock-data';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: 'easeOut',
    },
  },
};

export function TimelinePage() {
  const location = useLocation();
  const [events, setEvents] = useState<TimelineEvent[]>(TIMELINE_EVENTS);
  const [hasAddedVoiceEvent, setHasAddedVoiceEvent] = useState(false);

  // Auto-add voice event if navigated from voice page
  useEffect(() => {
    if (location.state?.newVoiceEvent && !hasAddedVoiceEvent) {
      addSimulatedVoiceEvent();
    }
  }, [location.state, hasAddedVoiceEvent]);

  const addSimulatedVoiceEvent = () => {
    if (hasAddedVoiceEvent) return;
    const newEvent: TimelineEvent = {
      id: `tl-voice-${Date.now()}`,
      emoji: '🗣️',
      title: 'Amma voice check-in processed',
      description: '"I didn\'t sleep very well and I didn\'t eat much at lunch."',
      time: 'Just now',
      relativeTime: 'Live update',
      reporter: 'Amma (Voice)',
      concernsPerson: 'Amma',
      kind: 'voice',
    };
    setEvents((prev) => [newEvent, ...prev]);
    setHasAddedVoiceEvent(true);
  };

  return (
    <main className="timeline-page">
      <header className="timeline-header">
        <p className="eyebrow">One shared story</p>
        <h1>Care Timeline</h1>
        <p className="timeline-subtitle">
          <Clock size={16} aria-hidden="true" />
          <span>Today · 19 Sep 2026</span>
        </p>
      </header>

      <motion.div
        className="timeline-list"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Ghost preview card for realtime event stream */}
        <motion.div
          className="timeline-item timeline-ghost"
          variants={itemVariants}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <span className="timeline-dot" aria-hidden="true" />
          <div className="timeline-content">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div className="timeline-ghost-badge">
                <Clock size={15} aria-hidden="true" />
                <span>New events will appear here in real time</span>
              </div>
              {!hasAddedVoiceEvent && (
                <button
                  type="button"
                  onClick={addSimulatedVoiceEvent}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'var(--care-cream)',
                    border: '1px solid var(--care-sun)',
                    borderRadius: '999px',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    color: 'var(--care-ink)',
                  }}
                >
                  <Sparkles size={13} color="var(--care-peach)" />
                  <span>Simulate voice event</span>
                </button>
              )}
            </div>
            <p className="timeline-ghost-hint">
              Updates, notes, and check-ins from family appear here as they happen.
            </p>
          </div>
        </motion.div>

        {/* Real timeline events */}
        <AnimatePresence initial={false}>
          {events.map((event) => {
            const isUpcoming = Boolean(event.isUpcoming);
            const isJustAdded = event.id.startsWith('tl-voice-');

            return (
              <motion.article
                key={event.id}
                className={`timeline-item ${isUpcoming ? 'timeline-upcoming' : ''}`}
                variants={itemVariants}
                initial={isJustAdded ? { opacity: 0, y: 25, scale: 0.96 } : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={
                  isJustAdded
                    ? {
                        border: '2px solid var(--care-coral)',
                        boxShadow: '0 6px 20px rgba(255, 126, 126, 0.18)',
                        backgroundColor: '#FFF8F0',
                      }
                    : undefined
                }
              >
                <span
                  className="timeline-dot"
                  aria-hidden="true"
                  style={isJustAdded ? { backgroundColor: 'var(--care-coral)', boxShadow: '0 0 0 3px rgba(255, 126, 126, 0.3)' } : undefined}
                />
                <div className="timeline-content">
                  <div className="timeline-time">
                    <Clock size={14} aria-hidden="true" />
                    <span>{event.time}</span>
                    {event.relativeTime && (
                      <span className="timeline-relative-time">· {event.relativeTime}</span>
                    )}
                    {isJustAdded && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          background: 'var(--care-coral)',
                          color: '#3c2925',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                        }}
                      >
                        New update
                      </span>
                    )}
                  </div>

                  <h2 className="timeline-title">
                    {event.emoji && (
                      <span className="timeline-emoji" aria-hidden="true">
                        {event.emoji}
                      </span>
                    )}
                    <span>{event.title}</span>
                  </h2>

                  <p className="timeline-desc">{event.description}</p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      marginTop: '0.35rem',
                    }}
                  >
                    {event.concernsPerson && (
                      <span
                        className="timeline-concerns-badge"
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 750,
                          backgroundColor: 'var(--care-cream)',
                          color: 'var(--care-ink)',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid #efd998',
                        }}
                      >
                        Concerns: {event.concernsPerson}
                      </span>
                    )}
                    {event.reporter && (
                      <span
                        className="timeline-reporter"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--care-muted)',
                          fontWeight: 600,
                        }}
                      >
                        Reported by {event.reporter}
                      </span>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
