import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface CatchUpCardProps {
  onCatchUp?: () => void;
  updatesCount?: number;
}

export function CatchUpCard({ onCatchUp, updatesCount = 3 }: CatchUpCardProps) {
  return (
    <motion.div
      className="catch-up-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--care-cream, #FFEDB9) 0%, #FFF8EA 60%, #FFFDF8 100%)',
        border: '1px solid #F3E0A9',
        borderRadius: 'var(--care-radius-lg, 30px)',
        padding: '2rem 1.8rem',
        boxShadow: 'var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.08))',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.4rem',
      }}
    >
      <div
        className="catch-up-card__header"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1.2rem',
        }}
      >
        <div
          className="catch-up-card__icon-box"
          style={{
            width: 54,
            height: 54,
            minWidth: 54,
            borderRadius: 20,
            backgroundColor: 'var(--care-sun, #FFCB56)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--care-coral, #FF7E7E)',
            boxShadow: '0 6px 18px rgba(255, 203, 86, 0.45)',
          }}
          aria-hidden="true"
        >
          <Sparkles size={28} />
        </div>

        <div
          className="catch-up-card__info"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}
        >
          <h2
            className="catch-up-card__title"
            style={{
              margin: 0,
              fontSize: '1.45rem',
              fontWeight: 850,
              color: 'var(--care-ink, #3D302B)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Catch me up
          </h2>
          <p
            className="catch-up-card__subtitle"
            style={{
              margin: 0,
              color: 'var(--care-muted, #74655F)',
              fontSize: '0.98rem',
              lineHeight: 1.45,
            }}
          >
            {updatesCount} new {updatesCount === 1 ? 'update' : 'updates'} since you last checked
          </p>
        </div>
      </div>

      <div className="catch-up-card__actions" style={{ display: 'flex' }}>
        <motion.button
          type="button"
          className="catch-up-button primary-button"
          onClick={onCatchUp}
          whileHover={{ scale: 1.02, translateY: -1 }}
          whileTap={{ scale: 0.97 }}
          style={{
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'var(--care-coral, #FF7E7E)',
            color: '#3C2925',
            border: 'none',
            borderRadius: 999,
            padding: '0.95rem 1.8rem',
            fontSize: '1rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            boxShadow: '0 8px 24px rgba(255, 126, 126, 0.35)',
          }}
        >
          {/* Subtle shimmer effect */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 999,
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              animate={{ x: ['-120%', '220%'] }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: 'easeInOut',
                repeatDelay: 1.8,
              }}
              style={{
                width: '60%',
                height: '100%',
                background:
                  'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                transform: 'skewX(-22deg)',
              }}
            />
          </div>

          <Sparkles size={18} aria-hidden="true" />
          <span>Catch me up</span>
          <ArrowRight size={18} aria-hidden="true" />
        </motion.button>
      </div>
    </motion.div>
  );
}
