import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, User, AlertCircle } from 'lucide-react';

export interface TaskPreviewProps {
  emoji: string;
  title: string;
  assignee?: string;
  dueLabel: string;
  status: 'open' | 'done' | 'upcoming';
  isUrgent?: boolean;
}

export function TaskPreview({
  emoji,
  title,
  assignee,
  dueLabel,
  status,
  isUrgent = false,
}: TaskPreviewProps) {
  const isDone = status === 'done';
  const hasUrgentBorder = status === 'open' && isUrgent;

  return (
    <motion.div
      className={`task-preview task-preview--${status} ${isUrgent ? 'task-preview--urgent' : ''}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.9rem',
        padding: '0.85rem 1.1rem',
        borderRadius: 'var(--care-radius-md, 20px)',
        backgroundColor: 'var(--care-surface, #FFFDF8)',
        border: '1px solid var(--care-border, #EADFCE)',
        borderLeft: hasUrgentBorder
          ? '4px solid var(--care-coral, #FF7E7E)'
          : '1px solid var(--care-border, #EADFCE)',
        boxShadow: '0 4px 16px rgba(99, 65, 40, 0.04)',
        opacity: isDone ? 0.78 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Status indicator / checkbox */}
      <div
        className="task-preview__status-indicator"
        style={{
          width: 26,
          height: 26,
          minWidth: 26,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          backgroundColor: isDone
            ? 'rgba(95, 143, 114, 0.16)'
            : 'var(--care-canvas, #FFFAF0)',
          border: isDone
            ? '2px solid var(--care-success, #5f8f72)'
            : hasUrgentBorder
            ? '2px solid var(--care-coral, #FF7E7E)'
            : '2px solid var(--care-border, #EADFCE)',
          flexShrink: 0,
        }}
        aria-label={`Status: ${status}`}
      >
        {isDone ? (
          <Check size={16} color="var(--care-success, #5f8f72)" strokeWidth={3} />
        ) : status === 'upcoming' ? (
          <Clock size={14} color="var(--care-muted, #74655F)" strokeWidth={2} />
        ) : hasUrgentBorder ? (
          <AlertCircle size={14} color="var(--care-coral, #FF7E7E)" strokeWidth={2.4} />
        ) : (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--care-border, #EADFCE)',
            }}
          />
        )}
      </div>

      {/* Task Emoji */}
      <div
        className="task-preview__emoji"
        style={{
          width: 38,
          height: 38,
          minWidth: 38,
          borderRadius: 12,
          backgroundColor: 'var(--care-cream, #FFEDB9)',
          display: 'grid',
          placeItems: 'center',
          fontSize: '1.25rem',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <span>{emoji}</span>
      </div>

      {/* Main Content */}
      <div
        className="task-preview__content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          className="task-preview__title"
          style={{
            fontWeight: 750,
            fontSize: '0.96rem',
            color: 'var(--care-ink, #3D302B)',
            textDecoration: isDone ? 'line-through' : 'none',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>

        <div
          className="task-preview__meta"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            fontSize: '0.8rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Assignee */}
          {assignee ? (
            <span
              style={{
                color: 'var(--care-muted, #74655F)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <User size={12} aria-hidden="true" />
              {assignee}
            </span>
          ) : (
            <span
              style={{
                color: 'var(--care-coral, #FF7E7E)',
                fontWeight: 750,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              Unassigned
            </span>
          )}

          <span
            style={{
              color: 'var(--care-border, #EADFCE)',
              userSelect: 'none',
            }}
          >
            •
          </span>

          {/* Due Label */}
          <span
            style={{
              color: isUrgent && !isDone ? '#B45345' : 'var(--care-muted, #74655F)',
              fontWeight: isUrgent && !isDone ? 700 : 500,
            }}
          >
            {dueLabel}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
