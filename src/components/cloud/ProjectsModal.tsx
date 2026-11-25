import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RefreshCw,
  Cloud,
  FolderOpen,
  GraduationCap,
  Search,
  Plus,
  CircuitBoard,
  Cable,
  Cpu,
  Globe,
  Lock,
  Link2,
  Check,
  Copy,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  FileText,
  Database,
  LogIn,
  UserPlus,
  Loader2,
  Share2,
  AlertCircle
} from 'lucide-react';
import { CloudProject, ExamAttemptRecord } from '../../types/cloud';
import { FAULT_CATALOG, FaultDefinition } from '../../types/faults';

export type ProjectsModalTab = 'projects' | 'exams';

interface Props {
  isOpen: boolean;
  initialTab?: ProjectsModalTab;
  activeProjectId: string | null;
  projects: CloudProject[];
  examAttempts: ExamAttemptRecord[];
  isLoading: boolean;
  schemaMissing?: boolean;
  isAuthenticated: boolean;
  onClose: () => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onRefresh: () => void;
  onOpenProject: (project: CloudProject) => void;
  onSaveAsNew: () => void;
  onDuplicateProject: (project: CloudProject) => void;
  onDeleteProject: (project: CloudProject) => void;
  onToggleShare: (project: CloudProject, enable: boolean) => Promise<CloudProject | null>;
  onCopyShareLink: (slug: string) => void;
}

const FAULT_ALIAS_LABELS: Record<string, string> = {
  phase_loss_l1: 'Falla de Fase: Corte en Conductor L1',
  fase_cortada: 'Pérdida / Corte de Fase',
  bobina_abierta: 'Bobina Abierta en Contactor',
  contacto_soldado: 'Contactos Soldados en Contactor'
};

function findFaultInfo(faultId: string): { name: string; affectedTag?: string } {
  const match: FaultDefinition | undefined = FAULT_CATALOG.find((item) => item.id === faultId);
  if (match) {
    return { name: match.name, affectedTag: match.affectedTag };
  }
  return { name: FAULT_ALIAS_LABELS[faultId] || faultId };
}

function formatDateEs(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Fecha desconocida';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getTiaLanguageBadgeStyle(lang: string): string {
  switch (lang) {
    case 'SCL':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'GRAFCET':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'LAD':
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

export const ProjectsModal: React.FC<Props> = ({
  isOpen,
  initialTab = 'projects',
  activeProjectId,
  projects,
  examAttempts,
  isLoading,
  schemaMissing = false,
  isAuthenticated,
  onClose,
  onOpenAuth,
  onRefresh,
  onOpenProject,
  onSaveAsNew,
  onDuplicateProject,
  onDeleteProject,
  onToggleShare,
  onCopyShareLink
}) => {
  const [activeTab, setActiveTab] = useState<ProjectsModalTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingShareId, setTogglingShareId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
      setConfirmDeleteId(null);
      setTogglingShareId(null);
      setCopiedSlug(null);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedProjects;
    return sortedProjects.filter((proj) => {
      const title = (proj.title || '').toLowerCase();
      const desc = (proj.description || '').toLowerCase();
      const lang = (proj.tia_program?.activeLanguage || 'LAD').toLowerCase();
      return title.includes(q) || desc.includes(q) || lang.includes(q);
    });
  }, [sortedProjects, searchQuery]);

  const sortedExams = useMemo(() => {
    return [...examAttempts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [examAttempts]);

  const examStats = useMemo(() => {
    const total = sortedExams.length;
    if (total === 0) return { total: 0, passed: 0, avgScore: 0 };
    const passed = sortedExams.filter((ex) => ex.is_passed).length;
    const avgScore = sortedExams.reduce((acc, ex) => acc + Number(ex.score || 0), 0) / total;
    return { total, passed, avgScore };
  }, [sortedExams]);

  if (!isOpen) return null;

  const handleToggleShareClick = async (project: CloudProject) => {
    if (togglingShareId) return;
    setTogglingShareId(project.id);
    try {
      await onToggleShare(project, !project.is_public);
    } finally {
      setTogglingShareId(null);
    }
  };

  const handleCopyLinkClick = (slug: string) => {
    onCopyShareLink(slug);
    setCopiedSlug(slug);
    window.setTimeout(() => {
      setCopiedSlug((current) => (current === slug ? null : current));
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 select-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="projects-modal-title"
    >
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="projects-modal-title" className="text-base font-extrabold text-slate-900 truncate">
                Mi Espacio en la Nube
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Proyectos CADe_SIMU + TIA Portal y registro de exámenes de averías
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                title="Actualizar desde la nube"
                aria-label="Actualizar desde la nube"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selector de pestañas (visible siempre para mantener claridad estructural) */}
        <div className="px-6 pt-4 pb-2 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-600" />
              <span>Mis Proyectos ({projects.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('exams')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'exams'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              <span>Historial de Exámenes ({examAttempts.length})</span>
            </button>
          </div>
        </div>

        {/* Cuerpo desplazable */}
        <div className="px-6 pb-6 pt-2 overflow-y-auto flex-1 space-y-4">
          {!isAuthenticated ? (
            /* Estado invitado estilo Tinkercad */
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8 text-center space-y-6">
              <div className="space-y-2 max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white mx-auto flex items-center justify-center shadow-md">
                  <Cloud className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Guarda y comparte tus circuitos en la nube
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Inicia sesión o crea una cuenta gratuita en Baru Studio para acceder a tus proyectos
                  desde cualquier equipo, compartir enlaces públicos y llevar el control de tus
                  exámenes de diagnóstico industrial.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900">Sincronización real</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Guarda tu esquema eléctrico CADe_SIMU junto con tu programa TIA Portal S7-1200.
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900">Enlaces compartibles</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Publica cualquier práctica con un clic y comparte tu enlace directo con docentes.
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900">Seguimiento de exámenes</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Conserva tu historial de calificaciones, intentos y notas en el inyector de averías.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Crear cuenta gratis</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-sky-600" />
                  <span>Iniciar sesión</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Banner si falta ejecutar la migración SQL */}
              {schemaMissing && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                  <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 leading-relaxed">
                    <div className="font-extrabold text-amber-950">
                      Esquema de base de datos pendiente en Supabase
                    </div>
                    <p>
                      Aún no existen las tablas de la nube en tu proyecto de Supabase. Ejecuta la
                      migración SQL{' '}
                      <code className="font-mono font-bold text-[11px] bg-amber-100/90 px-1.5 py-0.5 rounded select-text">
                        supabase/migrations/001_initial_schema.sql
                      </code>{' '}
                      en el <strong>SQL Editor</strong> de Supabase y luego presiona{' '}
                      <strong>Actualizar</strong>.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'projects' ? (
                <div className="space-y-4">
                  {/* Barra superior: búsqueda + Guardar actual */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar proyecto por título, descripción o lenguaje..."
                        aria-label="Buscar proyectos"
                        className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-sky-400 focus:outline-none text-xs font-medium text-slate-800 placeholder:text-slate-400 transition-colors select-text"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label="Limpiar búsqueda"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={onSaveAsNew}
                      disabled={schemaMissing}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Guardar actual en la nube</span>
                    </button>
                  </div>

                  {/* Lista o estado vacío de proyectos */}
                  {isLoading && projects.length === 0 ? (
                    <div className="py-14 flex flex-col items-center justify-center gap-2.5 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                      <span className="text-xs font-semibold">Cargando proyectos desde la nube...</span>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-10 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 mx-auto flex items-center justify-center">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Aún no tienes proyectos en la nube
                        </h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Guarda el circuito y el programa TIA Portal que tienes abiertos en este
                          momento para respaldarlos y compartirlos cuando quieras.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onSaveAsNew}
                        disabled={schemaMissing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Guardar actual en la nube</span>
                      </button>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center space-y-2">
                      <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">
                        No se encontraron proyectos que coincidan con &ldquo;{searchQuery}&rdquo;.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                      >
                        Limpiar filtro
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {filteredProjects.map((project) => {
                        const isActive = project.id === activeProjectId;
                        const componentCount = project.circuit_doc?.components?.length ?? 0;
                        const wireCount = project.circuit_doc?.wires?.length ?? 0;
                        const tiaLang = project.tia_program?.activeLanguage || 'LAD';
                        const isConfirmingDelete = confirmDeleteId === project.id;
                        const isTogglingShare = togglingShareId === project.id;
                        const isCopied = Boolean(project.share_slug && copiedSlug === project.share_slug);

                        return (
                          <div
                            key={project.id}
                            className={`rounded-2xl border p-4 flex flex-col justify-between gap-3.5 transition-all ${
                              isActive
                                ? 'border-sky-300 bg-sky-50/40 ring-1 ring-sky-200/80'
                                : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            {/* Encabezado de tarjeta */}
                            <div className="space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="text-sm font-extrabold text-slate-900 truncate">
                                    {project.title || 'Proyecto sin título'}
                                  </h3>
                                  {project.description && (
                                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                      {project.description}
                                    </p>
                                  )}
                                </div>

                                {isActive && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white shrink-0">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Activo</span>
                                  </span>
                                )}
                              </div>

                              {/* Métricas y lenguaje TIA */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                                  <CircuitBoard className="w-3 h-3 text-sky-600" />
                                  <span>{componentCount} comp.</span>
                                </span>

                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                                  <Cable className="w-3 h-3 text-slate-500" />
                                  <span>{wireCount} cables</span>
                                </span>

                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-extrabold ${getTiaLanguageBadgeStyle(
                                    tiaLang
                                  )}`}
                                >
                                  <Cpu className="w-3 h-3" />
                                  <span>{tiaLang}</span>
                                </span>
                              </div>

                              {/* Fecha de actualización */}
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Actualizado: {formatDateEs(project.updated_at)}</span>
                              </div>

                              {/* Franja de enlace público cuando está compartido */}
                              {project.is_public && project.share_slug && (
                                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
                                  <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-emerald-800">
                                    <Link2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="font-mono truncate select-text">
                                      ?share={project.share_slug}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyLinkClick(project.share_slug!)}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                                      isCopied
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {isCopied ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>Copiado</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copiar enlace</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Acciones de la tarjeta */}
                            {isConfirmingDelete ? (
                              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-rose-50 border border-rose-200">
                                <span className="text-[11px] font-bold text-rose-800 pl-1">
                                  ¿Eliminar proyecto?
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmDeleteId(null);
                                      onDeleteProject(project);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Confirmar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/70">
                                <button
                                  type="button"
                                  onClick={() => onOpenProject(project)}
                                  className="flex-1 min-w-[80px] py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                  <span>Abrir</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleShareClick(project)}
                                  disabled={isTogglingShare}
                                  title={
                                    project.is_public
                                      ? 'Proyecto público (clic para hacerlo privado)'
                                      : 'Proyecto privado (clic para compartir con enlace)'
                                  }
                                  className={`py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
                                    project.is_public
                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {isTogglingShare ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : project.is_public ? (
                                    <Globe className="w-3.5 h-3.5" />
                                  ) : (
                                    <Lock className="w-3.5 h-3.5" />
                                  )}
                                  <span>{project.is_public ? 'Público' : 'Privado'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onDuplicateProject(project)}
                                  title="Duplicar proyecto"
                                  className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span className="hidden sm:inline">Duplicar</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(project.id)}
                                  title="Eliminar proyecto"
                                  aria-label={`Eliminar ${project.title}`}
                                  className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Pestaña: Historial de Exámenes */
                <div className="space-y-4">
                  {sortedExams.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
                        <div className="text-[11px] font-semibold text-slate-500">
                          Exámenes realizados
                        </div>
                        <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                          {examStats.total}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 px-4 py-3">
                        <div className="text-[11px] font-semibold text-emerald-700">Aprobados</div>
                        <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                          {examStats.passed} / {examStats.total}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-sky-50/70 border border-sky-200 px-4 py-3">
                        <div className="text-[11px] font-semibold text-sky-700">Nota promedio</div>
                        <div className="text-lg font-extrabold text-sky-700 mt-0.5">
                          {examStats.avgScore.toFixed(1)} <span className="text-xs font-bold">/ 5.0</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {isLoading && sortedExams.length === 0 ? (
                    <div className="py-14 flex flex-col items-center justify-center gap-2.5 text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="text-xs font-semibold">Cargando historial de exámenes...</span>
                    </div>
                  ) : sortedExams.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-10 text-center space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Sin intentos de examen registrados
                      </h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Abre <strong>Herramientas → Inyector de Averías / Examen</strong> para iniciar
                        una prueba práctica de diagnóstico con multímetro y registrar tus resultados
                        automáticamente aquí.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedExams.map((attempt) => {
                        const faultInfo = findFaultInfo(attempt.hidden_fault_id);
                        const submittedInfo = attempt.submitted_answer
                          ? findFaultInfo(attempt.submitted_answer)
                          : null;
                        const numericScore = Number(attempt.score ?? 0);

                        return (
                          <div
                            key={attempt.id}
                            className="rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white p-4 space-y-2.5 transition-colors"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm font-extrabold text-slate-900">
                                    {faultInfo.name}
                                  </h3>
                                  {faultInfo.affectedTag && (
                                    <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-600">
                                      {faultInfo.affectedTag}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{formatDateEs(attempt.created_at)}</span>
                                  </span>
                                  <span>
                                    {attempt.attempts}{' '}
                                    {attempt.attempts === 1 ? 'intento' : 'intentos'}
                                  </span>
                                  {!attempt.is_passed &&
                                    submittedInfo &&
                                    attempt.submitted_answer !== attempt.hidden_fault_id && (
                                      <span className="text-rose-600 font-medium">
                                        Respuesta enviada: {submittedInfo.name}
                                      </span>
                                    )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                    attempt.is_passed
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {attempt.is_passed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5" />
                                  )}
                                  <span>{attempt.is_passed ? 'Aprobado' : 'Reprobado'}</span>
                                </span>

                                <div className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-900 tabular-nums">
                                  {numericScore.toFixed(1)}{' '}
                                  <span className="text-[11px] font-semibold text-slate-400">
                                    / 5.0
                                  </span>
                                </div>
                              </div>
                            </div>

                            {attempt.student_notes && attempt.student_notes.trim().length > 0 && (
                              <div className="rounded-xl bg-white border border-slate-200/80 px-3 py-2 flex items-start gap-2 text-xs text-slate-600 select-text">
                                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <p className="leading-relaxed whitespace-pre-wrap">
                                  {attempt.student_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
