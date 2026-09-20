import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Globe, ListChecks } from 'lucide-react';
import { useDemoProfile } from '../features/demo/DemoContext';
import {
  DEMO_CIRCLE_ID,
  listAvailability,
  listCircleMembers,
  listTasks,
  type ApiTask,
  type CircleMember,
  type MemberAvailability,
} from '../lib/api';
import {
  removeRealtimeChannel,
  subscribeToTasks,
} from '../lib/supabase';

const MEMBER_EMOJIS: Record<string, string> = {
  Amma: '👵',
  Maya: '👩',
  Rahul: '👨',
  Anu: '👩‍⚕️',
};

export function CareCirclePage() {
  const { activeProfile, authStatus } = useDemoProfile();
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [availability, setAvailability] = useState<MemberAvailability[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let taskChannel: ReturnType<typeof subscribeToTasks> = null;

    setMembers([]);
    setAvailability([]);
    setTasks([]);
    setLoading(true);
    setError(null);

    if (authStatus !== 'authenticated') {
      setLoading(authStatus === 'loading');
      return;
    }

    Promise.all([
        listCircleMembers(activeProfile.id),
        listAvailability(activeProfile.id),
        listTasks(activeProfile.id),
      ])
      .then(([nextMembers, nextAvailability, nextTasks]) => {
        if (cancelled) return;
        setMembers(nextMembers);
        setAvailability(nextAvailability);
        setTasks(nextTasks);
        taskChannel = subscribeToTasks(DEMO_CIRCLE_ID, (payload) => {
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as unknown as ApiTask;
            setTasks((current) => current.filter((task) => task.id !== deleted.id));
            return;
          }
          const changed = payload.new as unknown as ApiTask;
          if (!changed.id) return;
          setTasks((current) => [changed, ...current.filter((task) => task.id !== changed.id)]);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError('CareLoop could not load the Care Circle. Check your connection and refresh the page to try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      void removeRealtimeChannel(taskChannel);
    };
  }, [activeProfile.id, authStatus]);

  return (
    <div className="circle-page">
      <header style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: '0 0 0.4rem', fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', fontWeight: 900, color: 'var(--care-ink)' }}>
          Our Care Circle
        </h1>
        <p style={{ margin: 0, color: 'var(--care-muted)', fontSize: '1.05rem' }}>
          Real members, declared availability and current task ownership
        </p>
      </header>

      {loading && <p className="timeline-ghost-hint" role="status">Loading Care Circle…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && members.length === 0 && (
        <p className="timeline-ghost-hint">No active Care Circle members were returned.</p>
      )}

      <motion.div
        className="circle-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}
      >
        {members.map((member) => {
          const slots = availability.filter((slot) => slot.profile_id === member.profile_id);
          const assignedTasks = tasks.filter(
            (task) => task.assigned_to === member.profile_id && !['completed', 'done', 'cancelled'].includes(task.status),
          );
          return (
            <article
              key={member.profile_id}
              className="circle-member"
              style={{
                backgroundColor: 'var(--care-surface)',
                border: '1.5px solid var(--care-border)',
                borderRadius: 'var(--care-radius-lg, 30px)',
                padding: '1.6rem 1.3rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 6px 20px rgba(99, 65, 40, 0.05)',
              }}
            >
              <div className="circle-avatar" aria-hidden="true">{MEMBER_EMOJIS[member.display_name] ?? '🧡'}</div>
              <h2 className="circle-member-name">{member.display_name}</h2>
              <p className="circle-member-role">{member.relationship ?? member.role}</p>
              <div className="circle-member-facts">
                <span><Globe size={14} aria-hidden="true" /> {member.preferred_language === 'ml' ? 'Malayalam' : 'English'}</span>
                {slots.map((slot) => (
                  <span key={slot.id}>
                    <Clock size={14} aria-hidden="true" />
                    {slot.note ?? `${new Date(slot.starts_at).toLocaleString()}–${new Date(slot.ends_at).toLocaleTimeString()}`}
                  </span>
                ))}
                <span><ListChecks size={14} aria-hidden="true" /> {assignedTasks.length} active task{assignedTasks.length === 1 ? '' : 's'}</span>
              </div>
            </article>
          );
        })}
      </motion.div>
    </div>
  );
}

export default CareCirclePage;
