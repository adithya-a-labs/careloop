import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Loader2, Mic, ShieldCheck, UserCheck, Volume2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemoProfile } from '../features/demo/DemoContext';
import { canAccessMemoryBox, getVoiceExperienceCopy } from '../features/demo/role-experience';
import {
  createCareEvent,
  createMemory,
  DEMO_RAHUL_ID,
  routeVoiceTurn,
  updateTask,
  UUID_TO_NAME,
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
  if (result.preview.context_query) return result.preview.context_query.answer;
  if (result.preview.memory_extraction) {
    return `Save “${result.preview.memory_extraction.title}” to MemoryBox?`;
  }
  if (result.preview.extracted_events?.length) {
    return `${result.preview.extracted_events.length} care update${result.preview.extracted_events.length === 1 ? '' : 's'} ready to share.`;
  }
  return result.preview.message ?? 'CareLoop could not prepare a response for that request.';
}

function readingProgressMessage(transcript: string) {
  const normalized = transcript.toLowerCase();
  if (/who can|who is available|pick up|help tomorrow/.test(normalized)) return 'Finding who’s available…';
  if (/catch me up|how is|what changed|before my visit/.test(normalized)) return 'Looking at recent updates…';
  if (/what do i have|when is|visiting|my tasks|done yet|eat lunch/.test(normalized)) return 'Checking today’s care…';
  return 'Preparing your update…';
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
  const [processingMessage, setProcessingMessage] = useState('Understanding…');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referencedTaskId, setReferencedTaskId] = useState<string | null>(null);
  const liveConnection = useRef<LiveVoiceConnection | null>(null);
  const interaction = useRef(0);
  const voiceCopy = getVoiceExperienceCopy(activeProfile);

  useEffect(() => {
    liveConnection.current?.close();
    liveConnection.current = null;
    setState('idle');
    setTranscript('');
    setTypedTranscript('');
    setResult(null);
    setStatusMessage(null);
    setProcessingMessage('Understanding…');
    setErrorMessage(null);
    setReferencedTaskId(null);
    return () => {
      interaction.current += 1;
      liveConnection.current?.close();
    };
  }, [activeProfile.id]);

  const planTranscript = async (value: string) => {
    const clean = value.trim();
    if (!clean || isProcessing || authStatus !== 'authenticated') return;
    const request = ++interaction.current;
    setIsProcessing(true);
    setErrorMessage(null);
    setTranscript(clean);
    setState('thinking');
    setProcessingMessage('Understanding…');
    const progressTimer = window.setTimeout(() => {
      setProcessingMessage(readingProgressMessage(clean));
    }, 250);
    try {
      const planned = await routeVoiceTurn(clean, activeProfile, referencedTaskId);
      if (request !== interaction.current) return;
      if (planned.tool === 'save_memory' && !canAccessMemoryBox(activeProfile)) {
        setErrorMessage('MemoryBox is private to Amma and her family. You can still share a care update.');
        setState('idle');
        return;
      }
      setResult(planned);
      const taskSources = planned.preview.context_query?.sources.filter((source) => source.kind === 'task');
      const taskId = planned.preview.coordination_suggestion?.task_id
        ?? (planned.preview.context_query?.heading === 'YOUR TASKS' && taskSources?.length === 1 ? taskSources[0].id : null);
      setReferencedTaskId(taskId ?? null);
      setStatusMessage(previewMessage(planned));
      setState(planned.requires_confirmation ? 'speaking' : 'success');
    } catch (reason) {
      if (request !== interaction.current) return;
      setErrorMessage(reason instanceof Error ? reason.message : 'CareLoop could not understand this request.');
      setState('idle');
    } finally {
      window.clearTimeout(progressTimer);
      if (request === interaction.current) setIsProcessing(false);
    }
  };

  const confirmResult = async () => {
    if (!result?.requires_confirmation || isProcessing || authStatus !== 'authenticated') return;
    setIsProcessing(true);
    setErrorMessage(null);
    const suggestion = result.preview.coordination_suggestion;
    if (result.tool === 'draft_task' && suggestion?.action === 'assign_task') {
      setProcessingMessage(suggestion.assignee_id === DEMO_RAHUL_ID ? 'Assigning Rahul…' : 'Assigning task…');
    } else {
      setProcessingMessage('Saving your update…');
    }
    try {
      if (result.tool === 'record_care_event') {
        const events = result.preview.extracted_events ?? [];
        if (!events.length) throw new Error('No care updates were available to share.');
        const saved = await Promise.allSettled(events.map((event) => createCareEvent(event, activeProfile.id)));
        const remaining = events.filter((_, index) => saved[index].status === 'rejected');
        if (remaining.length) {
          setResult({ ...result, preview: { ...result.preview, extracted_events: remaining } });
          setStatusMessage(`${events.length - remaining.length} saved. Review and retry the ${remaining.length} remaining update(s).`);
          throw new Error('Some updates could not be saved. Please retry the remaining updates.');
        }
        setStatusMessage(`${events.length} update${events.length === 1 ? '' : 's'} added to the shared timeline.`);
      } else if (result.tool === 'save_memory') {
        if (!result.preview.memory_create) throw new Error('The memory preview is incomplete.');
        await createMemory(result.preview.memory_create, activeProfile.id);
        setStatusMessage('Memory saved to the family MemoryBox.');
      } else if (result.tool === 'draft_task') {
        if (!suggestion?.task_id) throw new Error('The task reference is missing.');
        if (suggestion.action === 'assign_task' && suggestion.assignee_id) {
          await updateTask(suggestion.task_id, { assigned_to: suggestion.assignee_id }, activeProfile.id);
          setStatusMessage(`${UUID_TO_NAME[suggestion.assignee_id] ?? 'Your caregiver'}’s got it ✨`);
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
    if (isProcessing && state === 'speaking') return;
    interaction.current += 1;
    setIsProcessing(false);
    liveConnection.current?.close();
    liveConnection.current = null;
    setState('idle');
    setTranscript('');
    setTypedTranscript('');
    setResult(null);
    setStatusMessage(null);
    setProcessingMessage('Understanding…');
    setErrorMessage(null);
    setReferencedTaskId(null);
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
    const request = ++interaction.current;
    if (!isRealMode) {
      await planTranscript(VOICE_TRANSCRIPT_MOCK);
      return;
    }
    try {
      const connection = await startLiveVoice(activeProfile, {
        onConnected: () => { if (request === interaction.current) setState('listening'); },
        onInputTranscript: (value) => { if (request === interaction.current) setTranscript(value); },
        onSpeaking: () => undefined,
        onError: (value) => { if (request === interaction.current) setErrorMessage(value); },
      });
      if (request !== interaction.current) connection.close();
      else liveConnection.current = connection;
    } catch (reason) {
      if (request !== interaction.current) return;
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
  const contextAnswer = result?.preview.context_query;

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
        <button type="button" onClick={resetInteraction} disabled={isProcessing && state === 'speaking'} className="voice-header-btn" aria-label="Reset interaction">
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
        {state === 'thinking' && processingMessage}
        {state === 'speaking' && (isProcessing ? processingMessage : 'Review before sharing')}
        {state === 'success' && (statusMessage ?? 'Ready')}
      </div>

      {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
      {state === 'listening' && transcript && <p aria-live="polite">{transcript}</p>}

      <section className="voice-suggestions" aria-labelledby="voice-suggestions-title">
        <h2 id="voice-suggestions-title">Try saying</h2>
        <div className="voice-prompt-list">
          {voiceCopy.prompts.map((prompt) => (
            <button type="button" key={prompt} onClick={() => void planTranscript(prompt)} disabled={isProcessing || authStatus !== 'authenticated' || state === 'listening'}>
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
          <button type="submit" className="primary-button touch-target" disabled={isProcessing || authStatus !== 'authenticated' || state === 'listening' || !typedTranscript.trim()}>
            Send
          </button>
        </div>
      </form>

      <AnimatePresence>
        {result && (
          <motion.section
            className="voice-transcript"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="voice-transcript-tag">
              {contextAnswer?.heading ?? (result.preview.intent === 'catch_up' ? 'CATCH ME UP' : result.preview.intent.replaceAll('_', ' '))}
            </div>
            <blockquote className="voice-transcript-quote">“{result.preview.text}”</blockquote>
            <p className="voice-preview-message">{statusMessage}</p>

            {result.preview.extracted_events?.length ? (
              <ul aria-label="Care updates to share">
                {result.preview.extracted_events.map((event, index) => (
                  <li key={`${event.type}:${index}`}>
                    <strong>{event.type.replaceAll('_', ' ')}</strong>: {Object.entries(event.data).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value).replaceAll('_', ' ')}`).join(', ')}
                  </li>
                ))}
              </ul>
            ) : null}

            {contextAnswer?.sources.length ? (
              <ul className="voice-context-sources" aria-label="CareLoop sources">
                {contextAnswer.sources.map((source) => (
                  <li key={`${source.kind}:${source.id}`}>
                    {source.label}
                    {source.occurred_at ? ` · ${new Date(source.occurred_at).toLocaleString()}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}

            {result.requires_confirmation && state === 'speaking' && (
              <button type="button" className="primary-button touch-target" onClick={() => void confirmResult()} disabled={isProcessing}>
                {isProcessing
                  ? 'Saving…'
                  : result.tool === 'save_memory'
                    ? 'Save memory'
                    : suggestion?.action === 'complete_task'
                      ? 'Confirm completion'
                      : result.tool === 'draft_task'
                        ? 'Confirm assignment'
                        : 'Share update'}
              </button>
            )}

            {!result.requires_confirmation && suggestion?.action === 'suggest_assignee' && suggestion.assignee_id && (
              <button
                type="button"
                className="primary-button touch-target"
                onClick={() => void planTranscript(`Ask ${UUID_TO_NAME[suggestion.assignee_id!]}.`)}
                disabled={isProcessing}
              >
                <UserCheck size={18} aria-hidden="true" /> Ask {UUID_TO_NAME[suggestion.assignee_id]}
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
