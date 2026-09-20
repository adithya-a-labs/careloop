/**
 * CareLoop demo mock data — single source of truth.
 * Replace each section with API/Supabase calls when the backend is ready.
 */

// ─── Profiles ──────────────────────────────────────────────
export type DemoProfileId = 'amma' | 'maya' | 'rahul' | 'anu';

export interface DemoProfile {
  id: DemoProfileId;
  displayName: string;
  role: 'patient' | 'daughter' | 'son' | 'caregiver';
  roleLabel: string;
  preferredLanguage?: string;
  emoji: string;
  isPatient: boolean;
}

export const PROFILES: Record<DemoProfileId, DemoProfile> = {
  amma: {
    id: 'amma',
    displayName: 'Amma',
    role: 'patient',
    roleLabel: 'Care recipient',
    preferredLanguage: 'Malayalam',
    emoji: '👵',
    isPatient: true,
  },
  maya: {
    id: 'maya',
    displayName: 'Maya',
    role: 'daughter',
    roleLabel: 'Daughter',
    emoji: '👩',
    isPatient: false,
  },
  rahul: {
    id: 'rahul',
    displayName: 'Rahul',
    role: 'son',
    roleLabel: 'Son',
    emoji: '👨',
    isPatient: false,
  },
  anu: {
    id: 'anu',
    displayName: 'Anu',
    role: 'caregiver',
    roleLabel: 'Home nurse',
    emoji: '👩‍⚕️',
    isPatient: false,
  },
};

export const PROFILE_LIST = Object.values(PROFILES);

// ─── Care context cards (Patient Home) ─────────────────────
export interface CareContextCard {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  tone: 'cream' | 'sun' | 'peach' | 'coral' | 'success';
  time?: string;
}

export const CARE_CONTEXT_CARDS: CareContextCard[] = [
  { id: 'sleep', emoji: '😴', title: 'Sleep', subtitle: 'A little restless', tone: 'cream', time: 'Last night' },
  { id: 'lunch', emoji: '🍽️', title: 'Lunch', subtitle: 'Ate a little less', tone: 'peach', time: '12:30 PM' },
  { id: 'maya-visit', emoji: '👩', title: 'Maya visit', subtitle: 'Coming this evening', tone: 'sun', time: '5:00 PM' },
  { id: 'anu-visit', emoji: '👩‍⚕️', title: 'Nurse Anu visit', subtitle: 'Completed', tone: 'success', time: '3:00 PM' },
  { id: 'medicine', emoji: '💊', title: 'Evening medicine', subtitle: 'Check upcoming', tone: 'coral', time: '8:00 PM' },
];

// ─── Timeline events ──────────────────────────────────────
export interface TimelineEvent {
  id: string;
  emoji: string;
  title: string;
  description: string;
  time: string;
  relativeTime: string;
  reporter?: string;
  concernsPerson: string;
  kind: 'check-in' | 'visit' | 'meal' | 'medication' | 'task' | 'voice';
  isUpcoming?: boolean;
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'tl-1',
    emoji: '🍽️',
    title: "Amma didn't eat much at lunch",
    description: 'Had only a few bites of rice and dal. Mentioned not feeling very hungry.',
    time: '1:20 PM',
    relativeTime: '2 hours ago',
    reporter: 'Nurse Anu',
    concernsPerson: 'Amma',
    kind: 'meal',
  },
  {
    id: 'tl-2',
    emoji: '👩‍⚕️',
    title: 'Nurse Anu completed her visit',
    description: 'Vitals checked, light physiotherapy done. Everything looks stable.',
    time: '3:00 PM',
    relativeTime: '30 min ago',
    reporter: 'Nurse Anu',
    concernsPerson: 'Amma',
    kind: 'visit',
  },
  {
    id: 'tl-3',
    emoji: '🗣️',
    title: 'Amma checked in earlier today',
    description: '"My back was hurting a little after lunch."',
    time: '1:45 PM',
    relativeTime: '1 hour ago',
    reporter: 'Amma',
    concernsPerson: 'Amma',
    kind: 'voice',
  },
  {
    id: 'tl-4',
    emoji: '💊',
    title: 'Evening medicine check is upcoming',
    description: 'Blood pressure medication and calcium supplement at 8 PM.',
    time: '8:00 PM',
    relativeTime: 'In 4 hours',
    concernsPerson: 'Amma',
    kind: 'medication',
    isUpcoming: true,
  },
];

// ─── Tasks ─────────────────────────────────────────────────
export interface DemoTask {
  id: string;
  title: string;
  assignee?: string;
  dueLabel: string;
  status: 'open' | 'done' | 'upcoming';
  emoji: string;
  isUrgent?: boolean;
}

export const TASKS: DemoTask[] = [
  { id: 'task-1', title: 'Pick up prescription', assignee: undefined, dueLabel: 'Tomorrow', status: 'open', emoji: '💊', isUrgent: true },
  { id: 'task-2', title: "Call Dr. Menon's clinic", dueLabel: 'Today, 4:00 PM', status: 'open', emoji: '📞', assignee: 'Rahul' },
  { id: 'task-3', title: 'Take evening medicine', dueLabel: '8:00 PM', status: 'upcoming', emoji: '💊', assignee: 'Amma' },
  { id: 'task-4', title: 'Morning check-in', dueLabel: 'Completed', status: 'done', emoji: '✅', assignee: 'Amma' },
  { id: 'task-5', title: 'Evening walk', dueLabel: 'Today, 5:30 PM', status: 'upcoming', emoji: '🚶', assignee: 'Rahul' },
  { id: 'task-6', title: 'Grocery shopping', dueLabel: 'Tomorrow', status: 'open', emoji: '🛒', assignee: 'Rahul' },
];

// ─── Family Home: Catch-up sections ───────────────────────
export interface AttentionItem {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  urgency: 'high' | 'medium' | 'low';
}

export const ATTENTION_ITEMS: AttentionItem[] = [
  { id: 'att-1', emoji: '🍽️', title: 'Amma ate little at lunch', subtitle: 'Nurse Anu noted she had only a few bites', urgency: 'medium' },
  { id: 'att-2', emoji: '💊', title: 'Prescription pickup needed', subtitle: 'No one assigned yet', urgency: 'high' },
];

export const SINCE_LAST_VISIT = [
  { id: 'slv-1', emoji: '👩‍⚕️', title: "Nurse Anu's visit is complete", subtitle: 'Vitals stable, light physio done' },
  { id: 'slv-2', emoji: '🗣️', title: 'Amma checked in via voice', subtitle: '"My back was hurting a little after lunch"' },
  { id: 'slv-3', emoji: '😴', title: 'Sleep was a bit restless', subtitle: 'Woke up once during the night' },
];

export const UPCOMING_CARE = [
  { id: 'uc-1', emoji: '💊', title: 'Evening medicine check', subtitle: '8:00 PM — BP medication & calcium' },
  { id: 'uc-2', emoji: '👩', title: 'Maya visiting', subtitle: '5:00 PM today' },
  { id: 'uc-3', emoji: '📞', title: "Call Dr. Menon's clinic", subtitle: 'Rahul · 4:00 PM' },
];

// ─── Voice transcript mock ────────────────────────────────
export const VOICE_TRANSCRIPT_MOCK = "I didn't sleep very well and I didn't eat much at lunch.";
export const VOICE_SUCCESS_MESSAGE = '2 updates added to your Care Circle';

// ─── Care Circle members ──────────────────────────────────
export interface CircleMember {
  id: string;
  emoji: string;
  name: string;
  roleLabel: string;
  status?: string;
}

export const CIRCLE_MEMBERS: CircleMember[] = [
  { id: 'cm-1', emoji: '👵', name: 'Amma', roleLabel: 'Receiving care', status: undefined },
  { id: 'cm-2', emoji: '👩', name: 'Maya', roleLabel: 'Daughter', status: undefined },
  { id: 'cm-3', emoji: '👨', name: 'Rahul', roleLabel: 'Son', status: undefined },
  { id: 'cm-4', emoji: '👩‍⚕️', name: 'Anu', roleLabel: 'Caregiver', status: undefined },
];

// ─── Memory Box ───────────────────────────────────────────
export interface MemoryItem {
  id: string;
  year: string;
  title: string;
  description?: string;
  tone: 'cream' | 'sun' | 'peach' | 'coral';
}

export const MEMORY_ITEMS: MemoryItem[] = [
  { id: 'mem-1', year: '1978', title: 'My first job', description: 'Started as a teacher at the village school', tone: 'cream' },
  { id: 'mem-2', year: '1983', title: 'Our wedding day', description: 'A rainy monsoon morning in Thrissur', tone: 'sun' },
];

// ─── Wellbeing status (Patient Home) ──────────────────────
export interface WellbeingStatus {
  emoji: string;
  label: string;
  value: string;
}

export const WELLBEING_STATUS: WellbeingStatus[] = [
  { emoji: '😴', label: 'Sleep', value: 'Okay' },
  { emoji: '🍽️', label: 'Meals', value: 'Ate a little' },
  { emoji: '😊', label: 'Mood', value: 'Good' },
];
