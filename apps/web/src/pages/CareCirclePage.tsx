import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Plus, Clock, ListChecks, Globe, Copy, Check } from 'lucide-react';
import { useDemoProfile } from '../features/demo/DemoContext';
import {
  listCircleMembers,
  listAvailability,
  listTasks,
  DEMO_CIRCLE_ID,
  PROFILE_UUIDS,
  type CircleMember as ApiCircleMember,
  type MemberAvailability,
  type ApiTask,
} from '../lib/api';
import { CIRCLE_MEMBERS, type CircleMember } from '../lib/mock-data';

const MEMBER_EMOJIS: Record<string, string> = {
  Amma: '👵',
  Maya: '👩',
  Rahul: '👨',
  Anu: '👩‍⚕️',
};

const containerVariants: Variants = {
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
    transition: { duration: 0.28, ease: 'easeOut' },
  },
};

export function CareCirclePage() {
  const { activeProfile } = useDemoProfile();
  const [members, setMembers] = useState<ApiCircleMember[]>([]);
  const [availability, setAvailability] = useState<MemberAvailability[]>([]);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('family');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listCircleMembers(activeProfile.id).catch(() => []),
      listAvailability(activeProfile.id).catch(() => []),
      listTasks(activeProfile.id).catch(() => []),
    ])
      .then(([m, a, t]) => {
        if (cancelled) return;
        if (m && m.length > 0) {
          setMembers(m);
        } else {
          // Fallback to mock
          const mapped: ApiCircleMember[] = CIRCLE_MEMBERS.map((cm) => ({
            circle_id: DEMO_CIRCLE_ID,
            profile_id: PROFILE_UUIDS[cm.name.toLowerCase() as keyof typeof PROFILE_UUIDS] || cm.id,
            display_name: cm.name,
            role: cm.name === 'Amma' ? 'patient' : cm.name === 'Anu' ? 'caregiver' : 'family',
            relationship: cm.roleLabel,
            preferred_language: cm.name === 'Amma' || cm.name === 'Anu' ? 'ml' : 'en',
            avatar_url: null,
            joined_at: new Date().toISOString(),
          }));
          setMembers(mapped);
        }
        if (a) setAvailability(a);
        if (t) setTasks(t);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProfile.id]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText('AMMA-DEMO');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newMember: ApiCircleMember = {
      circle_id: DEMO_CIRCLE_ID,
      profile_id: `temp-${Date.now()}`,
      display_name: newMemberName.trim(),
      role: newMemberRole as any,
      relationship: newMemberRole === 'family' ? 'Family member' : newMemberRole,
      preferred_language: 'en',
      avatar_url: null,
      joined_at: new Date().toISOString(),
    };

    setMembers((prev) => [...prev, newMember]);
    setNewMemberName('');
    setShowAddModal(false);
  };

  return (
    <div className="circle-page">
      {/* Header */}
      <header style={{ marginBottom: '1.75rem' }}>
        <h1
          style={{
            margin: '0 0 0.4rem 0',
            fontSize: '2.1rem',
            fontWeight: 900,
            color: 'var(--care-ink)',
            letterSpacing: '-0.02em',
          }}
        >
          Our Care Circle
        </h1>
        <p
          style={{
            margin: 0,
            color: 'var(--care-muted)',
            fontSize: '1.05rem',
            lineHeight: 1.5,
          }}
        >
          Your family and care team
        </p>
      </header>

      {/* Circle Members Grid */}
      <motion.div
        className="circle-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {members.map((member) => {
          const emoji = MEMBER_EMOJIS[member.display_name] || '🧡';
          const memberAvail = availability.find((a) => a.profile_id === member.profile_id);
          const memberTaskCount = tasks.filter(
            (t) => t.assigned_to === member.profile_id && t.status !== 'completed' && t.status !== 'done',
          ).length;

          return (
            <motion.div
              key={member.profile_id}
              variants={itemVariants}
              className="circle-member"
              whileHover={{ y: -3, scale: 1.015 }}
              transition={{ duration: 0.2 }}
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
                cursor: 'default',
              }}
            >
              {/* 64px emoji circle with cream background */}
              <div
                className="circle-avatar"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--care-cream)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '2.1rem',
                  marginBottom: '0.85rem',
                  boxShadow: '0 4px 12px rgba(99, 65, 40, 0.06)',
                }}
              >
                <span role="img" aria-label={member.display_name}>
                  {emoji}
                </span>
              </div>

              {/* Name in bold */}
              <strong
                className="circle-member-name"
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--care-ink)',
                  marginBottom: '0.2rem',
                }}
              >
                {member.display_name}
              </strong>

              {/* Role label in muted text */}
              <span
                className="circle-member-role"
                style={{
                  fontSize: '0.88rem',
                  color: 'var(--care-muted)',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                }}
              >
                {member.relationship || member.role}
              </span>

              {/* Info Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                {/* Language */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    color: 'var(--care-ink)',
                    background: 'rgba(255, 203, 86, 0.25)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '999px',
                  }}
                >
                  <Globe size={12} />
                  <span>{member.preferred_language === 'ml' ? 'Malayalam' : 'English'}</span>
                </div>

                {/* Availability if available */}
                {memberAvail?.note && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      fontSize: '0.76rem',
                      color: '#523412',
                      background: 'var(--care-cream)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      border: '1px solid var(--care-sun)',
                    }}
                  >
                    <Clock size={12} />
                    <span>{memberAvail.note}</span>
                  </div>
                )}

                {/* Assigned Tasks */}
                {memberTaskCount > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      fontSize: '0.76rem',
                      color: 'var(--care-success)',
                      background: 'rgba(95, 143, 114, 0.12)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                    }}
                  >
                    <ListChecks size={12} />
                    <span>{memberTaskCount} active task{memberTaskCount > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Dashed 'Add member' card */}
        <motion.button
          type="button"
          variants={itemVariants}
          className="circle-add"
          whileHover={{ y: -3, scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          style={{
            backgroundColor: 'transparent',
            border: '2px dashed var(--care-peach)',
            borderRadius: 'var(--care-radius-lg, 30px)',
            padding: '1.6rem 1.3rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            cursor: 'pointer',
            minHeight: '220px',
            color: 'var(--care-ink)',
            transition: 'background-color 0.2s ease',
          }}
        >
          <div
            className="circle-add-icon"
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'var(--care-cream)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--care-ink)',
              marginBottom: '0.85rem',
            }}
          >
            <Plus size={26} strokeWidth={2.5} />
          </div>
          <strong style={{ fontSize: '1.08rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Add member
          </strong>
          <span style={{ fontSize: '0.85rem', color: 'var(--care-muted)', fontWeight: 600 }}>
            Invite family or caregiver
          </span>
        </motion.button>
      </motion.div>

      {/* Quick Invite Modal / Drawer */}
      <AnimatePresence>
        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(61, 48, 43, 0.45)',
              backdropFilter: 'blur(4px)',
              display: 'grid',
              placeItems: 'center',
              padding: '1.5rem',
              zIndex: 50,
            }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--care-surface)',
                border: '1.5px solid var(--care-border)',
                borderRadius: 'var(--care-radius-lg, 30px)',
                padding: '1.8rem',
                maxWidth: '460px',
                width: '100%',
                boxShadow: 'var(--care-shadow)',
              }}
            >
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 900 }}>
                Invite to Care Circle
              </h2>
              <p style={{ margin: '0 0 1.25rem 0', color: 'var(--care-muted)', fontSize: '0.92rem' }}>
                Share your Care Circle code or directly add a new family member.
              </p>

              {/* Share code box */}
              <div
                style={{
                  background: 'var(--care-cream)',
                  border: '1px solid var(--care-sun)',
                  borderRadius: 'var(--care-radius-md, 20px)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.4rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9b4e3f' }}>
                    Family Invite Code
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.15em', color: 'var(--care-ink)' }}>
                    AMMA-DEMO
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    background: 'var(--care-surface)',
                    border: '1px solid var(--care-border)',
                    padding: '0.55rem 0.95rem',
                    borderRadius: '999px',
                    fontWeight: 750,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    color: 'var(--care-ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {copiedCode ? <Check size={14} color="var(--care-success)" /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Add form */}
              <form onSubmit={handleAddMember} style={{ display: 'grid', gap: '0.9rem' }}>
                <div>
                  <label
                    htmlFor="memberNameInput"
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      fontWeight: 750,
                      color: 'var(--care-ink)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Member name
                  </label>
                  <input
                    id="memberNameInput"
                    type="text"
                    placeholder="e.g. Dr. Menon, Aunt Geeta"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      borderRadius: '14px',
                      border: '1.5px solid var(--care-border)',
                      background: 'white',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="memberRoleSelect"
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      fontWeight: 750,
                      color: 'var(--care-ink)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Role in care
                  </label>
                  <select
                    id="memberRoleSelect"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      borderRadius: '14px',
                      border: '1.5px solid var(--care-border)',
                      background: 'white',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="family">Family member</option>
                    <option value="caregiver">Caregiver</option>
                    <option value="coordinator">Coordinator</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      padding: '0.65rem 1.1rem',
                      borderRadius: '999px',
                      border: '1px solid var(--care-border)',
                      background: 'transparent',
                      color: 'var(--care-muted)',
                      fontWeight: 750,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '0.65rem 1.4rem',
                      borderRadius: '999px',
                      border: 'none',
                      background: 'var(--care-coral)',
                      color: '#3c2925',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 6px 16px rgba(255, 126, 126, 0.28)',
                    }}
                  >
                    Add member
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CareCirclePage;
