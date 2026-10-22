import React, { useState } from 'react';
import { 
  FileText, 
  FolderOpen, 
  Save, 
  Download, 
  RotateCw, 
  BookOpen,
  FileCode,
  Undo2,
  Redo2,
  Trash2,
  Info
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface Props {
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onDeleteSelection?: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExportCad: () => void;
  onExportJson: () => void;
  onLoadExample: (exampleId: string) => void;
  onAbout: () => void;
  onOpenAdvanced?: () => void;
}

export const MenuBar: React.FC<Props> = ({
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  onUndo,
  onRedo,
  onDeleteSelection,
  onNew,
  onOpen,
  onSave,
  onExportCad,
  onExportJson,
  onLoadExample,
  onAbout,
  onOpenAdvanced
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  return (
    <div className="flex items-center justify-between h-9 bg-[#e8ebf0] border-b border-[#d0d5dd] text-xs px-3 select-none relative z-50 text-slate-700 shrink-0 w-full shadow-2xs">
      <div className="flex items-center gap-1.5">
        {/* LOGO DE MARCA: Arriba a la izquierda como solicitado */}
        <BrandLogo className="mr-2.5" />

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {/* 1. Menú Archivo */}
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
              className="absolute left-0 top-full mt-0.5 w-60 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 text-slate-700 animate-in fade-in duration-100"
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
                <span>Guardar Esquema (*.cad)</span>
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
              {onOpenAdvanced && (
                <>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => { onOpenAdvanced(); setOpenMenu(null); }}
                    className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors text-[11px] text-slate-500"
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-400" />
                    <span>Importar / Exportar avanzado...</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 2. Menú Edición (Deshacer, Rehacer, Borrar selección) */}
        <div className="relative">
          <button
            onClick={() => toggleMenu('edit')}
            className={`px-2.5 py-1 rounded transition-colors font-medium ${
              openMenu === 'edit' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            Edición
          </button>
          {openMenu === 'edit' && (
            <div
              className="absolute left-0 top-full mt-0.5 w-56 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 text-slate-700 animate-in fade-in duration-100"
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                onClick={() => { if (canUndo && onUndo) onUndo(); setOpenMenu(null); }}
                disabled={!canUndo}
                className="flex items-center justify-between w-full px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Undo2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Deshacer</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+Z</span>
              </button>
              <button
                onClick={() => { if (canRedo && onRedo) onRedo(); setOpenMenu(null); }}
                disabled={!canRedo}
                className="flex items-center justify-between w-full px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Redo2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Rehacer</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Ctrl+Y</span>
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                onClick={() => { if (hasSelection && onDeleteSelection) onDeleteSelection(); setOpenMenu(null); }}
                disabled={!hasSelection}
                className="flex items-center justify-between w-full px-3 py-1.5 text-left hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Eliminar Selección</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Supr</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Ejemplos Predefinidos */}
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
              <button
                onClick={() => { onLoadExample('conveyor'); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <RotateCw className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Cinta Transportadora Industrial</div>
                  <div className="text-[10px] text-slate-500">Finales de carrera inductivos y señalización</div>
                </div>
              </button>
              <button
                onClick={() => { onLoadExample('water_tank'); setOpenMenu(null); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <RotateCw className="w-4 h-4 text-cyan-600 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-800">Control de Nivel y Bombeo</div>
                  <div className="text-[10px] text-slate-500">Boyas de nivel, llenado y vaciado automático</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 4. Menú Acerca de */}
        <div className="relative">
          <button
            onClick={() => { onAbout(); setOpenMenu(null); }}
            className="px-2.5 py-1 rounded text-slate-700 hover:bg-slate-200/80 transition-colors font-medium flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Acerca de</span>
          </button>
        </div>
      </div>

      {/* Extremo derecho: Estándares industriales */}
      <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500 font-mono">
        <span className="hidden sm:inline px-2 py-0.5 rounded bg-slate-200/70 text-slate-600 font-semibold border border-slate-300/80 text-[10px]">
          IEC 60947 • DIN EN 61082
        </span>
      </div>
    </div>
  );
};
