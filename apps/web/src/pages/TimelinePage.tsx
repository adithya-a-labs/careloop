import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useDemoProfile } from '../features/demo/DemoContext';
import { DEMO_CIRCLE_ID, listCareEvents, type CareEvent } from '../lib/api';
import type { TimelineEvent } from '../lib/mock-data';
import {
  ensureDemoSession,
  removeRealtimeChannel,
  subscribeToCareEvents,
} from '../lib/supabase';

const PROFILE_NAMES: Record<string, string> = {
  '10000000-0000-0000-0000-000000000001': 'Amma',
  '10000000-0000-0000-0000-000000000002': 'Maya',
  '10000000-0000-0000-0000-000000000003': 'Rahul',
  '10000000-0000-0000-0000-000000000004': 'Nurse Anu',
};

const EVENT_EMOJI: Record<string, string> = {
  sleep: '😴',
  meal: '🍽️',
  mood: '💛',
  medication: '💊',
  activity: '🚶',
  symptom: '📝',
  appointment: '📅',
  visit: '👩‍⚕️',
  check_in: '🗣️',
};

function toTimelineEvent(event: CareEvent): TimelineEvent {
  const subject = PROFILE_NAMES[event.subject_id] ?? 'Care recipient';
  const reporter = PROFILE_NAMES[event.reported_by] ?? 'Care Circle member';
  const occurredAt = new Date(event.occurred_at);
  const isRecent = Date.now() - new Date(event.created_at).getTime() < 5 * 60 * 1000;
  const eventLabel = event.event_type.replaceAll('_', ' ');

  return {
    id: event.id,
    emoji: EVENT_EMOJI[event.event_type] ?? '💬',
    title: `${subject} shared a ${eventLabel} update`,
    description: event.raw_transcript
      ? `“${event.raw_transcript}”`
      : Object.values(event.event_data).map(String).join(' · '),
    time: occurredAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    relativeTime: isRecent ? 'Just shared' : 'Shared update',
    reporter: event.source === 'voice' ? `${reporter} (Voice)` : reporter,
    concernsPerson: subject,
    kind:
      event.source === 'voice'
        ? 'voice'
        : event.event_type === 'meal' || event.event_type === 'medication'
          ? event.event_type
          : 'check-in',
  };
}

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
  const { activeProfile } = useDemoProfile();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    let channel: ReturnType<typeof subscribeToCareEvents> = null;
    ensureDemoSession(activeProfile.id)
      .then(() => listCareEvents(activeProfile.id))
      .then((careEvents) => {
        if (cancelled) return;
        setEvents(careEvents.map(toTimelineEvent));
        channel = subscribeToCareEvents(DEMO_CIRCLE_ID, (row) => {
          const inserted = row as unknown as CareEvent;
          setEvents((current) => {
            if (current.some((event) => event.id === inserted.id)) return current;
            return [toTimelineEvent(inserted), ...current];
          });
        });
      })
      .catch(() => {
        if (!cancelled) setErrorMessage('CareLoop could not load the shared timeline.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      void removeRealtimeChannel(channel);
    };
  }, [activeProfile.id]);

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
        {/* Shared-backend status card; realtime transport is a later upgrade. */}
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
                <span>Shared Care Circle timeline</span>
              </div>
            </div>
            <p className="timeline-ghost-hint">
              Updates, notes, and check-ins are loaded from the shared backend for every member.
            </p>
          </div>
        </motion.div>

        {isLoading && <p className="timeline-ghost-hint">Loading shared updates…</p>}
        {errorMessage && (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        )}
        {!isLoading && !errorMessage && events.length === 0 && (
          <p className="timeline-ghost-hint">No Care Circle updates have been shared yet.</p>
        )}

        {/* Backend-derived timeline events */}
        <AnimatePresence initial={false}>
          {events.map((event) => {
            const isUpcoming = Boolean(event.isUpcoming);
            const isJustAdded = event.kind === 'voice' && event.relativeTime === 'Just shared';

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
