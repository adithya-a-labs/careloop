import React, { useState } from 'react';
import { motion, AnimatePresence, type TargetAndTransition } from 'framer-motion';
import { Mic, Check, Loader2, Volume2, X, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createCareEvent, extractVoiceEvents } from '../lib/api';
import { VOICE_TRANSCRIPT_MOCK } from '../lib/mock-data';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'success';

interface DemoButton {
  label: string;
  value: VoiceState;
}

const DEMO_BUTTONS: DemoButton[] = [
  { label: 'Idle', value: 'idle' },
  { label: 'Listening', value: 'listening' },
  { label: 'Thinking', value: 'thinking' },
  { label: 'Speaking', value: 'speaking' },
  { label: 'Done', value: 'success' },
];

export function VoicePage() {
  const navigate = useNavigate();
  const [state, setState] = useState<VoiceState>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedEventCount, setSavedEventCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runHeroFlow = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setSavedEventCount(0);
    setState('listening');

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setState('thinking');
      const extraction = await extractVoiceEvents(VOICE_TRANSCRIPT_MOCK);
      if (extraction.events.length === 0) {
        throw new Error('No care updates were found in this transcript.');
      }

      setState('speaking');
      await new Promise((resolve) => setTimeout(resolve, 600));
      await Promise.all(extraction.events.map(createCareEvent));
      setSavedEventCount(extraction.events.length);
      setState('success');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'CareLoop could not share this update.',
      );
      setState('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  // Orb click handling
  const handleOrbClick = () => {
    if (state === 'idle') {
      void runHeroFlow();
    } else if (state === 'success') {
      setState('idle');
      setSavedEventCount(0);
    }
  };

  // Demo controls override everything
  const handleDemoSelect = (selectedState: VoiceState) => {
    if (selectedState === 'listening' || selectedState === 'success') {
      void runHeroFlow();
      return;
    }
    setErrorMessage(null);
    setState(selectedState);
  };

  // Orb dynamic glow based on state
  const getOrbGlow = (voiceState: VoiceState): string => {
    switch (voiceState) {
      case 'idle':
        return '0 0 24px rgba(255, 126, 126, 0.28), 0 14px 38px rgba(99, 65, 40, 0.12)';
      case 'listening':
        return '0 0 45px rgba(255, 126, 126, 0.75), 0 0 75px rgba(255, 203, 86, 0.5)';
      case 'thinking':
        return '0 0 35px rgba(255, 203, 86, 0.65), 0 0 60px rgba(255, 162, 89, 0.4)';
      case 'speaking':
        return '0 0 42px rgba(255, 162, 89, 0.7), 0 0 70px rgba(255, 126, 126, 0.5)';
      case 'success':
        return '0 0 45px rgba(95, 143, 114, 0.65), 0 0 70px rgba(255, 203, 86, 0.45)';
    }
  };

  // Framer-motion orb animations
  const getOrbAnimation = (voiceState: VoiceState): TargetAndTransition => {
    switch (voiceState) {
      case 'idle':
        return {
          scale: [1, 1.04, 1],
          rotate: 0,
          transition: {
            scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          },
        };
      case 'listening':
        return {
          scale: [1, 1.12, 1],
          rotate: 0,
          transition: {
            scale: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
          },
        };
      case 'thinking':
        return {
          rotate: [0, 8, -8, 0],
          scale: [1, 1.05, 0.98, 1],
          transition: {
            rotate: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
          },
        };
      case 'speaking':
        return {
          scale: [1, 1.08, 1],
          rotate: 0,
          transition: {
            scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
          },
        };
      case 'success':
        return {
          scale: [1, 1.15, 1],
          rotate: 0,
          transition: {
            scale: { duration: 0.5, times: [0, 0.6, 1], ease: 'easeOut' },
          },
        };
    }
  };

  // Icon inside orb
  const renderOrbIcon = (voiceState: VoiceState) => {
    switch (voiceState) {
      case 'idle':
      case 'listening':
        return <Mic size={48} strokeWidth={2.4} aria-hidden="true" />;
      case 'thinking':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Loader2 size={48} strokeWidth={2.4} aria-hidden="true" />
          </motion.div>
        );
      case 'speaking':
        return <Volume2 size={48} strokeWidth={2.4} aria-hidden="true" />;
      case 'success':
        return <Check size={52} strokeWidth={3} aria-hidden="true" />;
    }
  };

  return (
    <div className="voice-page">
      {/* 1. Header */}
      <header className="voice-header">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="voice-header-btn"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="voice-page-title">Talk to CareLoop</h1>
        <button
          type="button"
          onClick={() => {
            setState('idle');
            setErrorMessage(null);
            setSavedEventCount(0);
          }}
          className="voice-header-btn"
          aria-label="Reset interaction"
          title="Reset to idle"
        >
          <X size={20} />
        </button>
      </header>

      {/* 2. Voice Orb */}
      <div className="orb-wrapper">
        <AnimatePresence>
          {state === 'listening' && (
            <div className="orb-rings" key="orb-rings">
              <motion.div
                className="voice-ring"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: 0,
                }}
              />
              <motion.div
                className="voice-ring"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: 0.9,
                }}
              />
            </div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          className="voice-orb-button"
          aria-label={`Voice orb (${state})`}
          onClick={handleOrbClick}
          disabled={isProcessing}
          animate={getOrbAnimation(state)}
          style={{
            boxShadow: getOrbGlow(state),
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {renderOrbIcon(state)}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </div>

      {/* 3. State Label Below Orb */}
      <div className="voice-status-label">
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>
              {state === 'idle' && 'Tap to start talking'}
              {state === 'listening' && "I'm listening..."}
              {state === 'thinking' && 'Understanding...'}
              {state === 'speaking' && "Here's what I heard"}
              {state === 'success' && `${savedEventCount} updates added to your Care Circle`}
            </span>
            {state === 'listening' && <span className="voice-pulse-dot" />}
          </motion.div>
        </AnimatePresence>
      </div>

      {errorMessage && (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      )}

      {/* 4. Transcript Area */}
      <AnimatePresence>
        {(state === 'speaking' || state === 'success') && (
          <motion.div
            className="voice-transcript"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <div className="voice-transcript-tag">
              {state === 'speaking' ? 'Transcribing...' : 'Care circle update'}
            </div>
            <blockquote className="voice-transcript-quote">
              “{VOICE_TRANSCRIPT_MOCK}”
            </blockquote>
            {state === 'success' && (
              <motion.div
                className="voice-transcript-success-badge"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.25 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', width: '100%', maxWidth: '340px', margin: '0.8rem auto 0' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--care-success)', fontWeight: 750, fontSize: '0.9rem' }}>
                  <Check size={18} strokeWidth={2.5} />
                  <span>Captured to shared timeline</span>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate('/timeline')}
                  style={{
                    fontSize: '0.92rem',
                    padding: '0.7rem 1.25rem',
                    boxShadow: '0 6px 18px rgba(255, 126, 126, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>View in Timeline</span>
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Demo Controls */}
      <div className="voice-demo-controls" role="group" aria-label="Voice demo state controls">
        <span className="voice-demo-label">Demo:</span>
        {DEMO_BUTTONS.map(({ label, value }) => {
          const isActive = state === value;
          return (
            <button
              key={value}
              type="button"
              className={`voice-demo-pill ${isActive ? 'active' : ''}`}
              onClick={() => handleDemoSelect(value)}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 6. Safety Notice */}
      <div className="voice-safety">
        <ShieldCheck size={20} />
        <p>CareLoop coordinates and summarizes. It does not diagnose, prescribe, or alter medication.</p>
      </div>
    </div>
  );
}
