import {
  supabase,
  isSupabaseConfigured,
  isSchemaMissingError,
} from './client';
import type { CircuitDocument } from '../../types/circuit';
import type { TiaProgramDocument } from '../plc/tiaEngine';
import type {
  CloudProject,
  DbResult,
  ExamAttemptRecord,
  UserProfile,
} from '../../types/cloud';

export const PENDING_SYNC_QUEUE_KEY = 'baru_pending_sync_v1';
export const PROFILE_CACHE_KEY = 'baru_profile_cache_v1';

const MAX_PENDING_SYNC_ITEMS = 50;
const SHARE_SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export interface OnboardingPatch {
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
  onboarding_step?: number;
}

type PendingSyncItem =
  | {
      id: string;
      kind: 'profile_onboarding';
      userId: string;
      patch: OnboardingPatch;
      allowReset?: boolean;
      queuedAt: string;
    }
  | {
      id: string;
      kind: 'project_save';
      userId: string;
      payload: {
        id?: string | null;
        title: string;
        description: string;
        circuitDoc: CircuitDocument;
        tiaProgram: TiaProgramDocument;
      };
      queuedAt: string;
    }
  | {
      id: string;
      kind: 'project_delete';
      userId: string;
      projectId: string;
      queuedAt: string;
    }
  | {
      id: string;
      kind: 'project_sharing';
      userId: string;
      projectId: string;
      enablePublic: boolean;
      queuedAt: string;
    }
  | {
      id: string;
      kind: 'exam_attempt';
      userId: string;
      payload: {
        projectId?: string | null;
        hiddenFaultId: string;
        submittedAnswer: string;
        isPassed: boolean;
        score: number;
        attempts: number;
        studentNotes: string;
      };
      queuedAt: string;
    };

type NewPendingSyncItem =
  | Omit<Extract<PendingSyncItem, { kind: 'profile_onboarding' }>, 'id' | 'queuedAt'>
  | Omit<Extract<PendingSyncItem, { kind: 'project_save' }>, 'id' | 'queuedAt'>
  | Omit<Extract<PendingSyncItem, { kind: 'project_delete' }>, 'id' | 'queuedAt'>
  | Omit<Extract<PendingSyncItem, { kind: 'project_sharing' }>, 'id' | 'queuedAt'>
  | Omit<Extract<PendingSyncItem, { kind: 'exam_attempt' }>, 'id' | 'queuedAt'>;

// ----------------------------------------------------------------------------
// Internal Utilities
// ----------------------------------------------------------------------------

function hasBrowserStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function formatDbError(
  error: unknown,
  fallback = 'Error al comunicarse con la base de datos.'
): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim().length > 0) {
      return msg;
    }
  }
  return fallback;
}

function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

function failDb<T>(error: unknown, fallback?: string): DbResult<T> {
  const schemaMissing = isSchemaMissingError(error);
  const message = formatDbError(error, fallback);
  console.error('[BaruCloud DB Error]', {
    message,
    code: getErrorCode(error),
    schemaMissing,
  });
  return schemaMissing
    ? { success: false, error: message, schemaMissing: true }
    : { success: false, error: message };
}

function notConfiguredResult<T>(): DbResult<T> {
  return {
    success: false,
    error: 'Supabase no está configurado. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
  };
}

function safeClone<T>(value: T): T {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
  } catch {
    // Fallback to JSON round-trip
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function createQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateShareSlug(length = 10): string {
  const alphabetLen = SHARE_SLUG_ALPHABET.length;
  let result = '';

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) {
      result += SHARE_SLUG_ALPHABET[bytes[i] % alphabetLen];
    }
    return result;
  }

  for (let i = 0; i < length; i += 1) {
    result += SHARE_SLUG_ALPHABET[Math.floor(Math.random() * alphabetLen)];
  }
  return result;
}

function normalizeProfile(row: Record<string, unknown>): UserProfile {
  const stepRaw = Number(row.onboarding_step);
  return {
    id: String(row.id ?? ''),
    email: typeof row.email === 'string' ? row.email : '',
    full_name: typeof row.full_name === 'string' ? row.full_name : '',
    onboarding_completed: Boolean(row.onboarding_completed),
    onboarding_skipped: Boolean(row.onboarding_skipped),
    onboarding_step: Number.isFinite(stepRaw) && stepRaw >= 1 ? Math.floor(stepRaw) : 1,
    created_at:
      typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updated_at:
      typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  };
}

function normalizeProject(row: Record<string, unknown>): CloudProject {
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    title: typeof row.title === 'string' && row.title.trim() ? row.title : 'Sin título',
    description: typeof row.description === 'string' ? row.description : '',
    circuit_doc: row.circuit_doc as CircuitDocument,
    tia_program: row.tia_program as TiaProgramDocument,
    share_slug: typeof row.share_slug === 'string' ? row.share_slug : null,
    is_public: Boolean(row.is_public),
    created_at:
      typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updated_at:
      typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  };
}

function normalizeExamAttempt(row: Record<string, unknown>): ExamAttemptRecord {
  const scoreNum = Number(row.score);
  const attemptsNum = Number(row.attempts);
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    project_id: typeof row.project_id === 'string' ? row.project_id : null,
    hidden_fault_id: String(row.hidden_fault_id ?? ''),
    submitted_answer: String(row.submitted_answer ?? ''),
    is_passed: Boolean(row.is_passed),
    score: Number.isFinite(scoreNum) ? scoreNum : 0,
    attempts: Number.isFinite(attemptsNum) && attemptsNum >= 1 ? Math.floor(attemptsNum) : 1,
    student_notes: typeof row.student_notes === 'string' ? row.student_notes : '',
    created_at:
      typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// Profile Local Read Cache (Offline Fallback + Anti-Null-Overwrite Guard)
// ----------------------------------------------------------------------------

function readAllProfileCaches(): Record<string, UserProfile> {
  if (!hasBrowserStorage()) return {};
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, UserProfile>;
    }
  } catch {
    // Ignore corrupted cache
  }
  return {};
}

export function readProfileCache(userId: string): UserProfile | null {
  if (!userId) return null;
  const all = readAllProfileCaches();
  const entry = all[userId];
  if (!entry || typeof entry !== 'object') return null;
  return normalizeProfile(entry as unknown as Record<string, unknown>);
}

export function writeProfileCache(
  profile: UserProfile,
  options?: { allowDowngrade?: boolean }
): UserProfile {
  const existing = readProfileCache(profile.id);
  let merged: UserProfile = { ...profile };

  if (existing && !options?.allowDowngrade) {
    const completed = existing.onboarding_completed || profile.onboarding_completed;
    merged = {
      ...profile,
      email: profile.email.trim() || existing.email,
      full_name: profile.full_name.trim() || existing.full_name,
      onboarding_completed: completed,
      onboarding_skipped: completed ? false : profile.onboarding_skipped,
      onboarding_step: Math.max(1, profile.onboarding_step || existing.onboarding_step || 1),
    };
  }

  if (hasBrowserStorage()) {
    try {
      const all = readAllProfileCaches();
      all[merged.id] = merged;
      window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(all));
    } catch {
      // Ignore QuotaExceededError / private browsing failures
    }
  }

  return merged;
}

// ----------------------------------------------------------------------------
// Offline Pending Sync Queue (Retry Fallback ONLY after DB Failure)
// ----------------------------------------------------------------------------

function readPendingSyncQueue(): PendingSyncItem[] {
  if (!hasBrowserStorage()) return [];
  try {
    const raw = window.localStorage.getItem(PENDING_SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingSyncItem[]) : [];
  } catch {
    return [];
  }
}

function writePendingSyncQueue(items: PendingSyncItem[]): void {
  if (!hasBrowserStorage()) return;
  try {
    const bounded =
      items.length > MAX_PENDING_SYNC_ITEMS
        ? items.slice(items.length - MAX_PENDING_SYNC_ITEMS)
        : items;
    if (bounded.length === 0) {
      window.localStorage.removeItem(PENDING_SYNC_QUEUE_KEY);
    } else {
      window.localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(bounded));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function enqueuePendingSync(item: NewPendingSyncItem): void {
  const queue = readPendingSyncQueue();
  const entry: PendingSyncItem = {
    ...item,
    id: createQueueId(),
    queuedAt: new Date().toISOString(),
  } as PendingSyncItem;

  if (entry.kind === 'profile_onboarding') {
    const existingIdx = queue.findIndex(
      (q) => q.kind === 'profile_onboarding' && q.userId === entry.userId
    );
    if (existingIdx >= 0) {
      const prev = queue[existingIdx] as Extract<
        PendingSyncItem,
        { kind: 'profile_onboarding' }
      >;
      const mergedPatch: OnboardingPatch = {
        ...prev.patch,
        ...entry.patch,
      };
      // Protect against downgrading onboarding_completed unless allowReset is explicit
      if (prev.patch.onboarding_completed === true && !entry.allowReset) {
        mergedPatch.onboarding_completed = true;
        mergedPatch.onboarding_skipped = false;
      }
      queue[existingIdx] = {
        ...entry,
        patch: mergedPatch,
        allowReset: Boolean(entry.allowReset),
      };
      writePendingSyncQueue(queue);
      return;
    }
  } else if (entry.kind === 'project_save' && entry.payload.id) {
    const filtered = queue.filter(
      (q) =>
        !(
          q.kind === 'project_save' &&
          q.userId === entry.userId &&
          q.payload.id === entry.payload.id
        )
    );
    filtered.push(entry);
    writePendingSyncQueue(filtered);
    return;
  } else if (entry.kind === 'project_delete') {
    const filtered = queue.filter(
      (q) =>
        !(
          q.userId === entry.userId &&
          ((q.kind === 'project_delete' && q.projectId === entry.projectId) ||
            (q.kind === 'project_sharing' && q.projectId === entry.projectId) ||
            (q.kind === 'project_save' && q.payload.id === entry.projectId))
        )
    );
    filtered.push(entry);
    writePendingSyncQueue(filtered);
    return;
  } else if (entry.kind === 'project_sharing') {
    const filtered = queue.filter(
      (q) =>
        !(
          q.kind === 'project_sharing' &&
          q.userId === entry.userId &&
          q.projectId === entry.projectId
        )
    );
    filtered.push(entry);
    writePendingSyncQueue(filtered);
    return;
  }

  queue.push(entry);
  writePendingSyncQueue(queue);
}

export function getPendingSyncCount(userId?: string): number {
  const queue = readPendingSyncQueue();
  if (!userId) return queue.length;
  return queue.filter((item) => item.userId === userId).length;
}

// ----------------------------------------------------------------------------
// 1. User Profiles & Onboarding (DB-First + Anti-Null-Overwrite)
// ----------------------------------------------------------------------------

export async function ensureUserProfile(
  userId: string,
  email: string,
  fullName?: string
): Promise<DbResult<UserProfile>> {
  if (!isSupabaseConfigured || !supabase) {
    return notConfiguredResult();
  }

  try {
    const cleanEmail = (email ?? '').trim();
    const cleanName = (fullName ?? '').trim();
    const cached = readProfileCache(userId);

    const { data: existingRow, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      return failDb(selectError, 'No se pudo consultar el perfil del usuario.');
    }

    let dbProfile: UserProfile;

    if (!existingRow) {
      const insertPayload = {
        id: userId,
        email: cleanEmail || cached?.email || '',
        full_name: cleanName || cached?.full_name || '',
        onboarding_completed: cached?.onboarding_completed ?? false,
        onboarding_skipped: cached?.onboarding_completed
          ? false
          : (cached?.onboarding_skipped ?? false),
        onboarding_step: Math.max(1, cached?.onboarding_step ?? 1),
      };

      const { data: insertedRow, error: insertError } = await supabase
        .from('profiles')
        .insert(insertPayload)
        .select('*')
        .single();

      if (insertError) {
        // Race condition: DB trigger handle_new_user() created the row simultaneously
        if (getErrorCode(insertError) === '23505') {
          const { data: refetchedRow, error: refetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (refetchError || !refetchedRow) {
            return failDb(
              refetchError ?? insertError,
              'No se pudo recuperar el perfil recién creado.'
            );
          }
          dbProfile = normalizeProfile(refetchedRow as Record<string, unknown>);
        } else {
          return failDb(insertError, 'No se pudo crear el perfil del usuario.');
        }
      } else {
        dbProfile = normalizeProfile(insertedRow as Record<string, unknown>);
      }
    } else {
      dbProfile = normalizeProfile(existingRow as Record<string, unknown>);
    }

    // Anti-Null-Overwrite Healing:
    // Never allow a blank DB field or false onboarding_completed to wipe known valid progress.
    const healPatch: Partial<{
      email: string;
      full_name: string;
      onboarding_completed: boolean;
      onboarding_skipped: boolean;
      onboarding_step: number;
    }> = {};

    if (!dbProfile.onboarding_completed && cached?.onboarding_completed === true) {
      healPatch.onboarding_completed = true;
      healPatch.onboarding_skipped = false;
      healPatch.onboarding_step = Math.max(
        dbProfile.onboarding_step,
        cached.onboarding_step
      );
    }

    const bestEmail = cleanEmail || cached?.email || '';
    if (!dbProfile.email && bestEmail) {
      healPatch.email = bestEmail;
    }

    const bestName = cleanName || cached?.full_name || '';
    if (!dbProfile.full_name && bestName) {
      healPatch.full_name = bestName;
    }

    if (Object.keys(healPatch).length > 0) {
      const { data: healedRow, error: healError } = await supabase
        .from('profiles')
        .update(healPatch)
        .eq('id', userId)
        .select('*')
        .single();

      if (!healError && healedRow) {
        dbProfile = normalizeProfile(healedRow as Record<string, unknown>);
      } else if (healError) {
        console.warn('[BaruCloud] Profile self-heal failed, queueing onboarding sync:', healError.message);
        if (healPatch.onboarding_completed) {
          enqueuePendingSync({
            kind: 'profile_onboarding',
            userId,
            patch: {
              onboarding_completed: true,
              onboarding_skipped: false,
              onboarding_step: healPatch.onboarding_step,
            },
          });
        }
        dbProfile = {
          ...dbProfile,
          ...healPatch,
        };
      }
    }

    const cachedProfile = writeProfileCache(dbProfile, { allowDowngrade: false });
    return { success: true, data: cachedProfile };
  } catch (err) {
    return failDb(err, 'Error inesperado al sincronizar el perfil del usuario.');
  }
}

async function updateOnboardingStateInternal(
  userId: string,
  patch: OnboardingPatch,
  options?: { allowReset?: boolean; skipQueueOnFailure?: boolean }
): Promise<DbResult<UserProfile>> {
  if (!isSupabaseConfigured || !supabase) {
    return notConfiguredResult();
  }

  const allowReset = Boolean(options?.allowReset);
  const sanitizedPatch: OnboardingPatch = {};

  // Anti-Null-Overwrite Guard:
  // Never overwrite onboarding_completed=true with false unless explicitly requested via resetOnboarding.
  if (patch.onboarding_completed === true) {
    sanitizedPatch.onboarding_completed = true;
    sanitizedPatch.onboarding_skipped = false;
  } else if (patch.onboarding_completed === false && allowReset) {
    sanitizedPatch.onboarding_completed = false;
  }

  if (
    typeof patch.onboarding_skipped === 'boolean' &&
    sanitizedPatch.onboarding_completed !== true
  ) {
    sanitizedPatch.onboarding_skipped = patch.onboarding_skipped;
  }

  if (
    typeof patch.onboarding_step === 'number' &&
    Number.isFinite(patch.onboarding_step)
  ) {
    sanitizedPatch.onboarding_step = Math.max(1, Math.floor(patch.onboarding_step));
  }

  try {
    if (Object.keys(sanitizedPatch).length === 0) {
      const { data: currentRow, error: readErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (readErr) {
        return failDb(readErr, 'No se pudo leer el estado de onboarding.');
      }
      if (!currentRow) {
        return {
          success: false,
          error: 'No se encontró el perfil del usuario en la base de datos.',
        };
      }
      const normalized = writeProfileCache(
        normalizeProfile(currentRow as Record<string, unknown>),
        { allowDowngrade: allowReset }
      );
      return { success: true, data: normalized };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(sanitizedPatch)
      .eq('id', userId)
      .select('*')
      .maybeSingle();

    if (error) {
      if (!options?.skipQueueOnFailure) {
        enqueuePendingSync({
          kind: 'profile_onboarding',
          userId,
          patch: sanitizedPatch,
          allowReset,
        });
      }
      return failDb(error, 'No se pudo actualizar el estado del tutorial.');
    }

    if (!data) {
      return {
        success: false,
        error: 'No se encontró el perfil del usuario para actualizar el tutorial.',
      };
    }

    const updated = writeProfileCache(
      normalizeProfile(data as Record<string, unknown>),
      { allowDowngrade: allowReset }
    );
    return { success: true, data: updated };
  } catch (err) {
    if (!options?.skipQueueOnFailure) {
      enqueuePendingSync({
        kind: 'profile_onboarding',
        userId,
        patch: sanitizedPatch,
        allowReset,
      });
    }
    return failDb(err, 'Error inesperado al actualizar el estado del tutorial.');
  }
}

export async function updateOnboardingState(
  userId: string,
  patch: OnboardingPatch,
  options?: { allowReset?: boolean }
): Promise<DbResult<UserProfile>> {
  return updateOnboardingStateInternal(userId, patch, options);
}

// ----------------------------------------------------------------------------
// 2. Cloud Projects CRUD & Public Sharing
// ----------------------------------------------------------------------------

export async function listUserProjects(
  userId: string
): Promise<DbResult<CloudProject[]>> {
  if (!isSupabaseConfigured || !supabase) {
    return notConfiguredResult();
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      return failDb(error, 'No se pudieron cargar tus proyectos en la nube.');
    }

    const projects = (data ?? []).map((row) =>
      normalizeProject(row as Record<string, unknown>)
    );
    return { success: true, data: projects };
  } catch (err) {
    return failDb(err, 'Error inesperado al listar tus proyectos.');
  }
}

async function saveProjectToCloudInternal(
  params: {
    id?: string | null;
    userId: string;
    title: string;
    description?: string;
    circuitDoc: CircuitDocument;
    tiaProgram: TiaProgramDocument;
  },
  skipQueueOnFailure = false
): Promise<DbResult<CloudProject>> {
  if (!isSupabaseConfigured || !supabase) {
    return notConfiguredResult();
  }

  const title = params.title.trim() || 'Sin título';
  const description = (params.description ?? '').trim();
  const projectId = params.id?.trim() || null;

  const enqueueOnError = () => {
    if (skipQueueOnFailure) return;
    enqueuePendingSync({
      kind: 'project_save',
      userId: params.userId,
      payload: {
        id: projectId,
        title,
        description,
        circuitDoc: safeClone(params.circuitDoc),
        tiaProgram: safeClone(params.tiaProgram),
      },
    });
  };

  try {
    if (projectId) {
      const { data, error } = await supabase
        .from('projects')
        .update({
          title,
          description,
          circuit_doc: params.circuitDoc,
          tia_program: params.tiaProgram,
        })
        .eq('id', projectId)
        .eq('user_id', params.userId)
        .select('*')
        .maybeSingle();

      if (error) {
        enqueueOnError();
        return failDb(error, 'No se pudo actualizar el proyecto en la nube.');
      }

      if (!data) {
        return {
          success: false,
          error:
            'No se encontró el proyecto para actualizar o no tienes permisos sobre él.',
        };
      }

      return {
        success: true,
        data: normalizeProject(data as Record<string, unknown>),
      };
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: params.userId,
        title,
        description,
        circuit_doc: params.circuitDoc,
        tia_program: params.tiaProgram,
        is_public: false,
        share_slug: null,
      })
      .select('*')
      .single();

    if (error) {
      enqueueOnError();
      return failDb(error, 'No se pudo guardar el nuevo proyecto en la nube.');
    }

    return {
      success: true,
      data: normalizeProject(data as Record<string, unknown>),
    };
  } catch (err) {
    enqueueOnError();
    return failDb(err, 'Error inesperado al guardar el proyecto en la nube.');
  }
}

export async function saveProjectToCloud(params: {
  id?: string | null;
  userId: string;
  title: string;
  description?: string;
  circuitDoc: CircuitDocument;
  tiaProgram: TiaProgramDocument;
}): Promise<DbResult<CloudProject>> {
  return saveProjectToCloudInternal(params, false);
}

export async function duplicateCloudProject(
  project: CloudProject,
  userId: string
): Promise<DbResult<CloudProject>> {
  if (!isSupabaseConfigured || !supabase) {
    return notConfiguredResult();
  }

  try {
    const baseTitle = (project.title || 'Sin título').trim() || 'Sin título';
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title: `${baseTitle} (copia)`,
        description: project.description ?? '',
        circuit_doc: safeClone(project.circuit_doc),
        tia_program: safeClone(project.tia_program),
        is_public: false,
        share_slug: null,
      })
      .select('*')
      .single();

    if (error) {
      return failDb(error, 'No se pudo duplicar el proyecto.');
    }

    return {
      success: true,
      data: normalizeProject(data as Record<string, unknown>),
    };
  } catch (err) {
    return failDb(err, 'Error inesperado al duplicar el proyecto.');
  }
}

async function deleteCloudProjectInternal(
  projectId: string,
  userId: string,
  skipQueueOnFailure = false
): Promise<DbResult<boolean>> {
  if (!isSupabaseConfigured || !supabase) {
    return notConfiguredResult();
  }

  const cleanProjectId = projectId.trim();
  const cleanUserId = userId.trim();
  if (!cleanProjectId || !cleanUserId) {
    return {
      success: false,
      error: 'Identificador de proyecto o usuario inválido para eliminar.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', cleanProjectId)
      .eq('user_id', cleanUserId)
      .select('id');

    if (error) {
      if (!skipQueueOnFailure) {
        enqueuePendingSync({
          kind: 'project_delete',
          userId: cleanUserId,
          projectId: cleanProjectId,
        });
      }
      return failDb(error, 'No se pudo eliminar el proyecto.');
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'No se encontró el proyecto a eliminar o no tienes permisos.',
      };
    }

    return { success: true, data: true };
  } catch (err) {
    if (!skipQueueOnFailure) {
      enqueuePendingSync({
        kind: 'project_delete',
        userId: cleanUserId,
        projectId: cleanProjectId,
      });
    }
    return failDb(err, 'Error inesperado al eliminar el proyecto.');
  }
}

export async function deleteCloudProject(
  projectId: string,
  userId: string
): Promise<DbResult<boolean>> {
  return deleteCloudProjectInternal(projectId, userId, false);
}

async function toggleProjectSharingInternal(
  projectId: string,
  userId: string,
  enablePublic: boolean,
  skipQueueOnFailure = false
): Promise<DbResult<CloudProject>> {
  if (!isSupabaseConfigured || !supabase) {
    return notConfiguredResult();
  }

  const enqueueOnError = () => {
    if (skipQueueOnFailure) return;
    enqueuePendingSync({
      kind: 'project_sharing',
      userId,
      projectId,
      enablePublic,
    });
  };

  try {
    const { data: existing, error: fetchError } = await supabase
      .from('projects')
      .select('id, share_slug, is_public')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      enqueueOnError();
      return failDb(fetchError, 'No se pudo consultar el estado de compartición.');
    }

    if (!existing) {
      return {
        success: false,
        error: 'Proyecto no encontrado o sin permisos para compartir.',
      };
    }

    if (!enablePublic) {
      const { data, error } = await supabase
        .from('projects')
        .update({ is_public: false })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        enqueueOnError();
        return failDb(error, 'No se pudo desactivar el enlace compartido.');
      }

      return {
        success: true,
        data: normalizeProject(data as Record<string, unknown>),
      };
    }

    const existingSlug =
      typeof existing.share_slug === 'string' && existing.share_slug.trim().length > 0
        ? existing.share_slug.trim()
        : null;

    const maxAttempts = existingSlug ? 1 : 3;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidateSlug = existingSlug ?? generateShareSlug(10);
      const { data, error } = await supabase
        .from('projects')
        .update({
          is_public: true,
          share_slug: candidateSlug,
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select('*')
        .single();

      if (!error && data) {
        return {
          success: true,
          data: normalizeProject(data as Record<string, unknown>),
        };
      }

      lastError = error;
      if (getErrorCode(error) !== '23505') {
        break;
      }
    }

    enqueueOnError();
    return failDb(lastError, 'No se pudo activar el enlace público del proyecto.');
  } catch (err) {
    enqueueOnError();
    return failDb(err, 'Error inesperado al cambiar la visibilidad del proyecto.');
  }
}

export async function toggleProjectSharing(
  projectId: string,
  userId: string,
  enablePublic: boolean
): Promise<DbResult<CloudProject>> {
  return toggleProjectSharingInternal(projectId, userId, enablePublic, false);
}

export async function fetchSharedProjectBySlug(
  slug: string
): Promise<DbResult<CloudProject | null>> {
  if (!isSupabaseConfigured || !supabase) {
    return notConfiguredResult();
  }

  const cleanSlug = slug.trim();
  if (!cleanSlug) {
    return { success: true, data: null };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('share_slug', cleanSlug)
      .eq('is_public', true)
      .maybeSingle();

    if (error) {
      return failDb(error, 'No se pudo cargar el proyecto compartido.');
    }

    return {
      success: true,
      data: data ? normalizeProject(data as Record<string, unknown>) : null,
    };
  } catch (err) {
    return failDb(err, 'Error inesperado al buscar el proyecto compartido.');
  }
}

// ----------------------------------------------------------------------------
// 3. Exam Attempts Persistence
// ----------------------------------------------------------------------------

async function recordExamAttemptInternal(
  params: {
    userId: string;
    projectId?: string | null;
    hiddenFaultId: string;
    submittedAnswer: string;
    isPassed: boolean;
    score: number;
    attempts: number;
    studentNotes: string;
  },
  skipQueueOnFailure = false
): Promise<DbResult<ExamAttemptRecord>> {
  if (!isSupabaseConfigured || !supabase) {
    return notConfiguredResult();
  }

  const clampedScore = Math.max(
    0,
    Math.min(99.9, Math.round((Number(params.score) || 0) * 10) / 10)
  );
  const safeAttempts = Math.max(1, Math.floor(Number(params.attempts) || 1));
  const projectId = params.projectId?.trim() || null;
  const studentNotes = params.studentNotes ?? '';

  const enqueueOnError = () => {
    if (skipQueueOnFailure) return;
    enqueuePendingSync({
      kind: 'exam_attempt',
      userId: params.userId,
      payload: {
        projectId,
        hiddenFaultId: params.hiddenFaultId,
        submittedAnswer: params.submittedAnswer,
        isPassed: params.isPassed,
        score: clampedScore,
        attempts: safeAttempts,
        studentNotes,
      },
    });
  };

  try {
    const { data, error } = await supabase
      .from('exam_attempts')
      .insert({
        user_id: params.userId,
        project_id: projectId,
        hidden_fault_id: params.hiddenFaultId,
        submitted_answer: params.submittedAnswer,
        is_passed: params.isPassed,
        score: clampedScore,
        attempts: safeAttempts,
        student_notes: studentNotes,
      })
      .select('*')
      .single();

    if (error) {
      enqueueOnError();
      return failDb(error, 'No se pudo registrar el intento de evaluación.');
    }

    return {
      success: true,
      data: normalizeExamAttempt(data as Record<string, unknown>),
    };
  } catch (err) {
    enqueueOnError();
    return failDb(err, 'Error inesperado al guardar la evaluación.');
  }
}

export async function recordExamAttempt(params: {
  userId: string;
  projectId?: string | null;
  hiddenFaultId: string;
  submittedAnswer: string;
  isPassed: boolean;
  score: number;
  attempts: number;
  studentNotes: string;
}): Promise<DbResult<ExamAttemptRecord>> {
  return recordExamAttemptInternal(params, false);
}

export async function listUserExamAttempts(
  userId: string
): Promise<DbResult<ExamAttemptRecord[]>> {
  if (!isSupabaseConfigured || !supabase) {
    return notConfiguredResult();
  }

  try {
    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return failDb(error, 'No se pudo cargar el historial de evaluaciones.');
    }

    const records = (data ?? []).map((row) =>
      normalizeExamAttempt(row as Record<string, unknown>)
    );
    return { success: true, data: records };
  } catch (err) {
    return failDb(err, 'Error inesperado al cargar las evaluaciones.');
  }
}

// ----------------------------------------------------------------------------
// 4. Offline Queue Flush (Replays Pending Mutations to Supabase)
// ----------------------------------------------------------------------------

export async function flushPendingSyncQueue(
  userId: string
): Promise<{ flushed: number; remaining: number }> {
  const allItems = readPendingSyncQueue();
  const userItems = allItems.filter((item) => item.userId === userId);
  const otherItems = allItems.filter((item) => item.userId !== userId);

  if (userItems.length === 0 || !isSupabaseConfigured || !supabase) {
    return { flushed: 0, remaining: userItems.length };
  }

  let flushed = 0;
  const remainingUserItems: PendingSyncItem[] = [];

  for (let i = 0; i < userItems.length; i += 1) {
    const item = userItems[i];
    let result: DbResult<unknown>;

    switch (item.kind) {
      case 'profile_onboarding':
        result = await updateOnboardingStateInternal(item.userId, item.patch, {
          allowReset: item.allowReset,
          skipQueueOnFailure: true,
        });
        break;
      case 'project_save':
        result = await saveProjectToCloudInternal(
          {
            id: item.payload.id,
            userId: item.userId,
            title: item.payload.title,
            description: item.payload.description,
            circuitDoc: item.payload.circuitDoc,
            tiaProgram: item.payload.tiaProgram,
          },
          true
        );
        break;
      case 'project_delete':
        result = await deleteCloudProjectInternal(item.projectId, item.userId, true);
        break;
      case 'project_sharing':
        result = await toggleProjectSharingInternal(
          item.projectId,
          item.userId,
          item.enablePublic,
          true
        );
        break;
      case 'exam_attempt':
        result = await recordExamAttemptInternal(
          {
            userId: item.userId,
            projectId: item.payload.projectId,
            hiddenFaultId: item.payload.hiddenFaultId,
            submittedAnswer: item.payload.submittedAnswer,
            isPassed: item.payload.isPassed,
            score: item.payload.score,
            attempts: item.payload.attempts,
            studentNotes: item.payload.studentNotes,
          },
          true
        );
        break;
    }

    if (result.success) {
      flushed += 1;
    } else {
      remainingUserItems.push(item);
      // If schema is missing, stop hammering Supabase and keep remaining items queued.
      if (result.schemaMissing) {
        for (let j = i + 1; j < userItems.length; j += 1) {
          remainingUserItems.push(userItems[j]);
        }
        break;
      }
    }
  }

  writePendingSyncQueue([...otherItems, ...remainingUserItems]);
  return { flushed, remaining: remainingUserItems.length };
}
