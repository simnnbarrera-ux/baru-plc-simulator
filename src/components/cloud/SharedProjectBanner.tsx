import React from 'react';
import { Globe, CopyPlus, LogIn, X, Loader2 } from 'lucide-react';

interface Props {
  projectTitle: string;
  shareSlug: string;
  isAuthenticated: boolean;
  isCloning?: boolean;
  onCloneToMyAccount: () => void;
  onDismiss: () => void;
}

export const SharedProjectBanner: React.FC<Props> = ({
  projectTitle,
  shareSlug,
  isAuthenticated,
  isCloning = false,
  onCloneToMyAccount,
  onDismiss
}) => {
  return (
    <div
      role="status"
      className="shrink-0 bg-gradient-to-r from-sky-50 via-indigo-50/80 to-sky-50 border-b border-sky-200/80 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 z-30 select-none"
    >
      {/* Izquierda: icono, etiqueta y nombre del proyecto compartido */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
          <Globe className="w-3.5 h-3.5" />
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200/80 shrink-0">
            Proyecto compartido
          </span>
          <span className="text-xs font-extrabold text-slate-900 truncate">
            {projectTitle || 'Proyecto sin título'}
          </span>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-lg bg-white/80 border border-sky-200/80 font-mono text-[10px] font-semibold text-sky-700 shrink-0 select-text">
            ?share={shareSlug}
          </span>
        </div>
      </div>

      {/* Derecha: botón clonar y cerrar */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onCloneToMyAccount}
          disabled={isCloning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isCloning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Clonando...</span>
            </>
          ) : isAuthenticated ? (
            <>
              <CopyPlus className="w-3.5 h-3.5" />
              <span>Clonar en mi cuenta</span>
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar sesión para clonar</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onDismiss}
          disabled={isCloning}
          aria-label="Cerrar aviso de proyecto compartido"
          title="Cerrar aviso"
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-sky-100/80 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
