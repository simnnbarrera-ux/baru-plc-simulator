import React from 'react';
import { 
  FileText, 
  FolderOpen, 
  Save, 
  MousePointer, 
  Spline, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Play, 
  Square, 
  Pause, 
  StepForward,
  Cpu,
  Activity,
  Gauge,
  FileSpreadsheet,
  Binary,
  AlertTriangle,
  Undo2,
  Redo2
} from 'lucide-react';
import { SimulationMode } from '../../types/simulation';

interface Props {
  activeTool: string | null;
  simulationMode: SimulationMode;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onDeleteSelection?: () => void;
  onSetTool: (tool: string | null) => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onPauseSimulation: () => void;
  onStepSimulation: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitScreen?: () => void;
  isTwinOpen?: boolean;
  onToggleTwin?: () => void;
  isTimingOpen?: boolean;
  onToggleTiming?: () => void;
  isMeterOpen?: boolean;
  onToggleMeter?: () => void;
  isLadderOpen?: boolean;
  onToggleLadder?: () => void;
  isFaultsOpen?: boolean;
  onToggleFaults?: () => void;
  hasActiveFault?: boolean;
  isExamActive?: boolean;
  onOpenReport?: () => void;
}

export const ToolBar: React.FC<Props> = ({
  activeTool,
  simulationMode,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  onUndo,
  onRedo,
  onDeleteSelection,
  onSetTool,
  onNew,
  onOpen,
  onSave,
  onStartSimulation,
  onStopSimulation,
  onPauseSimulation,
  onStepSimulation,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  isTwinOpen,
  onToggleTwin,
  isTimingOpen,
  onToggleTiming,
  isMeterOpen,
  onToggleMeter,
  isLadderOpen,
  onToggleLadder,
  isFaultsOpen,
  onToggleFaults,
  hasActiveFault,
  isExamActive,
  onOpenReport
}) => {
  const isSimulating = simulationMode === 'running';

  return (
    <div className="flex items-center h-10 bg-[#f4f6f8] border-b border-[#d0d5dd] px-3 gap-1 shadow-xs select-none shrink-0 overflow-x-auto scrollbar-none">
      {/* Archivo rápido */}
      <button
        onClick={onNew}
        title="Nuevo Esquema (Ctrl+N)"
        className="p-1.5 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
      >
        <FileText className="w-4 h-4" />
      </button>
      <button
        onClick={onOpen}
        title="Abrir Archivo de Esquema (.cad / .json)"
        className="p-1.5 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
      >
        <FolderOpen className="w-4 h-4" />
      </button>
      <button
        onClick={onSave}
        title="Guardar Esquema en Disco (*.cad)"
        className="p-1.5 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
      >
        <Save className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-slate-300 mx-1" />

      {/* HISTORIAL: Deshacer y Rehacer */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Deshacer última acción (Ctrl+Z)"
        className="p-1.5 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Rehacer acción (Ctrl+Y)"
        className="p-1.5 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-slate-300 mx-1" />

      {/* Herramientas de Edición */}
      <button
        onClick={() => onSetTool('select')}
        title="Cursor de Selección (Esc)"
        className={`p-1.5 rounded transition-all cursor-pointer ${
          activeTool === 'select' || activeTool === null
            ? 'bg-white text-blue-600 border border-blue-400 shadow-xs'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
        }`}
      >
        <MousePointer className="w-4 h-4" />
      </button>
      <button
        onClick={() => onSetTool('wire')}
        title="Trazador de Cables (W)"
        className={`p-1.5 rounded transition-all cursor-pointer ${
          activeTool === 'wire'
            ? 'bg-white text-blue-600 border border-blue-400 shadow-xs'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
        }`}
      >
        <Spline className="w-4 h-4" />
      </button>
      <button
        onClick={() => {
          if (hasSelection && onDeleteSelection) {
            onDeleteSelection();
          } else {
            onSetTool(activeTool === 'delete' ? 'select' : 'delete');
          }
        }}
        title={hasSelection ? "Eliminar selección de componente o cable (Supr)" : "Modo Borrador (Supr)"}
        className={`p-1.5 rounded transition-all cursor-pointer ${
          hasSelection
            ? 'text-rose-600 bg-rose-50 border border-rose-300 hover:bg-rose-100 shadow-2xs font-bold'
            : activeTool === 'delete'
              ? 'bg-rose-100 text-rose-700 border border-rose-400 shadow-xs'
              : 'text-slate-700 hover:text-rose-600 hover:bg-rose-50'
        }`}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-slate-300 mx-1" />

      {/* Visualización */}
      <button
        onClick={onZoomIn}
        title="Acercar (Zoom In) [+]"
        className="p-1.5 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        onClick={onZoomOut}
        title="Alejar (Zoom Out) [-]"
        className="p-1.5 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        onClick={onFitScreen}
        title="Ajustar Plano Completo a la Pantalla [F]"
        className="p-1.5 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-slate-300 mx-2" />

      {/* MOTOR DE SIMULACIÓN (CONTROLES CLÁSICOS) */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-xs">
        <button
          onClick={onStartSimulation}
          disabled={isSimulating}
          title="Iniciar Simulación Eléctrica (Play)"
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
            isSimulating
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs active:scale-95'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Simular</span>
        </button>

        <button
          onClick={onPauseSimulation}
          disabled={!isSimulating}
          title="Pausar Simulación"
          className="p-1 rounded text-amber-600 hover:bg-amber-50 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Pause className="w-3.5 h-3.5 fill-current" />
        </button>

        <button
          onClick={onStopSimulation}
          disabled={simulationMode === 'stopped'}
          title="Detener Simulación (Stop)"
          className="p-1 rounded text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>

        <button
          onClick={onStepSimulation}
          title="Simulación Paso a Paso"
          className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <StepForward className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-300 mx-1.5" />

      {/* HERRAMIENTAS AVANZADAS PRO */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleTwin}
          title="Abrir Planta Virtual 2D (Gemelo Digital tipo PC_SIMU)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
            isTwinOpen
              ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Planta 2D</span>
        </button>

        <button
          onClick={onToggleTiming}
          title="Abrir Analizador Lógico & Cronograma de Señales"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
            isTimingOpen
              ? 'bg-cyan-600 text-white border-cyan-700 shadow-xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Cronograma</span>
        </button>

        <button
          onClick={onToggleMeter}
          title="Abrir Multímetro Industrial Fluke (Tensión, Corriente, Potencia)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
            isMeterOpen
              ? 'bg-amber-500 text-slate-900 border-amber-600 font-bold shadow-xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>Multímetro</span>
        </button>

        <button
          onClick={onToggleFaults}
          title="Inyector Didáctico y Diagnóstico de Fallas Eléctricas"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
            hasActiveFault || isExamActive
              ? 'bg-rose-600 text-white border-rose-700 animate-pulse shadow-xs font-bold'
              : isFaultsOpen
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
          <span>Inyector de Fallas</span>
          {(hasActiveFault || isExamActive) && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          )}
        </button>

        <button
          onClick={onToggleLadder}
          title="Abrir Editor y Simulador Ladder & GRAFCET (IEC 61131-3)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
            isLadderOpen
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          <Binary className="w-3.5 h-3.5" />
          <span>Editor Ladder</span>
        </button>

        <button
          onClick={onOpenReport}
          title="Generar Memoria Técnica de Instalación & Lista de Materiales (BOM)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
          <span>Memoria BOM</span>
        </button>
      </div>
    </div>
  );
};
