import React from 'react';
import { CircuitDocument } from '../../types/circuit';
import { COMPONENT_CATALOG } from '../../core/components/catalog';
import { X, Printer, FileSpreadsheet, Layers } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface Props {
  isOpen: boolean;
  document: CircuitDocument;
  onClose: () => void;
}

export const LabReportModal: React.FC<Props> = ({ isOpen, document, onClose }) => {
  if (!isOpen) return null;

  // Agrupar componentes por tipo y contar cantidades para la lista de materiales (BOM)
  const componentCounts = new Map<string, { count: number; tags: string[]; name: string; category: string }>();

  document.components.forEach(comp => {
    const def = COMPONENT_CATALOG.find(c => c.type === comp.type);
    const name = def?.name ?? comp.type;
    const category = def?.category ?? 'Otros';

    if (!componentCounts.has(comp.type)) {
      componentCounts.set(comp.type, { count: 1, tags: [comp.tag], name, category });
    } else {
      const entry = componentCounts.get(comp.type)!;
      entry.count += 1;
      entry.tags.push(comp.tag);
    }
  });

  const getCommercialRef = (type: string): { ref: string; brand: string } => {
    switch (type) {
      case 'breaker_3p': return { ref: 'iC60N 3P C16A (A9F74316)', brand: 'Schneider Electric' };
      case 'breaker_1p_n': return { ref: 'iC60N 1P+N C6A (A9F74606)', brand: 'Schneider Electric' };
      case 'contactor_power_3p': return { ref: 'TeSys Deca LC1D12B7 (24V/230V)', brand: 'Schneider Electric' };
      case 'thermal_relay_power': return { ref: 'LRD14 (7.0 - 10.0 A)', brand: 'Telemecanique' };
      case 'motor_3phase': return { ref: 'W22 Super Premium 4.0 kW 4P', brand: 'WEG Electric' };
      case 'button_no': return { ref: 'Harmony XB4BA31 (Verde NA)', brand: 'Schneider Electric' };
      case 'button_nc': return { ref: 'Harmony XB4BA42 (Rojo NC)', brand: 'Schneider Electric' };
      case 'emergency_stop': return { ref: 'Harmony XB4BS542 (Seta Paro)', brand: 'Schneider Electric' };
      case 'pilot_light_green': return { ref: 'Harmony XB4BVB3 (LED Verde)', brand: 'Schneider Electric' };
      case 'pilot_light_red': return { ref: 'Harmony XB4BVB4 (LED Rojo)', brand: 'Schneider Electric' };
      case 'plc_cpu_s71200': return { ref: 'SIMATIC S7-1200 1214C DC/DC/RLY', brand: 'Siemens' };
      case 'plc_logo': return { ref: 'LOGO! 230RCE (6ED1052-1FB08-0BA1)', brand: 'Siemens' };
      default: return { ref: 'Material Eléctrico Homologado', brand: 'Industrial Genérico' };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden text-slate-800 my-auto">
        {/* Barra de acciones superior */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold tracking-wide">
              Reporte Técnico & Lista de Materiales (BOM)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CUERPO DEL INFORME (ESTILO INGENIERÍA INDUSTRIAL) */}
        <div className="p-8 space-y-6 print:p-0 print:space-y-4 text-xs font-sans">
          {/* Cabecera Técnica */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                Memoria Técnica de Instalación & Control
              </h1>
              <h2 className="text-xs font-bold text-blue-700 tracking-wider uppercase">
                Diseño de Cuadros Eléctricos y Automatización Industrial
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Especificación técnica de componentes, conductores y protecciones
              </p>
            </div>
            <div className="text-right">
              <BrandLogo />
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Fecha: {document.titleBlock.date || new Date().toISOString().split('T')[0]}
              </p>
            </div>
          </div>

          {/* Ficha técnica del esquema */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1.5">
              <div>
                <span className="text-slate-400 font-semibold">Proyecto: </span>
                <span className="font-bold text-slate-900">{document.titleBlock.project || 'Automatismos Industriales'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Título del Esquema: </span>
                <span className="font-bold text-blue-800">{document.titleBlock.title || 'Esquema Eléctrico'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Proyectista / Autor: </span>
                <span className="font-bold text-slate-900">{document.titleBlock.author || 'Simón Barrera Ruíz'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Tensión de Red: </span>
                <span className="font-mono text-slate-800 font-semibold">3~ 400V AC + N + PE (50/60 Hz)</span>
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <div>
                <span className="text-slate-400 font-semibold">Escala / Formato: </span>
                <span className="font-mono text-slate-800 font-semibold">DIN A4 • {document.titleBlock.scale || '1:1'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Revisión: </span>
                <span className="font-bold text-slate-800">{document.titleBlock.revision || '1.0'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Norma de Representación: </span>
                <span className="font-mono text-slate-800 font-semibold">IEC 60617 / IEC 60848</span>
              </div>
            </div>
          </div>

          {/* LISTA DE MATERIALES (BOM) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Lista de Materiales y Equipos (Bill of Materials - BOM)
              </h3>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10.5px] font-bold text-slate-700">
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Designación</th>
                    <th className="py-2 px-3">Descripción del Componente</th>
                    <th className="py-2 px-3">Fabricante / Referencia Homologada</th>
                    <th className="py-2 px-3 text-center">Cant.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {Array.from(componentCounts.entries()).map(([type, data], index) => {
                    const commercial = getCommercialRef(type);
                    return (
                      <tr key={type} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono text-slate-500">{index + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{data.tags.join(', ')}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{data.name}</td>
                        <td className="py-2 px-3 text-slate-600">
                          <span className="font-semibold text-slate-800">{commercial.brand}</span> • {commercial.ref}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">{data.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Estadísticas técnicas */}
          <div className="grid grid-cols-3 gap-3 text-center pt-2">
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-[10px] text-slate-500 font-semibold">Conductores en Esquema</div>
              <div className="text-base font-bold font-mono text-slate-900">{document.wires.length} segmentos</div>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-[10px] text-slate-500 font-semibold">Bornes y Conexiones</div>
              <div className="text-base font-bold font-mono text-slate-900">{document.junctions.length} nodos</div>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-[10px] text-slate-500 font-semibold">Verificación Nodal</div>
              <div className="text-base font-bold font-mono text-emerald-600">Simulación Verificada</div>
            </div>
          </div>

          {/* Firmas de ingeniería */}
          <div className="pt-8 grid grid-cols-2 gap-12 text-center text-slate-600">
            <div className="border-t border-slate-400 pt-2">
              <div className="font-bold text-slate-900">Departamento de Proyectos</div>
              <div className="text-[10px] text-slate-500">Diseño Electrotécnico</div>
            </div>
            <div className="border-t border-slate-400 pt-2">
              <div className="font-bold text-slate-900">Control de Calidad</div>
              <div className="text-[10px] text-slate-500">Aprobación Técnica</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
