import type { DemoProfile } from '../../lib/mock-data';

export type CareExperience = 'patient' | 'family' | 'caregiver';

export interface VoiceExperienceCopy {
  heading: string;
  helper: string;
  prompts: readonly string[];
}

const VOICE_COPY: Record<CareExperience, VoiceExperienceCopy> = {
  patient: {
    heading: 'What can I help with today?',
    helper: 'Ask about today, your family, or share a memory.',
    prompts: [
      'How am I doing today?',
      'What do I have today?',
      'When is Maya coming?',
      'I want to tell you a memory.',
    ],
  },
  family: {
    heading: 'How can CareLoop help your family?',
    helper: 'Catch up, coordinate care, or update a task.',
    prompts: [
      'Catch me up.',
      'How is Amma?',
      'Who can help tomorrow?',
      'What do I need to do?',
      'Mark that done.',
    ],
  },
  caregiver: {
    heading: 'What do you need for today’s visit?',
    helper: 'Review the visit, complete assigned work, or share an update.',
    prompts: [
      'What should I know before my visit?',
      'Log today’s visit.',
      'Mark my visit complete.',
      'Amma ate well today.',
    ],
  },
};

export function getCareExperience(profile: DemoProfile): CareExperience {
  if (profile.role === 'patient') return 'patient';
  if (profile.role === 'caregiver') return 'caregiver';
  return 'family';
}

export function getHomeRoute(profile: DemoProfile) {
  return getCareExperience(profile) === 'patient' ? '/home' : '/family';
}

export function canAccessMemoryBox(profile: DemoProfile) {
  return getCareExperience(profile) !== 'caregiver';
}

export function getVoiceExperienceCopy(profile: DemoProfile) {
  return VOICE_COPY[getCareExperience(profile)];
}
