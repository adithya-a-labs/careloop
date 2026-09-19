import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckSquare, ChevronRight, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusCard from '../components/cards/StatusCard';
import { useDemoProfile } from '../features/demo/DemoContext';
import { DEMO_CIRCLE_ID, listCareEvents, type CareEvent } from '../lib/api';
import { removeRealtimeChannel, subscribeToCareEvents } from '../lib/supabase';

export function PatientHomePage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { activeProfile, authStatus } = useDemoProfile();
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof subscribeToCareEvents> = null;
    setEvents([]);
    setLoading(true);
    setError(null);

    if (authStatus !== 'authenticated') {
      setLoading(authStatus === 'loading');
      return;
    }

    listCareEvents(activeProfile.id)
      .then((nextEvents) => {
        if (cancelled) return;
        setEvents(nextEvents);
        channel = subscribeToCareEvents(DEMO_CIRCLE_ID, (row) => {
          const inserted = row as unknown as CareEvent;
          setEvents((current) => [inserted, ...current.filter((event) => event.id !== inserted.id)]);
        });
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'CareLoop could not load today’s care.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      void removeRealtimeChannel(channel);
    };
  }, [activeProfile.id, authStatus]);

  return (
    <motion.div className="patient-home" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="greeting-section">
        <div className="greeting-avatar-row">
          <span className="greeting-avatar-emoji" role="img" aria-label={activeProfile.displayName}>
            {activeProfile.emoji}
          </span>
          <span className="greeting-avatar-label">{activeProfile.roleLabel || 'Care recipient'}</span>
          <span className="profile-language-pill">🗣️ {activeProfile.preferredLanguage ?? 'English'}</span>
        </div>
        <h1 className="greeting-title">Good morning, {activeProfile.displayName}!</h1>
        <div className="wellbeing-banner">
          Share how today is going. Your confirmed update will appear for the whole Care Circle.
        </div>
      </section>

      <motion.section className="voice-hero" initial={{ y: 10 }} animate={{ y: 0 }}>
        <h2 className="voice-hero-title">How are you today?</h2>
        <p className="voice-hero-subtitle">Tap and just talk</p>
        <motion.button
          type="button"
          className="voice-orb-button"
          aria-label="Start talking to CareLoop"
          onClick={() => navigate('/voice')}
          animate={reduceMotion ? undefined : { scale: [1, 1.045, 1] }}
          transition={reduceMotion ? undefined : { repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        >
          <Mic size={48} strokeWidth={2.4} color="#3c2925" aria-hidden="true" />
        </motion.button>
      </motion.section>

      <section className="care-context-section">
        <div className="section-header">
          <h2 className="section-title">Latest shared care</h2>
          <button type="button" className="section-see-all touch-target" onClick={() => navigate('/timeline')}>
            See all <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="cards-list">
          {loading && <p className="timeline-ghost-hint">Loading shared updates…</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {!loading && !error && events.length === 0 && (
            <p className="timeline-ghost-hint">No care updates have been shared yet.</p>
          )}
          {events.slice(0, 3).map((event) => (
            <StatusCard
              key={event.id}
              id={event.id}
              emoji={event.event_type === 'meal' ? '🍽️' : event.event_type === 'visit' ? '👩‍⚕️' : '💬'}
              title={event.event_type.replaceAll('_', ' ')}
              subtitle={event.raw_transcript ?? Object.values(event.event_data).map(String).join(' · ')}
              tone={event.event_type === 'visit' ? 'success' : 'cream'}
              time={new Date(event.occurred_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              onClick={() => navigate('/timeline')}
            />
          ))}
        </div>
      </section>

      <section className="quick-actions-section">
        <div className="quick-actions-grid">
          <button type="button" className="quick-action-card" onClick={() => navigate('/voice')}>
            <div className="quick-action-icon-wrap"><Mic size={22} aria-hidden="true" /></div>
            <div><div className="quick-action-title">Talk to CareLoop</div><div className="quick-action-desc">Voice check-in and updates</div></div>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className="quick-action-card" onClick={() => navigate('/tasks')}>
            <div className="quick-action-icon-wrap"><CheckSquare size={22} aria-hidden="true" /></div>
            <div><div className="quick-action-title">Today&apos;s tasks</div><div className="quick-action-desc">View shared responsibilities</div></div>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>
    </motion.div>
  );
}

export default PatientHomePage;
