import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Square,
  Pause,
  StepForward,
  Upload,
  Download,
  ChevronDown,
  Wrench,
  FolderOpen,
  FilePlus2,
  Cpu,
  CircuitBoard,
  Factory,
  Activity,
  Gauge,
  AlertOctagon,
  FileText,
  Info,
  Cloud,
  CloudOff,
  Check,
  Loader2,
  LogIn,
  LogOut,
  FolderKanban,
  GraduationCap,
  Award
} from 'lucide-react';
import { SimulationMode } from '../../types/simulation';
import { CloudSyncStatus } from '../../types/cloud';
import { EXAMPLE_PRESETS } from '../../core/examples';
import { BrandLogo } from '../common/BrandLogo';

export type WorkspaceView = 'cad' | 'tia' | 'plant';

interface Props {
  projectTitle: string;
  onChangeTitle: (newTitle: string) => void;
  activeView: WorkspaceView;
  onChangeView: (view: WorkspaceView) => void;
  simulationMode: SimulationMode;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onPauseSimulation: () => void;
  onStepSimulation: () => void;
  onNewProject: () => void;
  onLoadExample: (exampleId: string) => void;
  onOpenImportModal: () => void;
  onOpenExportModal: () => void;
  onOpenMultimeter: () => void;
  onOpenTiming: () => void;
  onOpenFaults: () => void;
  onOpenReport: () => void;
  onOpenAbout: () => void;
  hasActiveFault: boolean;
  isExamActive: boolean;
  // Cloud, Auth & Onboarding
  isAuthenticated: boolean;
  userDisplayName: string;
  userEmail: string;
  syncStatus: CloudSyncStatus;
  hasActiveCloudProject: boolean;
  onSaveToCloud: () => void;
  onOpenProjects: (tab?: 'projects' | 'exams') => void;
  onOpenAuth: (mode?: 'login' | 'signup') => void;
  onSignOut: () => void;
  onReplayTutorial: () => void;
}

export const TinkerHeader: React.FC<Props> = ({
  projectTitle,
  onChangeTitle,
  activeView,
  onChangeView,
  simulationMode,
  onStartSimulation,
  onStopSimulation,
  onPauseSimulation,
  onStepSimulation,
  onNewProject,
  onLoadExample,
  onOpenImportModal,
  onOpenExportModal,
  onOpenMultimeter,
  onOpenTiming,
  onOpenFaults,
  onOpenReport,
  onOpenAbout,
  hasActiveFault,
  isExamActive,
  isAuthenticated,
  userDisplayName,
  userEmail,
  syncStatus,
  hasActiveCloudProject,
  onSaveToCloud,
  onOpenProjects,
  onOpenAuth,
  onSignOut,
  onReplayTutorial
}) => {
  const [openMenu, setOpenMenu] = useState<'examples' | 'tools' | 'account' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const isRunning = simulationMode === 'running' || simulationMode === 'paused';

  const userInitial = (userDisplayName || userEmail || 'U').trim().charAt(0).toUpperCase();

  return (
    <header
      ref={menuRef}
      className="h-14 shrink-0 bg-white border-b border-slate-200 px-2.5 flex items-center justify-between gap-2 z-40 shadow-2xs select-none"
    >
      {/* Izquierda: Marca + Nombre editable + Nuevo / Ejemplos / Herramientas */}
      <div className="flex items-center gap-1 min-w-0">
        <div className="flex items-center gap-2 pr-2 border-r border-slate-200 shrink-0">
          <BrandLogo collapsed />
          <div className="hidden 2xl:flex flex-col leading-tight">
            <span className="text-xs font-extrabold tracking-tight text-slate-900">Baru Studio</span>
            <span className="text-[10px] font-semibold text-sky-600">CADe + TIA S7-1200</span>
          </div>
        </div>

        {/* Título editable del proyecto */}
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          aria-label="Nombre del proyecto"
          className="min-w-[76px] w-24 lg:w-28 xl:w-32 2xl:w-36 shrink px-2 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-lg border border-transparent focus:border-sky-400 focus:outline-none truncate transition-colors"
          placeholder="Nombre del proyecto..."
        />

        <button
          onClick={onNewProject}
          title="Nuevo proyecto en blanco"
          className="hidden xl:flex items-center gap-1 p-1.5 2xl:px-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">Nuevo</span>
        </button>

        {/* Menú Ejemplos */}
        <div className="relative shrink-0">
          <button
            onClick={() => setOpenMenu(openMenu === 'examples' ? null : 'examples')}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">Ejemplos</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {openMenu === 'examples' && (
            <div className="absolute left-0 top-full mt-1.5 w-[26rem] max-h-[75vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-100 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Ruta de Complejidad (Nivel 1 → 8)
                </span>
                <span className="text-[10px] font-semibold text-emerald-600">
                  CAD + LAD + SCL + GRAFCET
                </span>
              </div>
              {EXAMPLE_PRESETS.map((ex) => {
                const isFinalProject = ex.level >= 7;
                return (
                  <button
                    key={ex.id}
                    onClick={() => {
                      onLoadExample(ex.id);
                      setOpenMenu(null);
                    }}
                    className={`w-full flex flex-col gap-0.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isFinalProject
                        ? 'hover:bg-emerald-50/80 border border-transparent hover:border-emerald-200'
                        : 'hover:bg-sky-50'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">{ex.label}</span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                          isFinalProject
                            ? 'bg-emerald-100 text-emerald-800'
                            : ex.level >= 5
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ex.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">{ex.description}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Menú Herramientas */}
        <div className="relative shrink-0">
          <button
            onClick={() => setOpenMenu(openMenu === 'tools' ? null : 'tools')}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              hasActiveFault || isExamActive
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Herramientas</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {openMenu === 'tools' && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => { onOpenMultimeter(); setOpenMenu(null); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Gauge className="w-4 h-4 text-amber-600" />
                <span>Multímetro Fluke Digital</span>
              </button>
              <button
                onClick={() => { onOpenTiming(); setOpenMenu(null); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <Activity className="w-4 h-4 text-cyan-600" />
                <span>Cronograma / Osciloscopio</span>
              </button>
              <button
                onClick={() => { onOpenFaults(); setOpenMenu(null); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
              >
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>Inyector de Averías / Examen</span>
              </button>
              <button
                onClick={() => { onOpenReport(); setOpenMenu(null); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Lista de Materiales (BOM)</span>
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => { onReplayTutorial(); setOpenMenu(null); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-sky-700 hover:bg-sky-50 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-sky-600" />
                <span>Tutorial Guiado (5 pasos)</span>
              </button>
              <button
                onClick={() => { onOpenAbout(); setOpenMenu(null); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <Info className="w-4 h-4 text-slate-500" />
                <span>Acerca de Baru Studio</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Centro: Selector de Modo estilo Tinkercad */}
      <nav
        data-tour="header-views"
        className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0"
      >
        <button
          onClick={() => onChangeView('cad')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeView === 'cad'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CircuitBoard className="w-3.5 h-3.5 text-sky-600" />
          <span>Esquema CAD</span>
        </button>

        <button
          onClick={() => onChangeView('tia')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeView === 'tia'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-600" />
          <span>Código TIA</span>
        </button>

        <button
          onClick={() => onChangeView('plant')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeView === 'plant'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Factory className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden md:inline">Planta 2D</span>
        </button>
      </nav>

      {/* Derecha: Nube + Importar/Exportar + Simulación + Cuenta */}
      <div className="flex items-center gap-1 shrink-0">
        <div data-tour="cloud-export" className="flex items-center gap-1">
          {/* Mis Proyectos */}
          <button
            onClick={() => onOpenProjects('projects')}
            title="Mis Proyectos en la Nube e Historial"
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FolderKanban className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden xl:inline">Mis Proyectos</span>
          </button>

          {/* Guardar en la nube */}
          <button
            onClick={onSaveToCloud}
            disabled={syncStatus === 'saving'}
            title={
              isAuthenticated
                ? hasActiveCloudProject
                  ? 'Guardar cambios en Supabase'
                  : 'Guardar este proyecto en tu nube Supabase'
                : 'Inicia sesión para guardar en la nube'
            }
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap ${
              syncStatus === 'saved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : syncStatus === 'error' || syncStatus === 'offline'
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {syncStatus === 'saving' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
            ) : syncStatus === 'saved' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : syncStatus === 'error' || syncStatus === 'offline' ? (
              <CloudOff className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-sky-600" />
            )}
            <span className="hidden 2xl:inline">
              {syncStatus === 'saving'
                ? 'Guardando...'
                : syncStatus === 'saved'
                  ? 'Guardado'
                  : 'Guardar'}
            </span>
          </button>

          <button
            onClick={onOpenImportModal}
            title="Importar archivos .cad, .scl, Openness .xml o .json"
            className="flex items-center gap-1 p-1.5 2xl:px-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Importar</span>
          </button>

          <button
            onClick={onOpenExportModal}
            title="Descargar en formato CADe_SIMU (.cad) o Siemens TIA Portal (.zip/.xml/.scl)"
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Exportar</span>
          </button>
        </div>

        {/* Botón Iniciar / Detener Simulación */}
        <div data-tour="sim-controls" className="flex items-center gap-1">
          {isRunning ? (
            <>
              <button
                onClick={onPauseSimulation}
                title={simulationMode === 'paused' ? 'Reanudar simulación' : 'Pausar simulación'}
                className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onStepSimulation}
                title="Avanzar 1 paso"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                <StepForward className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onStopSimulation}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Detener</span>
              </button>
            </>
          ) : (
            <button
              onClick={onStartSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Iniciar simulación</span>
              <span className="sm:hidden">Simular</span>
            </button>
          )}
        </div>

        {/* Botón Cuenta / Sesión */}
        <div className="relative pl-1 border-l border-slate-200 shrink-0">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
                title={`Cuenta: ${userEmail}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-600 to-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shadow-2xs">
                  {userInitial}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {openMenu === 'account' && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
                    <div className="text-xs font-extrabold text-slate-900 truncate">
                      {userDisplayName || 'Usuario Baru'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{userEmail}</div>
                  </div>
                  <button
                    onClick={() => { onOpenProjects('projects'); setOpenMenu(null); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <FolderKanban className="w-4 h-4 text-indigo-600" />
                    <span>Mis Proyectos en la Nube</span>
                  </button>
                  <button
                    onClick={() => { onOpenProjects('exams'); setOpenMenu(null); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>Historial de Exámenes</span>
                  </button>
                  <button
                    onClick={() => { onReplayTutorial(); setOpenMenu(null); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-sky-700 hover:bg-sky-50 cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-sky-600" />
                    <span>Repetir Tutorial (5 pasos)</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => { onSignOut(); setOpenMenu(null); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => onOpenAuth('login')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Iniciar sesión</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
