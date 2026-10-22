import React from 'react';
import { WireSegment, JunctionNode, WireType } from '../../types/circuit';

interface Props {
  wires: WireSegment[];
  junctions: JunctionNode[];
  gridSize: number;
  energizedWires: Set<string>;
  selectedWireId?: string | null;
  onWireClick?: (wire: WireSegment, e: React.MouseEvent) => void;
}

export const WireRenderer: React.FC<Props> = ({
  wires,
  junctions,
  gridSize,
  energizedWires,
  selectedWireId,
  onWireClick
}) => {
  const getWireColor = (wireType: WireType, isEnergized: boolean): string => {
    if (isEnergized) {
      if (wireType === 'neutral') return '#60a5fa'; // Azul brillante
      if (wireType === 'pe') return '#4ade80';      // Verde brillante
      return '#f87171';                             // Rojo vivo energizado
    }

    switch (wireType) {
      case 'phase1': return '#b45309';  // Marrón L1
      case 'phase2': return '#3f3f46';  // Negro/Gris oscuro L2
      case 'phase3': return '#71717a';  // Gris L3
      case 'neutral': return '#2563eb'; // Azul N
      case 'pe': return '#16a34a';      // Verde PE
      case 'dc_pos': return '#dc2626';  // Rojo +24V
      case 'dc_neg': return '#1e293b';  // Negro/Gris 0V
      case 'control': return '#dc2626'; // Rojo de maniobra
      default: return '#94a3b8';
    }
  };

  return (
    <g className="wires-layer">
      {/* Trazado interactivo de cables */}
      {wires.map(wire => {
        const x1 = wire.fromX * gridSize;
        const y1 = wire.fromY * gridSize;
        const x2 = wire.toX * gridSize;
        const y2 = wire.toY * gridSize;
        const isEnergized = energizedWires.has(wire.id);
        const isSelected = selectedWireId === wire.id;
        const strokeColor = getWireColor(wire.wireType, isEnergized);

        return (
          <g key={wire.id} className="group">
            {/* Halo de energía si está bajo tensión eléctrica */}
            {isEnergized && (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth={6}
                strokeOpacity={0.3}
                strokeLinecap="round"
                className="pointer-events-none"
              />
            )}

            {/* Resaltado visual de selección activa (Glow cian + línea punteada + marcadores terminales) */}
            {isSelected && (
              <>
                {/* Resplandor exterior cian */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#06b6d4"
                  strokeWidth={8}
                  strokeOpacity={0.5}
                  strokeLinecap="round"
                  className="pointer-events-none animate-pulse"
                />
                {/* Línea punteada de contraste técnico */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#0284c7"
                  strokeWidth={3.5}
                  strokeDasharray="5 3"
                  strokeLinecap="round"
                  className="pointer-events-none"
                />
                {/* Puntos terminales del cable seleccionado */}
                <circle
                  cx={x1}
                  cy={y1}
                  r={4}
                  className="fill-cyan-400 stroke-white stroke-1.5 pointer-events-none shadow-xs"
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r={4}
                  className="fill-cyan-400 stroke-white stroke-1.5 pointer-events-none shadow-xs"
                />
              </>
            )}

            {/* Línea gráfica principal del cable */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isSelected ? '#0284c7' : strokeColor}
              strokeWidth={wire.wireType === 'control' ? 2 : 2.5}
              strokeLinecap="round"
              className="transition-colors duration-150 pointer-events-none"
            />

            {/* Zona de impacto táctil / clic transparente amplia (12px de ancho) */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="transparent"
              strokeWidth={12}
              strokeLinecap="round"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onWireClick?.(wire, e);
              }}
            />
          </g>
        );
      })}

      {/* Nodos de unión / Conexión (Junction dots) */}
      {junctions.map(j => (
        <circle
          key={j.id}
          cx={j.x * gridSize}
          cy={j.y * gridSize}
          r={3.5}
          className="fill-slate-900 stroke-white stroke-1 pointer-events-none"
        />
      ))}
    </g>
  );
};
