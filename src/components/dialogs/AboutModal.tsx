import React from 'react';
import { X, Zap, Cpu, Layers } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-6 text-slate-800">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <BrandLogo />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="mt-4 space-y-3.5 text-xs text-slate-600">
          <p className="leading-relaxed">
            Plataforma avanzada de simulación web para esquemas electrotécnicos industriales, 
            lógica cableada de fuerza y maniobra, diagramas secuenciales <strong>GRAFCET (IEC 60848)</strong> y 
            autómatas programables <strong>PLC (Siemens S7-1200 / LOGO!)</strong>.
          </p>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Software:</span>
              <span className="text-blue-700 font-bold">Baru PLC Simulator</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Autor:</span>
              <span className="text-indigo-700 font-bold">Simón Barrera Ruíz</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Versión:</span>
              <span className="text-slate-800 font-semibold">4.2 Web Pro</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Compatibilidad:</span>
              <span className="text-slate-700">Archivos *.cad / JSON</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Motor de Simulación:</span>
              <span className="text-emerald-700 font-bold">Nodal Real-Time Solver (30 Hz)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Planta Virtual:</span>
              <span className="text-cyan-700 font-semibold">Gemelo Digital 2D Sincronizado</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
            Diseñado con motor de cálculo nodal electrotécnico en tiempo real, resolución de potenciales de fases $L1, L2, L3$, 
            neutro y tierra de protección, conmutación dinámica de contactores y sincronización de gemelo digital.
          </div>
        </div>

        {/* Botón de cierre */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
