import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../core/supabase/client';
import {
  ensureUserProfile,
  flushPendingSyncQueue,
  readProfileCache,
  updateOnboardingState,
  writeProfileCache,
  type OnboardingPatch,
} from '../core/supabase/repository';
import type { UserProfile } from '../types/cloud';

export interface AuthActionResult {
  success: boolean;
  error?: string;
  emailConfirmationRequired?: boolean;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  schemaMissing: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  resendConfirmationEmail: (email: string) => Promise<AuthActionResult>;
  refreshProfile: () => Promise<UserProfile | null>;
  completeOnboarding: () => Promise<AuthActionResult>;
  skipOnboarding: () => Promise<AuthActionResult>;
  resetOnboarding: () => Promise<AuthActionResult>;
  setOnboardingStep: (step: number) => Promise<AuthActionResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function extractFullName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  if (!meta) return '';
  const fullName = meta.full_name;
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim();
  }
  const name = meta.name;
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }
  return '';
}

function buildFallbackProfile(user: User, existing?: UserProfile | null): UserProfile {
  const cached = existing ?? readProfileCache(user.id);
  const now = new Date().toISOString();
  if (cached) {
    return {
      ...cached,
      id: user.id,
      email: cached.email || user.email || '',
      full_name: cached.full_name || extractFullName(user),
    };
  }
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: extractFullName(user),
    onboarding_completed: false,
    onboarding_skipped: false,
    onboarding_step: 1,
    created_at: now,
    updated_at: now,
  };
}

function isUnconfirmedEmailError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { message?: unknown; code?: unknown };
  const code = typeof err.code === 'string' ? err.code.toLowerCase() : '';
  const msg = typeof err.message === 'string' ? err.message.toLowerCase() : '';
  return code === 'email_not_confirmed' || msg.includes('email not confirmed');
}

function translateAuthError(error: unknown): string {
  if (!error) {
    return 'Ocurrió un error inesperado con la autenticación.';
  }

  const rawCode =
    typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code.toLowerCase()
      : '';
  const rawMessage =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';

  const lower = rawMessage.toLowerCase();

  if (
    rawCode === 'invalid_credentials' ||
    lower.includes('invalid login credentials') ||
    lower.includes('invalid email or password')
  ) {
    return 'Correo electrónico o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.';
  }

  if (rawCode === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return 'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada (o spam) o reenvía el enlace de confirmación.';
  }

  if (
    rawCode === 'user_already_exists' ||
    rawCode === 'email_exists' ||
    lower.includes('user already registered') ||
    lower.includes('already been registered')
  ) {
    return 'Ya existe una cuenta registrada con este correo electrónico. Inicia sesión en su lugar.';
  }

  if (
    rawCode === 'weak_password' ||
    lower.includes('password should be at least') ||
    lower.includes('password is too short')
  ) {
    return 'La contraseña es demasiado corta o débil. Utiliza al menos 6 caracteres.';
  }

  if (
    rawCode === 'validation_failed' ||
    lower.includes('unable to validate email address') ||
    lower.includes('invalid email')
  ) {
    return 'El formato del correo electrónico no es válido.';
  }

  if (
    rawCode === 'over_email_send_rate_limit' ||
    rawCode === 'over_request_rate_limit' ||
    lower.includes('rate limit') ||
    lower.includes('for security purposes, you can only request this after')
  ) {
    return 'Has realizado demasiados intentos en poco tiempo. Espera unos minutos antes de volver a intentarlo.';
  }

  if (rawCode === 'signup_disabled' || lower.includes('signups not allowed')) {
    return 'El registro de nuevas cuentas está deshabilitado temporalmente.';
  }

  if (rawCode === 'user_not_found' || lower.includes('user not found')) {
    return 'No existe ninguna cuenta asociada a este correo electrónico.';
  }

  if (
    rawCode === 'otp_expired' ||
    lower.includes('token has expired') ||
    lower.includes('expired')
  ) {
    return 'El enlace o código de verificación ha expirado. Solicita uno nuevo.';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('fetch failed') ||
    lower.includes('network request failed')
  ) {
    return 'No se pudo conectar con el servidor de autenticación. Comprueba tu conexión a internet.';
  }

  return rawMessage || 'Ocurrió un error inesperado con la autenticación.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [schemaMissing, setSchemaMissing] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const syncSeqRef = useRef<number>(0);
  const inFlightSyncRef = useRef<{
    userId: string;
    promise: Promise<UserProfile | null>;
  } | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const syncAuthenticatedUser = useCallback(
    async (authUser: User, options?: { force?: boolean }): Promise<UserProfile | null> => {
      if (!options?.force && inFlightSyncRef.current?.userId === authUser.id) {
        return inFlightSyncRef.current.promise;
      }

      const seq = ++syncSeqRef.current;

      const task = (async (): Promise<UserProfile | null> => {
        const res = await ensureUserProfile(
          authUser.id,
          authUser.email ?? '',
          extractFullName(authUser)
        );

        if (!isMountedRef.current || seq !== syncSeqRef.current) {
          return null;
        }

        if (res.success) {
          setProfile(res.data);
          setSchemaMissing(false);

          const flushResult = await flushPendingSyncQueue(authUser.id);
          if (
            flushResult.flushed > 0 &&
            isMountedRef.current &&
            seq === syncSeqRef.current
          ) {
            const refreshed = await ensureUserProfile(
              authUser.id,
              authUser.email ?? '',
              extractFullName(authUser)
            );
            if (refreshed.success && isMountedRef.current && seq === syncSeqRef.current) {
              setProfile(refreshed.data);
              return refreshed.data;
            }
          }
          return res.data;
        }

        if (res.schemaMissing) {
          setSchemaMissing(true);
          const fallback = writeProfileCache(buildFallbackProfile(authUser), {
            allowDowngrade: false,
          });
          setProfile(fallback);
          return fallback;
        }

        // Transient offline/network failure: surface cached read fallback without hiding error
        const cached = readProfileCache(authUser.id);
        if (cached) {
          setProfile(cached);
          return cached;
        }
        return null;
      })();

      inFlightSyncRef.current = { userId: authUser.id, promise: task };

      try {
        return await task;
      } finally {
        if (inFlightSyncRef.current?.promise === task) {
          inFlightSyncRef.current = null;
        }
      }
    },
    []
  );

  // Initial session hydration + Supabase Auth state subscription
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let cancelled = false;

    const initSession = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (cancelled || !isMountedRef.current) return;

        if (error) {
          console.error('[BaruAuth] getSession error:', error.message);
        }

        const initialSession = data.session ?? null;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await syncAuthenticatedUser(initialSession.user);
        } else {
          setProfile(null);
          setSchemaMissing(false);
        }
      } catch (err) {
        console.error('[BaruAuth] Unexpected getSession error:', err);
      } finally {
        if (!cancelled && isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    void initSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled || !isMountedRef.current) return;

      // INITIAL_SESSION is deterministically handled by initSession() above
      if (event === 'INITIAL_SESSION') {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === 'SIGNED_OUT' || !nextSession?.user) {
        syncSeqRef.current += 1;
        inFlightSyncRef.current = null;
        setProfile(null);
        setSchemaMissing(false);
        setLoading(false);
        return;
      }

      // Decouple async DB call from onAuthStateChange callback to avoid Supabase v2 lock deadlocks
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const authUser = nextSession.user;
        window.setTimeout(() => {
          if (!cancelled && isMountedRef.current) {
            void syncAuthenticatedUser(authUser);
          }
        }, 0);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [syncAuthenticatedUser]);

  // Auto-flush offline retry queue whenever connectivity returns
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    const handleOnline = () => {
      void flushPendingSyncQueue(user.id).then(({ flushed }) => {
        if (flushed > 0 && isMountedRef.current) {
          void syncAuthenticatedUser(user, { force: true });
        }
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, syncAuthenticatedUser]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured || !supabase) {
        return {
          success: false,
          error: 'Supabase no está configurado en este entorno.',
        };
      }

      const cleanEmail = email.trim();
      if (!cleanEmail || !password) {
        return {
          success: false,
          error: 'Ingresa tu correo electrónico y contraseña.',
        };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          return {
            success: false,
            error: translateAuthError(error),
            emailConfirmationRequired: isUnconfirmedEmailError(error) || undefined,
          };
        }

        if (data.session && data.user) {
          setSession(data.session);
          setUser(data.user);
          await syncAuthenticatedUser(data.user);
        }

        return { success: true };
      } catch (err) {
        return { success: false, error: translateAuthError(err) };
      }
    },
    [syncAuthenticatedUser]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string
    ): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured || !supabase) {
        return {
          success: false,
          error: 'Supabase no está configurado en este entorno.',
        };
      }

      const cleanEmail = email.trim();
      const cleanName = (fullName ?? '').trim();

      if (!cleanEmail || !password) {
        return {
          success: false,
          error: 'Completa tu correo electrónico y contraseña para registrarte.',
        };
      }

      try {
        const emailRedirectTo =
          typeof window !== 'undefined' ? window.location.origin : undefined;

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: cleanName ? { full_name: cleanName } : undefined,
            emailRedirectTo,
          },
        });

        if (error) {
          return { success: false, error: translateAuthError(error) };
        }

        // Supabase returns empty identities array when email already exists and confirmation is enabled
        if (
          data.user &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0
        ) {
          return {
            success: false,
            error:
              'Ya existe una cuenta registrada con este correo electrónico. Intenta iniciar sesión.',
          };
        }

        if (!data.session) {
          return {
            success: true,
            emailConfirmationRequired: true,
          };
        }

        setSession(data.session);
        if (data.user) {
          setUser(data.user);
          await syncAuthenticatedUser(data.user);
        }

        return {
          success: true,
          emailConfirmationRequired: false,
        };
      } catch (err) {
        return { success: false, error: translateAuthError(err) };
      }
    },
    [syncAuthenticatedUser]
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured || !supabase) {
      syncSeqRef.current += 1;
      inFlightSyncRef.current = null;
      setSession(null);
      setUser(null);
      setProfile(null);
      setSchemaMissing(false);
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, error: translateAuthError(error) };
      }

      syncSeqRef.current += 1;
      inFlightSyncRef.current = null;
      setSession(null);
      setUser(null);
      setProfile(null);
      setSchemaMissing(false);
      return { success: true };
    } catch (err) {
      return { success: false, error: translateAuthError(err) };
    }
  }, []);

  const resendConfirmationEmail = useCallback(
    async (email: string): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured || !supabase) {
        return {
          success: false,
          error: 'Supabase no está configurado en este entorno.',
        };
      }

      const cleanEmail = email.trim();
      if (!cleanEmail) {
        return {
          success: false,
          error: 'Ingresa un correo electrónico válido para reenviar la confirmación.',
        };
      }

      try {
        const emailRedirectTo =
          typeof window !== 'undefined' ? window.location.origin : undefined;

        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: cleanEmail,
          options: { emailRedirectTo },
        });

        if (error) {
          return { success: false, error: translateAuthError(error) };
        }

        return { success: true };
      } catch (err) {
        return { success: false, error: translateAuthError(err) };
      }
    },
    []
  );

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    let activeUser = user;
    if (!activeUser) {
      const { data } = await supabase.auth.getUser();
      activeUser = data.user ?? null;
    }
    if (!activeUser) {
      return null;
    }

    return syncAuthenticatedUser(activeUser, { force: true });
  }, [user, syncAuthenticatedUser]);

  const applyOnboardingPatch = useCallback(
    async (
      patch: OnboardingPatch,
      options?: { allowReset?: boolean }
    ): Promise<AuthActionResult> => {
      if (!user) {
        return {
          success: false,
          error: 'Debes iniciar sesión para actualizar tu progreso.',
        };
      }

      const allowReset = Boolean(options?.allowReset);
      const res = await updateOnboardingState(user.id, patch, { allowReset });

      if (res.success) {
        if (isMountedRef.current) {
          setProfile(res.data);
          setSchemaMissing(false);
        }
        return { success: true };
      }

      if (res.schemaMissing) {
        const base = buildFallbackProfile(user, profile);
        const nextCompleted = allowReset
          ? Boolean(patch.onboarding_completed ?? false)
          : base.onboarding_completed || Boolean(patch.onboarding_completed);
        const nextSkipped = nextCompleted
          ? false
          : patch.onboarding_skipped !== undefined
            ? patch.onboarding_skipped
            : base.onboarding_skipped;
        const nextStep =
          typeof patch.onboarding_step === 'number' && Number.isFinite(patch.onboarding_step)
            ? Math.max(1, Math.floor(patch.onboarding_step))
            : base.onboarding_step;

        const fallbackUpdated = writeProfileCache(
          {
            ...base,
            onboarding_completed: nextCompleted,
            onboarding_skipped: nextSkipped,
            onboarding_step: nextStep,
            updated_at: new Date().toISOString(),
          },
          { allowDowngrade: allowReset }
        );

        if (isMountedRef.current) {
          setSchemaMissing(true);
          setProfile(fallbackUpdated);
        }

        return { success: false, error: res.error };
      }

      return { success: false, error: res.error };
    },
    [user, profile]
  );

  const completeOnboarding = useCallback((): Promise<AuthActionResult> => {
    return applyOnboardingPatch({
      onboarding_completed: true,
      onboarding_skipped: false,
    });
  }, [applyOnboardingPatch]);

  const skipOnboarding = useCallback((): Promise<AuthActionResult> => {
    return applyOnboardingPatch({
      onboarding_skipped: true,
    });
  }, [applyOnboardingPatch]);

  const resetOnboarding = useCallback((): Promise<AuthActionResult> => {
    return applyOnboardingPatch(
      {
        onboarding_completed: false,
        onboarding_skipped: false,
        onboarding_step: 1,
      },
      { allowReset: true }
    );
  }, [applyOnboardingPatch]);

  const setOnboardingStep = useCallback(
    (step: number): Promise<AuthActionResult> => {
      const safeStep = Number.isFinite(step) ? Math.max(1, Math.floor(step)) : 1;
      return applyOnboardingPatch({
        onboarding_step: safeStep,
      });
    },
    [applyOnboardingPatch]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      isConfigured: isSupabaseConfigured,
      schemaMissing,
      signIn,
      signUp,
      signOut,
      resendConfirmationEmail,
      refreshProfile,
      completeOnboarding,
      skipOnboarding,
      resetOnboarding,
      setOnboardingStep,
    }),
    [
      session,
      user,
      profile,
      loading,
      schemaMissing,
      signIn,
      signUp,
      signOut,
      resendConfirmationEmail,
      refreshProfile,
      completeOnboarding,
      skipOnboarding,
      resetOnboarding,
      setOnboardingStep,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un <AuthProvider>.');
  }
  return context;
}
