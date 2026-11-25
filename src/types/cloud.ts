import { CircuitDocument } from './circuit';
import { TiaProgramDocument } from '../core/plc/tiaEngine';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  onboarding_completed: boolean;
  onboarding_skipped: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface CloudProject {
  id: string;
  user_id: string;
  title: string;
  description: string;
  circuit_doc: CircuitDocument;
  tia_program: TiaProgramDocument;
  share_slug: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExamAttemptRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  hidden_fault_id: string;
  submitted_answer: string;
  is_passed: boolean;
  score: number;
  attempts: number;
  student_notes: string;
  created_at: string;
}

export type CloudSyncStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

export type DbResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; schemaMissing?: boolean };
