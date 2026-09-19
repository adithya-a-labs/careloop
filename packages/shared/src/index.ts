export type CareRole = 'care-recipient' | 'family' | 'coordinator';
export type CareEventKind = 'check-in' | 'appointment' | 'note' | 'task' | 'memory';
export type TaskStatus = 'open' | 'in_progress' | 'done';

export interface Profile { id: string; displayName: string; role: CareRole; avatarUrl?: string; }
export interface CareTask { id: string; title: string; assignee?: Profile; dueAt?: string; status: TaskStatus; }
export interface CareEvent { id: string; kind: CareEventKind; title: string; occurredAt: string; summary?: string; }

export const SAFETY_NOTICE = 'CareLoop coordinates and summarizes. It does not diagnose, prescribe, or alter medication.';
