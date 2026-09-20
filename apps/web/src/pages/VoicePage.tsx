import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Loader2, Mic, ShieldCheck, UserCheck, Volume2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemoProfile } from '../features/demo/DemoContext';
import { canAccessMemoryBox, getVoiceExperienceCopy } from '../features/demo/role-experience';
import {
  createCareEvent,
  createMemory,
  routeVoiceTurn,
  updateTask,
  type VoiceTurnResult,
} from '../lib/api';
import { startLiveVoice, type LiveVoiceConnection } from '../lib/live-voice';
import { VOICE_TRANSCRIPT_MOCK } from '../lib/mock-data';
import { isRealMode } from '../lib/supabase';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'success';

function previewMessage(result: VoiceTurnResult | null) {
  if (!result) return '';
  if (result.preview.handoff_summary) return result.preview.handoff_summary.summary;
  if (result.preview.coordination_suggestion) return result.preview.coordination_suggestion.message;
  if (result.preview.memory_extraction) {
    return `Save “${result.preview.memory_extraction.title}” to MemoryBox?`;
  }
  if (result.preview.extracted_events?.length) {
    return `${result.preview.extracted_events.length} care update${result.preview.extracted_events.length === 1 ? '' : 's'} ready to share.`;
  }
  return result.preview.message ?? 'No CareLoop action was found.';
}

export function VoicePage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { activeProfile, authStatus, authError } = useDemoProfile();
  const [state, setState] = useState<VoiceState>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [typedTranscript, setTypedTranscript] = useState('');
  const [result, setResult] = useState<VoiceTurnResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referencedTaskId, setReferencedTaskId] = useState<string | null>(null);
  const liveConnection = useRef<LiveVoiceConnection | null>(null);
  const voiceCopy = getVoiceExperienceCopy(activeProfile);

  useEffect(() => {
    liveConnection.current?.close();
    liveConnection.current = null;
    setState('idle');
    setTranscript('');
    setTypedTranscript('');
    setResult(null);
    setStatusMessage(null);
    setErrorMessage(null);
    setReferencedTaskId(null);
    return () => liveConnection.current?.close();
  }, [activeProfile.id]);

  const planTranscript = async (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setResult(null);
    setTranscript(clean);
    setState('thinking');
    try {
      const planned = await routeVoiceTurn(clean, activeProfile, referencedTaskId);
      if (planned.tool === 'save_memory' && !canAccessMemoryBox(activeProfile)) {
        setErrorMessage('MemoryBox is private to Amma and her family. You can still share a care update.');
        setState('idle');
        return;
      }
      setResult(planned);
      const taskId = planned.preview.coordination_suggestion?.task_id;
      if (taskId) setReferencedTaskId(taskId);
      setStatusMessage(previewMessage(planned));
      setState(planned.requires_confirmation ? 'speaking' : 'success');
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : 'CareLoop could not understand this request.');
      setState('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmResult = async () => {
    if (!result?.requires_confirmation) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      if (result.tool === 'record_care_event') {
        const events = result.preview.extracted_events ?? [];
        if (!events.length) throw new Error('No care updates were available to share.');
        await Promise.all(events.map((event) => createCareEvent(event, activeProfile.id)));
        setStatusMessage(`${events.length} update${events.length === 1 ? '' : 's'} added to the shared timeline.`);
      } else if (result.tool === 'save_memory') {
        if (!result.preview.memory_create) throw new Error('The memory preview is incomplete.');
        await createMemory(result.preview.memory_create, activeProfile.id);
        setStatusMessage('Memory saved to the family MemoryBox.');
      } else if (result.tool === 'draft_task') {
        const suggestion = result.preview.coordination_suggestion;
        if (!suggestion?.task_id) throw new Error('The task reference is missing.');
        if (suggestion.action === 'assign_task' && suggestion.assignee_id) {
          await updateTask(suggestion.task_id, { assigned_to: suggestion.assignee_id }, activeProfile.id);
          setStatusMessage('Rahul’s got it ✨');
        } else if (suggestion.action === 'complete_task') {
          await updateTask(suggestion.task_id, { status: 'completed' }, activeProfile.id);
          setStatusMessage('The task is marked complete.');
        } else {
          throw new Error('This coordination action is not ready to confirm.');
        }
      } else {
        throw new Error('This preview does not contain a writable action.');
      }
      setState('success');
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : 'CareLoop could not save this action.');
      setState('speaking');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetInteraction = () => {
    liveConnection.current?.close();
    liveConnection.current = null;
    setState('idle');
    setTranscript('');
    setTypedTranscript('');
    setResult(null);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const startHeroFlow = async () => {
    if (isProcessing || liveConnection.current) return;
    if (isRealMode && authStatus !== 'authenticated') {
      setErrorMessage(authError ?? `CareLoop is signing in as ${activeProfile.displayName}.`);
      return;
    }
    setErrorMessage(null);
    setResult(null);
    setStatusMessage(null);
    setTranscript('');
    setState('listening');
    if (!isRealMode) {
      await planTranscript(VOICE_TRANSCRIPT_MOCK);
      return;
    }
    try {
      liveConnection.current = await startLiveVoice(activeProfile, {
        onConnected: () => setState('listening'),
        onInputTranscript: setTranscript,
        onSpeaking: () => undefined,
        onError: setErrorMessage,
      });
    } catch (reason) {
      setErrorMessage(
        `${reason instanceof Error ? reason.message : 'Live voice could not start.'} You can type the same request below.`,
      );
      setState('idle');
    }
  };

  const finishLiveFlow = async () => {
    const connection = liveConnection.current;
    if (!connection) return;
    liveConnection.current = null;
    const completedTranscript = connection.transcript().trim();
    connection.close();
    if (!completedTranscript) {
      setErrorMessage('No transcript was received. Try again or type your request below.');
      setState('idle');
      return;
    }
    await planTranscript(completedTranscript);
  };

  const handleOrbClick = () => {
    if (state === 'idle') void startHeroFlow();
    else if (liveConnection.current && state === 'listening') void finishLiveFlow();
    else if (state === 'success') resetInteraction();
  };

  const orbIcon = state === 'thinking'
    ? <Loader2 size={48} aria-hidden="true" />
    : state === 'success'
      ? <Check size={52} aria-hidden="true" />
      : state === 'speaking'
        ? <Volume2 size={48} aria-hidden="true" />
        : <Mic size={48} aria-hidden="true" />;

  const suggestion = result?.preview.coordination_suggestion;

  return (
    <div className="voice-page">
      <header className="voice-header">
        <button type="button" onClick={() => navigate(-1)} className="voice-header-btn" aria-label="Go back">
          <ArrowLeft size={22} />
        </button>
        <div className="voice-page-heading">
          <h1 className="voice-page-title">{voiceCopy.heading}</h1>
          <p>{voiceCopy.helper}</p>
        </div>
        <button type="button" onClick={resetInteraction} className="voice-header-btn" aria-label="Reset interaction">
          <X size={20} />
        </button>
      </header>

      <div className="orb-wrapper">
        <motion.button
          type="button"
          className="voice-orb-button"
          aria-label={state === 'listening' ? 'Finish recording' : `Voice assistant: ${state}`}
          onClick={handleOrbClick}
          disabled={isProcessing || (isRealMode && authStatus !== 'authenticated') || state === 'speaking'}
          aria-busy={isProcessing}
          animate={reduceMotion ? undefined : state === 'listening' ? { scale: [1, 1.1, 1] } : undefined}
          transition={reduceMotion ? undefined : { duration: 1.2, repeat: Infinity }}
        >
          {orbIcon}
        </motion.button>
      </div>

      <div className="voice-status-label" aria-live="polite">
        {state === 'idle' && (authStatus === 'loading' ? `Signing in as ${activeProfile.displayName}…` : 'Tap to start talking')}
        {state === 'listening' && 'Listening — tap when finished'}
        {state === 'thinking' && 'Routing your request…'}
        {state === 'speaking' && 'Review before sharing'}
        {state === 'success' && (statusMessage ?? 'Ready')}
      </div>

      {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

      <section className="voice-suggestions" aria-labelledby="voice-suggestions-title">
        <h2 id="voice-suggestions-title">Try saying</h2>
        <div className="voice-prompt-list">
          {voiceCopy.prompts.map((prompt) => (
            <button type="button" key={prompt} onClick={() => void planTranscript(prompt)} disabled={isProcessing}>
              “{prompt}”
            </button>
          ))}
        </div>
      </section>

      <form
        className="voice-text-alternative"
        onSubmit={(event) => {
          event.preventDefault();
          void planTranscript(typedTranscript);
        }}
      >
        <label htmlFor="voiceTextRequest">Or type your request</label>
        <div className="voice-text-row">
          <input
            id="voiceTextRequest"
            value={typedTranscript}
            onChange={(event) => setTypedTranscript(event.target.value)}
            placeholder={voiceCopy.prompts[0]}
          />
          <button type="submit" className="primary-button touch-target" disabled={isProcessing || !typedTranscript.trim()}>
            Send
          </button>
        </div>
      </form>

      <AnimatePresence>
        {(state === 'speaking' || state === 'success') && result && (
          <motion.section
            className="voice-transcript"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="voice-transcript-tag">{result.preview.intent.replaceAll('_', ' ')}</div>
            <blockquote className="voice-transcript-quote">“{transcript}”</blockquote>
            <p className="voice-preview-message">{statusMessage}</p>

            {result.requires_confirmation && state === 'speaking' && (
              <button type="button" className="primary-button touch-target" onClick={() => void confirmResult()} disabled={isProcessing}>
                {isProcessing ? 'Saving…' : result.tool === 'save_memory' ? 'Save memory' : result.tool === 'draft_task' ? 'Confirm assignment' : 'Share update'}
              </button>
            )}

            {!result.requires_confirmation && suggestion?.action === 'suggest_assignee' && suggestion.assignee_id && (
              <button
                type="button"
                className="primary-button touch-target"
                onClick={() => void planTranscript('Ask Rahul.')}
                disabled={isProcessing}
              >
                <UserCheck size={18} aria-hidden="true" /> Ask Rahul
              </button>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <div className="voice-safety">
        <ShieldCheck size={20} aria-hidden="true" />
        <p>CareLoop coordinates and summarizes. It does not diagnose, prescribe, or alter medication.</p>
      </div>
    </div>
  );
}
