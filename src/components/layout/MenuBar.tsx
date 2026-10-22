import React, { useState } from 'react';
import { 
  FileText, 
  FolderOpen, 
  Save, 
  Download, 
  Play, 
  Square, 
  RotateCw, 
  BookOpen,
  Binary
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface Props {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExportCad: () => void;
  onExportJson: () => void;
  onLoadExample: (exampleId: string) => void;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  isSimulating: boolean;
  onAbout: () => void;
  onOpenLadder?: () => void;
}

export const MenuBar: React.FC<Props> = ({
  onNew,
  onOpen,
  onSave,
  onExportCad,
  onExportJson,
  onLoadExample,
  onStartSimulation,
  onStopSimulation,
  isSimulating,
  onAbout,
  onOpenLadder
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  return (
    <div className="flex items-center h-8 bg-[#e8ebf0] border-b border-[#d0d5dd] text-xs px-2 select-none relative z-50 text-slate-700">
      <div className="flex items-center gap-1">
        {/* Archivo */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('file')}
            className={`px-2.5 py-1 rounded transition-colors font-medium ${
              openMenu === 'file' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            Archivo
          </button>
          {openMenu === 'file' && (
            <div
              className="absolute left-0 top-full mt-0.5 w-56 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 text-slate-700 animate-in fade-in duration-100"
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => { onNew(); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Nuevo Esquema</span>
              </button>
              <button
                onClick={() => { onOpen(); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Abrir Archivo (.cad / .json)</span>
              </button>
              <button
                onClick={() => { onSave(); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Guardar Esquema</span>
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => { onExportCad(); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exportar como CADe_SIMU (*.cad)</span>
              </button>
              <button
                onClick={() => { onExportJson(); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exportar como JSON (*.json)</span>
              </button>
            </div>
          )}
        </div>

        {/* Ejemplos Predefinidos */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('examples')}
            className={`px-2.5 py-1 rounded transition-colors font-medium ${
              openMenu === 'examples' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            Ejemplos Industriales
          </button>
          {openMenu === 'examples' && (
            <div
              className="absolute left-0 top-full mt-0.5 w-72 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 text-slate-700 animate-in fade-in duration-100"
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => { onLoadExample('direct'); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Arranque Directo 3~</div>
                  <div className="text-[10px] text-slate-500">Pulsadores, enclavamiento y relé térmico</div>
                </div>
              </button>
              <button
                onClick={() => { onLoadExample('star_delta'); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <RotateCw className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Arranque Estrella - Triángulo</div>
                  <div className="text-[10px] text-slate-500">Conmutación automática con temporizador TON</div>
                </div>
              </button>
              <button
                onClick={() => { onLoadExample('reverse'); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <RotateCw className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Inversión de Giro 3~</div>
                  <div className="text-[10px] text-slate-500">Doble contactor con interlock cruzado</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Simulación */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('sim')}
            className={`px-2.5 py-1 rounded transition-colors font-medium ${
              openMenu === 'sim' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            Simulación
          </button>
          {openMenu === 'sim' && (
            <div
              className="absolute left-0 top-full mt-0.5 w-52 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 text-slate-700 animate-in fade-in duration-100"
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => { onStartSimulation(); setOpenMenu(null); }}
                disabled={isSimulating}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-emerald-600 font-semibold hover:bg-emerald-50 disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Iniciar Simulación (F9)</span>
              </button>
              <button
                onClick={() => { onStopSimulation(); setOpenMenu(null); }}
                disabled={!isSimulating}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-rose-600 font-semibold hover:bg-rose-50 disabled:opacity-40"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Detener Simulación</span>
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => { onOpenLadder?.(); setOpenMenu(null); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors"
              >
                <Binary className="w-3.5 h-3.5" />
                <span>Editor Ladder & GRAFCET</span>
              </button>
            </div>
          )}
        </div>

        {/* PLC & Ladder */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('plc')}
            className={`px-2.5 py-1 rounded transition-colors font-medium ${
              openMenu === 'plc' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            PLC / Ladder
          </button>
          {openMenu === 'plc' && (
            <div
              className="absolute left-0 top-full mt-0.5 w-64 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 text-slate-700 animate-in fade-in duration-100"
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => { onOpenLadder?.(); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <Binary className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Editor Ladder & GRAFCET</div>
                  <div className="text-[10px] text-slate-500">Programación IEC 61131-3 y simulación en tiempo real</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Ayuda */}
        <div className="relative">
          <button
            onClick={() => { onAbout(); setOpenMenu(null); }}
            className="px-2.5 py-1 rounded text-slate-700 hover:bg-slate-200/80 transition-colors font-medium"
          >
            Acerca de
          </button>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3 pr-2">
        <BrandLogo />
      </div>
    </div>
  );
};
