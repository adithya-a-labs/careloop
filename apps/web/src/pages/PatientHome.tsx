import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BookHeart, CalendarDays, ChevronRight, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusCard from '../components/cards/StatusCard';
import { useDemoProfile } from '../features/demo/DemoContext';
import { cachedCareEvents, cachedHandoffContext, DEMO_CIRCLE_ID, getHandoffContext, listCareEvents, type CareEvent, type HandoffContext } from '../lib/api';
import { removeRealtimeChannel, subscribeToCareEvents } from '../lib/supabase';

export function PatientHomePage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { activeProfile, authStatus } = useDemoProfile();
  const [events, setEvents] = useState<CareEvent[]>(() => cachedCareEvents(activeProfile.id) ?? []);
  const [handoff, setHandoff] = useState<HandoffContext | null>(() => cachedHandoffContext(activeProfile.id) ?? null);
  const [loading, setLoading] = useState(() => !(cachedCareEvents(activeProfile.id) && cachedHandoffContext(activeProfile.id)));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof subscribeToCareEvents> = null;
    const currentEvents = cachedCareEvents(activeProfile.id);
    const currentHandoff = cachedHandoffContext(activeProfile.id);
    setEvents(currentEvents ?? []);
    setHandoff(currentHandoff ?? null);
    setLoading(!(currentEvents && currentHandoff));
    setError(null);

    if (authStatus !== 'authenticated') {
      setLoading(authStatus === 'loading' && !(currentEvents && currentHandoff));
      return;
    }

    Promise.all([listCareEvents(activeProfile.id), getHandoffContext(activeProfile.id)])
      .then(([nextEvents, nextHandoff]) => {
        if (cancelled) return;
        setEvents(nextEvents);
        setHandoff(nextHandoff);
        channel = subscribeToCareEvents(DEMO_CIRCLE_ID, (row, deleted) => {
          if (cancelled) return;
          const inserted = row as unknown as CareEvent;
          setEvents((current) => deleted
            ? current.filter((event) => event.id !== inserted.id)
            : [inserted, ...current.filter((event) => event.id !== inserted.id)]);
        });
      })
      .catch(() => {
        if (!cancelled) setError('CareLoop could not load today’s care. Check your connection and refresh the page to try again.');
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

      <section className="patient-today-section">
        <div className="section-header"><h2>Today and coming up</h2><CalendarDays size={20} aria-hidden="true" /></div>
        <div className="cards-list">
          {handoff?.upcoming.slice(0, 3).map((item) => (
            <article className="patient-today-card" key={item.id}>
              <strong>{item.title}</strong>
              <p>{new Date(item.starts_at).toLocaleString([], { hour: 'numeric', minute: '2-digit', weekday: 'short' })}</p>
            </article>
          ))}
          {!loading && handoff?.upcoming.length === 0 && (
            <p className="timeline-ghost-hint">Nothing else is scheduled right now.</p>
          )}
        </div>
      </section>

      <section className="care-context-section">
        <div className="section-header">
          <h2 className="section-title">Latest shared care</h2>
          <button type="button" className="section-see-all touch-target" onClick={() => navigate('/timeline')}>
            See all <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="cards-list">
          {loading && <p className="timeline-ghost-hint" role="status">Loading shared updates…</p>}
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
          <button type="button" className="quick-action-card" onClick={() => navigate('/memories')}>
            <div className="quick-action-icon-wrap"><BookHeart size={22} aria-hidden="true" /></div>
            <div><div className="quick-action-title">MemoryBox</div><div className="quick-action-desc">Listen to stories or share a memory</div></div>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>
    </motion.div>
  );
}

export default PatientHomePage;
