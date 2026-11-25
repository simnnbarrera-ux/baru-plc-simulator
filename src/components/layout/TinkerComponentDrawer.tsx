import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { COMPONENT_CATALOG, CATEGORY_METADATA } from '../../core/components/catalog';
import { ComponentIcon } from '../common/ComponentIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddComponent: (compType: string) => void;
}

export const TinkerComponentDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  onAddComponent
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(
    () => CATEGORY_METADATA.filter(c => c.id !== 'wires'),
    []
  );

  const filteredComponents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COMPONENT_CATALOG.filter(comp => {
      const catMatch = selectedCategory === 'all' || comp.category === selectedCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        comp.name.toLowerCase().includes(q) ||
        comp.description.toLowerCase().includes(q) ||
        comp.defaultTag.toLowerCase().includes(q) ||
        comp.type.toLowerCase().includes(q)
      );
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <aside className="w-72 shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col h-full z-20 select-none">
      {/* Encabezado del cajón de componentes */}
      <div className="p-3 bg-white border-b border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Componentes
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            title="Ocultar cajón"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar motor, PLC, cilindro..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border border-transparent focus:bg-white focus:border-sky-400 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Selector de categoría */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filtrar categoría"
          className="w-full px-2.5 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200/80 focus:outline-none focus:border-sky-400"
        >
          <option value="all">Todas las categorías ({COMPONENT_CATALOG.length})</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Rejilla de tarjetas estilo Tinkercad */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {filteredComponents.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            Sin coincidencias para "{search}"
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredComponents.map(comp => (
              <button
                key={comp.type}
                onClick={() => onAddComponent(comp.type)}
                title={`${comp.name} — ${comp.description}`}
                className="group flex flex-col items-center justify-between p-2.5 bg-white hover:bg-sky-50/70 rounded-xl border border-slate-200 hover:border-sky-400 shadow-2xs hover:shadow-md transition-all text-center cursor-pointer active:scale-95"
              >
                <div className="w-11 h-11 rounded-lg bg-slate-50 group-hover:bg-white flex items-center justify-center mb-1.5 transition-colors">
                  <ComponentIcon type={comp.type} size={32} />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 group-hover:text-sky-800 leading-tight line-clamp-2">
                  {comp.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
