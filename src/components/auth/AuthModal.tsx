import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Cloud,
  AlertCircle,
  CheckCircle2,
  MailCheck,
  RefreshCw,
  Loader2,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export type AuthModalMode = 'login' | 'signup';

interface Props {
  isOpen: boolean;
  initialMode?: AuthModalMode;
  reasonMessage?: string | null;
  onClose: () => void;
  onAuthSuccess?: (isNewAccount: boolean) => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  initialMode = 'login',
  reasonMessage = null,
  onClose,
  onAuthSuccess
}) => {
  const { signIn, signUp, resendConfirmationEmail, isConfigured } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado de confirmación de correo tras registro
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendFeedback, setResendFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setShowPassword(false);
      setPendingConfirmationEmail(null);
      setResendFeedback(null);
      setResendCooldown(0);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSwitchMode = (nextMode: AuthModalMode) => {
    if (isSubmitting) return;
    setMode(nextMode);
    setErrorMessage(null);
    setPendingConfirmationEmail(null);
    setResendFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isConfigured) {
      setErrorMessage(
        'El servicio en la nube no está configurado en este entorno. Verifica las credenciales de Supabase.'
      );
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (mode === 'signup' && trimmedName.length < 2) {
      setErrorMessage('Ingresa tu nombre completo (mínimo 2 caracteres).');
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await signIn(trimmedEmail, password);
        if (result.success) {
          setPassword('');
          onAuthSuccess?.(false);
          onClose();
        } else {
          setErrorMessage(result.error || 'No se pudo iniciar sesión. Revisa tus credenciales.');
        }
      } else {
        const result = await signUp(trimmedEmail, password, trimmedName);
        if (result.success) {
          setPassword('');
          if (result.emailConfirmationRequired) {
            setPendingConfirmationEmail(trimmedEmail);
            setResendFeedback(null);
            setResendCooldown(0);
          } else {
            onAuthSuccess?.(true);
            onClose();
          }
        } else {
          setErrorMessage(result.error || 'No se pudo crear la cuenta. Inténtalo nuevamente.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error inesperado al autenticar.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail || isResending || resendCooldown > 0) return;
    setIsResending(true);
    setResendFeedback(null);

    try {
      const result = await resendConfirmationEmail(pendingConfirmationEmail);
      if (result.success) {
        setResendFeedback({
          ok: true,
          text: 'Correo de confirmación reenviado. Revisa tu bandeja de entrada o spam.'
        });
        setResendCooldown(60);
      } else {
        setResendFeedback({
          ok: false,
          text: result.error || 'No se pudo reenviar el correo de confirmación.'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión al reenviar el correo.';
      setResendFeedback({ ok: false, text: msg });
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLoginAfterConfirmation = () => {
    const confirmedEmail = pendingConfirmationEmail || email;
    setPendingConfirmationEmail(null);
    setResendFeedback(null);
    setErrorMessage(null);
    setEmail(confirmedEmail);
    setPassword('');
    setMode('login');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 select-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="auth-modal-title" className="text-base font-extrabold text-slate-900 truncate">
                Cuenta en la Nube
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Baru Studio • Sincronización CADe + TIA Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar ventana de autenticación"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
          {/* Banner informativo si se abrió desde una acción en modo invitado */}
          {reasonMessage && !pendingConfirmationEmail && (
            <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{reasonMessage}</span>
            </div>
          )}

          {/* Aviso si Supabase no está configurado */}
          {!isConfigured && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Supabase no está configurado en este entorno. Agrega tus credenciales para habilitar el
                inicio de sesión y la nube.
              </span>
            </div>
          )}

          {pendingConfirmationEmail ? (
            /* Estado especial: confirmación de correo electrónico */
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 mx-auto flex items-center justify-center shadow-sm">
                <MailCheck className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Revisa tu correo para activar tu cuenta
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enviamos un enlace de confirmación a tu dirección de correo electrónico:
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 select-text">
                  <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>{pendingConfirmationEmail}</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                  Abre el enlace desde tu bandeja de entrada (o carpeta de correo no deseado) y luego
                  inicia sesión para sincronizar tus proyectos.
                </p>
              </div>

              {resendFeedback && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 text-left ${
                    resendFeedback.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}
                >
                  {resendFeedback.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{resendFeedback.text}</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isResending || resendCooldown > 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isResending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                  )}
                  <span>
                    {isResending
                      ? 'Reenviando correo...'
                      : resendCooldown > 0
                        ? `Reenviar correo de confirmación (${resendCooldown}s)`
                        : 'Reenviar correo de confirmación'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToLoginAfterConfirmation}
                  className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Ir a Iniciar sesión</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Selector de pestañas: Iniciar sesión | Crear cuenta */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-600" />
                  <span>Iniciar sesión</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('signup')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Crear cuenta</span>
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="auth-fullname"
                      className="block text-xs font-bold text-slate-700"
                    >
                      Nombre completo
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="auth-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        disabled={isSubmitting}
                        placeholder="Ej. Simón Barrera Ruíz"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-sky-400 focus:outline-none text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-colors select-text disabled:opacity-60"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      disabled={isSubmitting}
                      placeholder="nombre@correo.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-sky-400 focus:outline-none text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-colors select-text disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="auth-password"
                      className="block text-xs font-bold text-slate-700"
                    >
                      Contraseña
                    </label>
                    {mode === 'signup' && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Mínimo 6 caracteres
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={6}
                      disabled={isSubmitting}
                      placeholder={mode === 'login' ? 'Tu contraseña' : 'Crea una contraseña segura'}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-sky-400 focus:outline-none text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-colors select-text disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div
                    role="alert"
                    className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !isConfigured}
                  className={`w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    mode === 'login'
                      ? 'bg-sky-600 hover:bg-sky-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...'}</span>
                    </>
                  ) : mode === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Iniciar sesión</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Crear cuenta gratis</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
                {mode === 'login' ? (
                  <span>
                    ¿Aún no tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('signup')}
                      className="font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                    >
                      Crear cuenta gratis
                    </button>
                  </span>
                ) : (
                  <span>
                    ¿Ya tienes una cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('login')}
                      className="font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                    >
                      Iniciar sesión
                    </button>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
