import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User } from 'lucide-react';

export interface CareEventCardProps {
  emoji: string;
  title: string;
  description: string;
  time: string;
  relativeTime: string;
  reporter?: string;
  isUpcoming?: boolean;
  animateIn?: boolean;
}

export function CareEventCard({
  emoji,
  title,
  description,
  time,
  relativeTime,
  reporter,
  isUpcoming = false,
  animateIn = true,
}: CareEventCardProps) {
  return (
    <AnimatePresence>
      <motion.article
        className={`care-event-card ${isUpcoming ? 'care-event-card--upcoming' : ''}`}
        initial={animateIn ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        whileHover={{ y: -2 }}
        style={{
          display: 'flex',
          gap: '1rem',
          padding: '1.2rem',
          borderRadius: 'var(--care-radius-md, 20px)',
          backgroundColor: isUpcoming
            ? 'rgba(255, 203, 86, 0.09)'
            : 'var(--care-surface, #FFFDF8)',
          border: isUpcoming
            ? '2px dashed var(--care-sun, #FFCB56)'
            : '1px solid var(--care-border, #EADFCE)',
          boxShadow: 'var(--care-shadow, 0 14px 38px rgba(99, 65, 40, 0.06))',
          position: 'relative',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Emoji Badge */}
        <div
          className="care-event-card__emoji-wrap"
          style={{
            width: 44,
            height: 44,
            minWidth: 44,
            borderRadius: 14,
            backgroundColor: isUpcoming
              ? 'var(--care-sun, #FFCB56)'
              : 'var(--care-cream, #FFEDB9)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.4rem',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <span>{emoji}</span>
        </div>

        {/* Content Area */}
        <div
          className="care-event-card__content"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            className="care-event-card__header"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong
                className="care-event-card__title"
                style={{
                  color: 'var(--care-ink, #3D302B)',
                  fontWeight: 750,
                  fontSize: '1.02rem',
                  lineHeight: 1.3,
                }}
              >
                {title}
              </strong>
              {isUpcoming && (
                <span
                  className="care-event-card__upcoming-tag"
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 999,
                    backgroundColor: 'var(--care-sun, #FFCB56)',
                    color: '#523412',
                  }}
                >
                  Upcoming
                </span>
              )}
            </div>

            <div
              className="care-event-card__time-info"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: '#9b4e3f',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Clock size={13} aria-hidden="true" />
                {time}
              </span>
              <small
                style={{
                  color: 'var(--care-muted, #74655F)',
                  fontSize: '0.75rem',
                }}
              >
                {relativeTime}
              </small>
            </div>
          </div>

          <p
            className="care-event-card__description"
            style={{
              margin: 0,
              color: 'var(--care-muted, #74655F)',
              fontSize: '0.92rem',
              lineHeight: 1.55,
            }}
          >
            {description}
          </p>

          {reporter && (
            <div
              className="care-event-card__reporter"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginTop: '0.25rem',
                color: 'var(--care-muted, #74655F)',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <User size={13} aria-hidden="true" />
              <span>Reported by {reporter}</span>
            </div>
          )}
        </div>
      </motion.article>
    </AnimatePresence>
  );
}
