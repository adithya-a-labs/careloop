import React from 'react';
import { motion } from 'framer-motion';

export type StatusTone = 'cream' | 'sun' | 'peach' | 'coral' | 'success';

export interface StatusCardProps {
  id?: string;
  emoji: string;
  title: string;
  subtitle: string;
  tone: StatusTone;
  time?: string;
  className?: string;
  onClick?: () => void;
}

const TONE_STYLES: Record<
  StatusTone,
  { emojiBg: string; cardBg: string; borderColor: string }
> = {
  cream: {
    emojiBg: '#FFEDB9',
    cardBg: 'rgba(255, 237, 185, 0.35)',
    borderColor: 'rgba(234, 223, 206, 0.9)',
  },
  sun: {
    emojiBg: '#FFCB56',
    cardBg: 'rgba(255, 203, 86, 0.15)',
    borderColor: 'rgba(255, 203, 86, 0.35)',
  },
  peach: {
    emojiBg: '#FFA259',
    cardBg: 'rgba(255, 162, 89, 0.14)',
    borderColor: 'rgba(255, 162, 89, 0.32)',
  },
  coral: {
    emojiBg: '#FF7E7E',
    cardBg: 'rgba(255, 126, 126, 0.13)',
    borderColor: 'rgba(255, 126, 126, 0.3)',
  },
  success: {
    emojiBg: '#5f8f72',
    cardBg: 'rgba(95, 143, 114, 0.13)',
    borderColor: 'rgba(95, 143, 114, 0.3)',
  },
};

export function StatusCard({
  emoji,
  title,
  subtitle,
  tone,
  time,
  onClick,
}: StatusCardProps) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.cream;

  return (
    <motion.div
      className={`status-card status-card--${tone}`}
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.95rem 1.15rem',
        borderRadius: 'var(--care-radius-md, 20px)',
        backgroundColor: styles.cardBg,
        border: `1px solid ${styles.borderColor}`,
        boxShadow: '0 4px 16px rgba(99, 65, 40, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        className="status-card__emoji-wrap"
        style={{
          width: 48,
          height: 48,
          minWidth: 48,
          borderRadius: 14,
          backgroundColor: styles.emojiBg,
          display: 'grid',
          placeItems: 'center',
          fontSize: '1.45rem',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <span>{emoji}</span>
      </div>

      <div
        className="status-card__body"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
          flex: 1,
          minWidth: 0,
        }}
      >
        <strong
          className="status-card__title"
          style={{
            color: 'var(--care-ink, #3D302B)',
            fontWeight: 750,
            fontSize: '1rem',
            lineHeight: 1.3,
          }}
        >
          {title}
        </strong>
        <span
          className="status-card__subtitle"
          style={{
            color: 'var(--care-muted, #74655F)',
            fontSize: '0.88rem',
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </span>
      </div>

      {time && (
        <span
          className="status-card__time"
          style={{
            color: 'var(--care-muted, #74655F)',
            fontSize: '0.8rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            alignSelf: 'flex-start',
            paddingTop: '0.2rem',
            marginLeft: 'auto',
          }}
        >
          {time}
        </span>
      )}
    </motion.div>
  );
}

export default StatusCard;
