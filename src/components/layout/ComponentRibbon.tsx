import React, { useState } from 'react';
import { ComponentCategory, WireType } from '../../types/circuit';
import { COMPONENT_CATALOG, CATEGORY_METADATA } from '../../core/components/catalog';
import { RibbonComponentButton } from '../common/RibbonComponentButton';
import { RibbonWireButton } from '../common/RibbonWireButton';
import { 
  Zap, 
  ShieldAlert, 
  GitMerge, 
  Cog, 
  HandMetal, 
  Clock, 
  Lightbulb, 
  Spline, 
  Workflow, 
  Cpu 
} from 'lucide-react';

interface Props {
  selectedTool: string | null;
  selectedWireType: WireType | null;
  onSelectComponent: (type: string) => void;
  onSelectWire: (wireType: WireType) => void;
  onResetTool: () => void;
}

export const ComponentRibbon: React.FC<Props> = ({
  selectedTool,
  selectedWireType,
  onSelectComponent,
  onSelectWire,
  onResetTool
}) => {
  const [activeTab, setActiveTab] = useState<ComponentCategory>('power');

  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-3.5 h-3.5" />;
      case 'ShieldAlert': return <ShieldAlert className="w-3.5 h-3.5" />;
      case 'GitMerge': return <GitMerge className="w-3.5 h-3.5" />;
      case 'Cog': return <Cog className="w-3.5 h-3.5" />;
      case 'HandMetal': return <HandMetal className="w-3.5 h-3.5" />;
      case 'Clock': return <Clock className="w-3.5 h-3.5" />;
      case 'Lightbulb': return <Lightbulb className="w-3.5 h-3.5" />;
      case 'Spline': return <Spline className="w-3.5 h-3.5" />;
      case 'Workflow': return <Workflow className="w-3.5 h-3.5" />;
      case 'Cpu': return <Cpu className="w-3.5 h-3.5" />;
      default: return <Zap className="w-3.5 h-3.5" />;
    }
  };

  const activeComponents = COMPONENT_CATALOG.filter(c => c.category === activeTab);

  const wireTypes: { id: WireType; label: string; color: string; desc: string; standard: string; voltage: string }[] = [
    { id: 'phase1', label: 'Fase L1', color: '#b45309', desc: 'Marrón (L1)', standard: 'IEC 60446', voltage: '230V / 400V AC' },
    { id: 'phase2', label: 'Fase L2', color: '#1e293b', desc: 'Negro (L2)', standard: 'IEC 60446', voltage: '230V / 400V AC' },
    { id: 'phase3', label: 'Fase L3', color: '#64748b', desc: 'Gris (L3)', standard: 'IEC 60446', voltage: '230V / 400V AC' },
    { id: 'neutral', label: 'Neutro (N)', color: '#2563eb', desc: 'Azul Celeste', standard: 'IEC 60446', voltage: '0V Referencia AC' },
    { id: 'pe', label: 'Protección (PE)', color: '#16a34a', desc: 'Verde / Amarillo', standard: 'IEC 60446', voltage: '0V Tierra de Seguridad' },
    { id: 'control', label: 'Mando AC', color: '#dc2626', desc: 'Rojo Maniobra', standard: 'DIN EN 60204', voltage: '230V / 110V AC' },
    { id: 'dc_pos', label: 'Positivo DC (+)', color: '#ef4444', desc: 'Rojo +24V', standard: 'DIN EN 60204', voltage: '+24V DC Continuo' },
    { id: 'dc_neg', label: 'Negativo DC (-)', color: '#0f172a', desc: 'Azul Oscuro / Negro', standard: 'DIN EN 60204', voltage: '0V DC Masa' },
  ];

  return (
    <div className="flex flex-col bg-[#eef1f5] border-b border-[#cbd5e1] shadow-xs select-none">
      {/* Pestañas de categorías superiores */}
      <div className="flex items-center px-2 pt-1.5 gap-1 overflow-x-auto scrollbar-none border-b border-[#d8dde6]">
        {CATEGORY_METADATA.map(cat => {
          const isActive = activeTab === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id as ComponentCategory)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-md transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white text-blue-700 border-t-2 border-blue-600 border-x border-[#cbd5e1] -mb-[1px] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              {renderCategoryIcon(cat.icon)}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenedor de herramientas / componentes de la pestaña activa */}
      <div className="flex items-center gap-2.5 p-2 overflow-x-auto min-h-[82px] bg-[#f8fafc] scrollbar-thin">
        {activeTab === 'wires' ? (
          <div className="flex items-center gap-2.5">
            {wireTypes.map(w => (
              <RibbonWireButton
                key={w.id}
                wire={w}
                isSelected={selectedWireType === w.id}
                onClick={() => onSelectWire(w.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            {activeComponents.map(comp => (
              <RibbonComponentButton
                key={comp.type}
                component={comp}
                isSelected={selectedTool === comp.type}
                onClick={() => onSelectComponent(comp.type)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
