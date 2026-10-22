import React from 'react';
import { TitleBlockData } from '../../types/circuit';

interface Props {
  data: TitleBlockData;
  sheetWidth: number;
  sheetHeight: number;
  gridSize: number;
  onEditClick?: () => void;
}

export const TitleBlock: React.FC<Props> = ({
  data,
  sheetWidth,
  sheetHeight,
  gridSize,
  onEditClick
}) => {
  const width = 360;
  const height = 110;
  const x = sheetWidth - width - 20;
  const y = sheetHeight - height - 20;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer select-none group"
      onClick={onEditClick}
    >
      {/* Marco exterior */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        className="fill-white stroke-slate-800 stroke-2 group-hover:stroke-blue-600 transition-colors shadow-sm"
      />

      {/* Divisiones horizontales */}
      <line x1={0} y1={30} x2={width} y2={30} className="stroke-slate-300 stroke-1" />
      <line x1={0} y1={70} x2={width} y2={70} className="stroke-slate-300 stroke-1" />

      {/* Divisiones verticales */}
      <line x1={180} y1={30} x2={180} y2={height} className="stroke-slate-300 stroke-1" />
      <line x1={260} y1={70} x2={260} y2={height} className="stroke-slate-300 stroke-1" />

      {/* Cabecera / Empresa */}
      <text x={12} y={20} className="text-xs font-mono font-bold fill-slate-500">
        EMPRESA: <tspan className="fill-blue-700 font-bold">{data.company}</tspan>
      </text>

      {/* Título y Proyecto */}
      <text x={12} y={46} className="text-[10px] font-mono font-semibold fill-slate-400">
        TÍTULO:
      </text>
      <text x={12} y={62} className="text-xs font-bold fill-slate-900 font-sans">
        {data.title}
      </text>

      <text x={190} y={46} className="text-[10px] font-mono font-semibold fill-slate-400">
        PROYECTO:
      </text>
      <text x={190} y={62} className="text-xs font-semibold fill-slate-800 font-sans">
        {data.project}
      </text>

      {/* Detalles: Fecha, Autor, Hoja */}
      <text x={12} y={86} className="text-[10px] font-mono fill-slate-400">
        FECHA: <tspan className="fill-slate-800 font-semibold">{data.date}</tspan>
      </text>
      <text x={12} y={100} className="text-[10px] font-mono fill-slate-400">
        DIBUJADO: <tspan className="fill-slate-800 font-semibold">{data.author}</tspan>
      </text>

      <text x={190} y={86} className="text-[10px] font-mono fill-slate-400">
        ESCALA: <tspan className="fill-slate-800 font-semibold">{data.scale}</tspan>
      </text>
      <text x={190} y={100} className="text-[10px] font-mono fill-slate-400">
        REV: <tspan className="fill-slate-800 font-semibold">{data.revision}</tspan>
      </text>

      <text x={270} y={86} className="text-[10px] font-mono fill-slate-400">
        HOJA:
      </text>
      <text x={270} y={100} className="text-xs font-mono font-bold fill-blue-700">
        {data.sheet}
      </text>
    </g>
  );
};
