import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Plus, Play, Camera, Pause, Heart, Sparkles, Music } from 'lucide-react';
import { useDemoProfile } from '../features/demo/DemoContext';
import {
  listMemories,
  createMemory,
  DEMO_CIRCLE_ID,
  DEMO_AMMA_ID,
  type ApiMemory,
} from '../lib/api';
import { subscribeToMemories, removeRealtimeChannel } from '../lib/supabase';

type MemoryTab = 'All' | 'Stories' | 'Photos' | 'Voice';

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

export function MemoryBoxPage() {
  const { activeProfile, authStatus } = useDemoProfile();
  const [activeTab, setActiveTab] = useState<MemoryTab>('All');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [memories, setMemories] = useState<ApiMemory[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newKind, setNewKind] = useState<'story' | 'photo' | 'voice'>('story');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load real persisted memories
  useEffect(() => {
    let cancelled = false;
    let memSub: ReturnType<typeof subscribeToMemories> = null;
    setMemories([]);
    setLoading(true);
    setError(null);
    if (authStatus !== 'authenticated') {
      setLoading(authStatus === 'loading');
      return;
    }
    listMemories(activeProfile.id)
      .then((data) => {
        if (cancelled) return;
        setMemories(data);
        memSub = subscribeToMemories(DEMO_CIRCLE_ID, (row) => {
          const newMemory = row as unknown as ApiMemory;
          setMemories((current) => [newMemory, ...current.filter((memory) => memory.id !== newMemory.id)]);
        });
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'CareLoop could not load MemoryBox.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      void removeRealtimeChannel(memSub);
    };
  }, [activeProfile.id, authStatus]);

  const tabs: MemoryTab[] = ['All', 'Stories', 'Photos', 'Voice'];

  const togglePlayStory = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const approxYear = parseInt(newYear.trim(), 10) || new Date().getFullYear();
    setSaving(true);
    setError(null);
    try {
      const created = await createMemory(
        {
          subject_id: DEMO_AMMA_ID,
          title: newTitle.trim(),
          body: newDesc.trim() || null,
          approximate_year: approxYear,
          kind: newKind,
        },
        activeProfile.id,
      );
      setMemories((prev) => [created, ...prev.filter((memory) => memory.id !== created.id)]);
      setNewYear('');
      setNewTitle('');
      setNewDesc('');
      setShowAddModal(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'CareLoop could not save this memory.');
    } finally {
      setSaving(false);
    }
  };

  const filteredMemories = memories.filter((mem) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Stories') return mem.kind === 'story';
    if (activeTab === 'Photos') return mem.kind === 'photo';
    if (activeTab === 'Voice') return mem.kind === 'voice';
    return true;
  });

  return (
    <div className="memory-page">
      {/* Header */}
      <header style={{ marginBottom: '1.5rem' }}>
        <h1
          style={{
            margin: '0 0 0.4rem 0',
            fontSize: '2.1rem',
            fontWeight: 900,
            color: 'var(--care-ink)',
            letterSpacing: '-0.02em',
          }}
        >
          MemoryBox
        </h1>
        <p
          style={{
            margin: 0,
            color: 'var(--care-muted)',
            fontSize: '1.05rem',
            lineHeight: 1.5,
          }}
        >
          Stories, photos and moments
        </p>
      </header>

      {/* Tab row */}
      <div className="memory-tabs" role="tablist" aria-label="Memory filters">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`memory-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{
                backgroundColor: isActive ? 'var(--care-ink)' : 'var(--care-surface)',
                color: isActive ? '#fffdf8' : 'var(--care-muted)',
                border: `1.5px solid ${isActive ? 'var(--care-ink)' : 'var(--care-border)'}`,
                padding: '0.6rem 1.25rem',
                borderRadius: '999px',
                fontWeight: 750,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {loading && <p className="timeline-ghost-hint">Loading real family memories…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!loading && !error && filteredMemories.length === 0 && (
        <p className="timeline-ghost-hint">No memories have been shared yet.</p>
      )}

      {/* Scrapbook Memory Grid with Tape & Rotation motifs */}
      <motion.div
        className="memory-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem',
        }}
      >
        {filteredMemories.map((item, index) => {
          const isEven = index % 2 === 0;
          const rotateDeg = isEven ? -1 : 1;
          const isPlaying = playingId === item.id;

          return (
            <motion.article
              key={item.id}
              variants={itemVariants}
              className="memory-card"
              whileHover={{ y: -5, scale: 1.02, rotate: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                backgroundColor: isEven ? 'var(--care-cream)' : 'var(--care-sun)',
                borderRadius: 'var(--care-radius-lg, 28px)',
                padding: '2rem 1.75rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '260px',
                boxShadow: 'var(--care-shadow, 0 10px 30px rgba(99, 65, 40, 0.08))',
                border: '1px solid rgba(60, 41, 37, 0.08)',
                position: 'relative',
                transform: `rotate(${rotateDeg}deg)`,
              }}
            >
              {/* Scrapbook Tape Strip Motif at top center */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '64px',
                  height: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.65)',
                  border: '1px dashed rgba(60, 41, 37, 0.15)',
                  borderRadius: '3px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  backdropFilter: 'blur(2px)',
                }}
              />

              <div>
                {/* Year in large bold display */}
                <div
                  className="memory-year"
                  style={{
                    fontSize: '2.4rem',
                    fontWeight: 900,
                    color: 'var(--care-ink)',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    marginBottom: '0.65rem',
                  }}
                >
                  {item.approximate_year || 'Cherished'}
                </div>

                {/* Title */}
                <h3
                  className="memory-title"
                  style={{
                    margin: '0 0 0.45rem 0',
                    fontSize: '1.25rem',
                    fontWeight: 850,
                    color: 'var(--care-ink)',
                    lineHeight: 1.25,
                  }}
                >
                  {item.title}
                </h3>

                {/* Description */}
                {item.body && (
                  <p
                    className="memory-desc"
                    style={{
                      margin: '0 0 1.25rem 0',
                      fontSize: '0.96rem',
                      color: 'var(--care-ink)',
                      opacity: 0.85,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.body}
                  </p>
                )}
              </div>

              {/* Play story button with Play icon */}
              <button
                type="button"
                className="memory-play-btn"
                onClick={() => togglePlayStory(item.id)}
                aria-label={`Play story: ${item.title}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  backgroundColor: 'var(--care-surface)',
                  color: 'var(--care-ink)',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  padding: '0.65rem 1.2rem',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(60, 41, 37, 0.1)',
                  transition: 'all 0.2s ease',
                  width: 'fit-content',
                }}
              >
                {isPlaying ? (
                  <>
                    <Pause size={16} fill="var(--care-ink)" />
                    <span>Pause story</span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--care-coral)',
                        marginLeft: '0.2rem',
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Play size={16} fill="var(--care-ink)" />
                    <span>Play story</span>
                  </>
                )}
              </button>
            </motion.article>
          );
        })}

        {/* Dashed 'Add a memory' card */}
        <motion.button
          type="button"
          variants={itemVariants}
          className="memory-add"
          whileHover={{ y: -4, scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          style={{
            backgroundColor: 'var(--care-surface)',
            border: '2px dashed var(--care-peach)',
            borderRadius: 'var(--care-radius-lg, 30px)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '260px',
            cursor: 'pointer',
            color: 'var(--care-ink)',
            textAlign: 'center',
            gap: '0.85rem',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="memory-dialog-title"
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '22px',
              backgroundColor: 'var(--care-cream)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--care-coral)',
            }}
          >
            <Plus size={28} strokeWidth={2.5} />
          </div>
          <div>
            <strong
              style={{
                display: 'block',
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--care-ink)',
                marginBottom: '0.25rem',
              }}
            >
              Add a memory
            </strong>
            <span
              style={{
                fontSize: '0.88rem',
                color: 'var(--care-muted)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <Camera size={15} /> Voice note or story
            </span>
          </div>
        </motion.button>
      </motion.div>

      {/* Tagline at bottom */}
      <footer
        className="memory-tagline"
        style={{
          textAlign: 'center',
          marginTop: '3.5rem',
          fontSize: '0.98rem',
          fontWeight: 700,
          color: 'var(--care-muted)',
        }}
      >
        A stronger tomorrow, together ❤️
      </footer>

      {/* Add Memory Modal */}
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
              <h2 id="memory-dialog-title" style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 900 }}>
                Preserve a Family Memory
              </h2>
              <p style={{ margin: '0 0 1.25rem 0', color: 'var(--care-muted)', fontSize: '0.92rem' }}>
                Capture stories, pictures, or voice notes that bring back warmth.
              </p>

              <form onSubmit={handleAddMemory} style={{ display: 'grid', gap: '0.9rem' }}>
                <div>
                  <label
                    htmlFor="memoryYearInput"
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      fontWeight: 750,
                      color: 'var(--care-ink)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Approximate Year
                  </label>
                  <input
                    id="memoryYearInput"
                    type="text"
                    placeholder="e.g. 1978 or 1983"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
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
                    htmlFor="memoryTitleInput"
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      fontWeight: 750,
                      color: 'var(--care-ink)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Memory Title
                  </label>
                  <input
                    id="memoryTitleInput"
                    type="text"
                    placeholder="e.g. Grandma's first harvest"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
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
                    htmlFor="memoryDescInput"
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      fontWeight: 750,
                      color: 'var(--care-ink)',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Description or Story
                  </label>
                  <textarea
                    id="memoryDescInput"
                    rows={3}
                    placeholder="Write a few lines about this special memory..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      borderRadius: '14px',
                      border: '1.5px solid var(--care-border)',
                      background: 'white',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
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
                    disabled={saving}
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
                    {saving ? 'Saving…' : 'Save memory'}
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

export default MemoryBoxPage;
