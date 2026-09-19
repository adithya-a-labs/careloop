import React from 'react';
import { motion, type Transition } from 'framer-motion';
import { Mic, Volume2, Check } from 'lucide-react';

export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'success';

export interface VoiceOrbProps {
  state: VoiceOrbState;
  onTap?: () => void;
  size?: number;
}

export function VoiceOrb({ state, onTap, size = 120 }: VoiceOrbProps) {
  const iconSize = Math.max(28, Math.round(size * 0.32));

  // Determine orb scale animation and transition based on state
  const getOrbAnimation = () => {
    switch (state) {
      case 'idle':
        return {
          scale: [1.0, 1.05, 1.0],
          boxShadow: [
            '0 0 24px rgba(255, 126, 126, 0.35), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.1))',
            '0 0 32px rgba(255, 126, 126, 0.48), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.1))',
            '0 0 24px rgba(255, 126, 126, 0.35), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.1))',
          ],
        };
      case 'listening':
        return {
          scale: [1.0, 1.15, 1.0],
          boxShadow: [
            '0 0 36px rgba(255, 126, 126, 0.75), 0 0 16px rgba(255, 203, 86, 0.4), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.12))',
            '0 0 52px rgba(255, 126, 126, 0.9), 0 0 24px rgba(255, 203, 86, 0.6), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.12))',
            '0 0 36px rgba(255, 126, 126, 0.75), 0 0 16px rgba(255, 203, 86, 0.4), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.12))',
          ],
        };
      case 'thinking':
        return {
          scale: [1.0, 1.04, 1.0],
          boxShadow: [
            '0 0 30px rgba(255, 203, 86, 0.55), 0 0 18px rgba(255, 162, 89, 0.4), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.1))',
            '0 0 44px rgba(255, 203, 86, 0.75), 0 0 26px rgba(255, 162, 89, 0.55), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.1))',
            '0 0 30px rgba(255, 203, 86, 0.55), 0 0 18px rgba(255, 162, 89, 0.4), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.1))',
          ],
        };
      case 'speaking':
        return {
          scale: [1.0, 1.08, 0.98, 1.05, 1.0],
          y: [0, -3, 0, 2, 0],
          boxShadow: [
            '0 0 34px rgba(255, 126, 126, 0.6), 0 0 20px rgba(255, 203, 86, 0.4), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.1))',
            '0 0 48px rgba(255, 126, 126, 0.75), 0 0 30px rgba(255, 203, 86, 0.55), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.1))',
            '0 0 34px rgba(255, 126, 126, 0.6), 0 0 20px rgba(255, 203, 86, 0.4), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.1))',
          ],
        };
      case 'success':
        return {
          scale: [1.0, 1.2, 1.0],
          boxShadow: '0 0 40px rgba(95, 143, 114, 0.65), 0 0 16px rgba(95, 143, 114, 0.35), var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.1))',
        };
    }
  };

  const getOrbTransition = (): Transition => {
    switch (state) {
      case 'idle':
        return { repeat: Infinity, duration: 3, ease: 'easeInOut' };
      case 'listening':
        return { repeat: Infinity, duration: 1.5, ease: 'easeInOut' };
      case 'thinking':
        return { repeat: Infinity, duration: 2, ease: 'easeInOut' };
      case 'speaking':
        return { repeat: Infinity, duration: 1.4, ease: 'easeInOut' };
      case 'success':
        return { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] };
    }
  };

  return (
    <div
      className="voice-orb-container"
      style={{
        position: 'relative',
        width: size * 2,
        height: size * 2,
        display: 'grid',
        placeItems: 'center',
        margin: '0 auto',
      }}
    >
      {/* Listening expanding concentric rings */}
      {state === 'listening' && (
        <>
          <motion.div
            aria-hidden="true"
            className="voice-orb-pulse-ring ring-1"
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              border: '3px solid var(--care-coral, #FF7E7E)',
              pointerEvents: 'none',
            }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
          />
          <motion.div
            aria-hidden="true"
            className="voice-orb-pulse-ring ring-2"
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              border: '3px solid var(--care-peach, #FFA259)',
              pointerEvents: 'none',
            }}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: 0.5, ease: 'easeOut' }}
          />
        </>
      )}

      {/* Thinking rotating gradient animation */}
      {state === 'thinking' && (
        <motion.div
          aria-hidden="true"
          className="voice-orb-thinking-halo"
          style={{
            position: 'absolute',
            width: size + 28,
            height: size + 28,
            borderRadius: '50%',
            background:
              'conic-gradient(from 0deg, var(--care-coral, #FF7E7E), var(--care-sun, #FFCB56), var(--care-peach, #FFA259), var(--care-coral, #FF7E7E))',
            filter: 'blur(10px)',
            opacity: 0.7,
            pointerEvents: 'none',
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
        />
      )}

      {/* Speaking gentle sound wave ring */}
      {state === 'speaking' && (
        <motion.div
          aria-hidden="true"
          className="voice-orb-speaking-halo"
          style={{
            position: 'absolute',
            width: size + 16,
            height: size + 16,
            borderRadius: '50%',
            border: '3px solid var(--care-sun, #FFCB56)',
            pointerEvents: 'none',
          }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.7, 0.35] }}
          transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut' }}
        />
      )}

      {/* Main interactive circular orb */}
      <motion.button
        type="button"
        className={`voice-orb-button voice-orb--${state}`}
        onClick={onTap}
        whileTap={{ scale: 0.94 }}
        animate={getOrbAnimation()}
        transition={getOrbTransition()}
        aria-label={`Voice interaction: ${state}`}
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: 'var(--care-coral, #FF7E7E)',
          border: '14px solid var(--care-cream, #FFEDB9)',
          display: 'grid',
          placeItems: 'center',
          cursor: onTap ? 'pointer' : 'default',
          padding: 0,
          outline: 'none',
          zIndex: 2,
        }}
      >
        {/* Inner Content: Mic / Loader Dots / Volume / Check */}
        {(state === 'idle' || state === 'listening') && (
          <motion.div
            key="mic"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid', placeItems: 'center' }}
          >
            <Mic
              size={iconSize}
              color="var(--care-ink, #3D302B)"
              strokeWidth={2.4}
              aria-hidden="true"
            />
          </motion.div>
        )}

        {state === 'thinking' && (
          <div
            className="voice-orb-dots"
            role="status"
            aria-label="Thinking"
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                style={{
                  width: Math.max(7, Math.round(size * 0.075)),
                  height: Math.max(7, Math.round(size * 0.075)),
                  borderRadius: '50%',
                  backgroundColor: 'var(--care-ink, #3D302B)',
                  display: 'inline-block',
                }}
                animate={{ y: [-5, 5, -5] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.75,
                  delay: i * 0.16,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}

        {state === 'speaking' && (
          <motion.div
            key="volume"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid', placeItems: 'center' }}
          >
            <Volume2
              size={iconSize}
              color="var(--care-ink, #3D302B)"
              strokeWidth={2.4}
              aria-hidden="true"
            />
          </motion.div>
        )}

        {state === 'success' && (
          <motion.div
            key="check"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            style={{ display: 'grid', placeItems: 'center' }}
          >
            <Check
              size={Math.round(iconSize * 1.15)}
              color="var(--care-ink, #3D302B)"
              strokeWidth={3.2}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </motion.button>
    </div>
  );
}
