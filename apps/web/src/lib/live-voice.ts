import type { DemoProfile } from './mock-data';
import { createLiveSession } from './api';

interface LiveVoiceCallbacks {
  onConnected: () => void;
  onInputTranscript: (transcript: string) => void;
  onSpeaking: () => void;
  onError: (message: string) => void;
}

export interface LiveVoiceConnection {
  transcript: () => string;
  close: () => void;
}

export async function startLiveVoice(
  profile: DemoProfile,
  callbacks: LiveVoiceCallbacks,
): Promise<LiveVoiceConnection> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not available in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const peer = new RTCPeerConnection();
  const audio = new Audio();
  audio.autoplay = true;
  let transcript = '';

  for (const track of stream.getTracks()) peer.addTrack(track, stream);
  peer.ontrack = (event) => {
    audio.srcObject = event.streams[0];
    event.track.onunmute = callbacks.onSpeaking;
    void audio.play().catch(() => undefined);
  };

  const events = peer.createDataChannel('oai-events');
  events.onopen = callbacks.onConnected;
  events.onerror = () => callbacks.onError('The live voice connection was interrupted.');
  events.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data) as {
        type?: string;
        delta?: string;
        error?: { message?: string };
      };
      if (event.type === 'session.input_transcript.delta' && event.delta) {
        transcript += event.delta;
        callbacks.onInputTranscript(transcript.trim());
      } else if (event.type === 'session.output_transcript.delta') {
        callbacks.onSpeaking();
      } else if (event.type === 'error') {
        callbacks.onError(event.error?.message ?? 'The live voice session reported an error.');
      }
    } catch {
      // Forward-compatible: ignore event types or payloads this UI does not use.
    }
  };

  try {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const live = await createLiveSession(offer.sdp ?? '', profile);
    await peer.setRemoteDescription({ type: 'answer', sdp: live.transport.sdp });
  } catch (error) {
    events.close();
    peer.close();
    stream.getTracks().forEach((track) => track.stop());
    audio.srcObject = null;
    throw error;
  }

  return {
    transcript: () => transcript.trim(),
    close: () => {
      events.close();
      peer.close();
      stream.getTracks().forEach((track) => track.stop());
      audio.srcObject = null;
    },
  };
}
