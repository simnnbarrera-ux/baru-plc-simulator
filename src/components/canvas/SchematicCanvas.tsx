import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { PlacedComponent, WireSegment, CircuitDocument, WireType } from '../../types/circuit';
import { SimulationState } from '../../types/simulation';
import { ComponentRenderer } from './ComponentRenderer';
import { WireRenderer } from './WireRenderer';
import { TitleBlock } from './TitleBlock';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Hand, 
  MousePointer, 
  RotateCcw 
} from 'lucide-react';

export interface SchematicCanvasRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToScreen: () => void;
}

interface Props {
  document: CircuitDocument;
  simulationState: SimulationState;
  activeWireType: WireType | null;
  activeTool: 'select' | 'wire' | 'delete' | string | null;
  onUpdateDocument: (doc: CircuitDocument) => void;
  onComponentSelect: (comp: PlacedComponent | null) => void;
  onComponentEdit: (comp: PlacedComponent) => void;
  onCoordinatesChange: (x: number, y: number) => void;
  onToggleBreaker: (componentId: string) => void;
  onPressButton: (componentId: string, isPressed: boolean) => void;
}

export const SchematicCanvas = forwardRef<SchematicCanvasRef, Props>(({
  document,
  simulationState,
  activeWireType,
  activeTool,
  onUpdateDocument,
  onComponentSelect,
  onComponentEdit,
  onCoordinatesChange,
  onToggleBreaker,
  onPressButton
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimensiones del plano estándar DIN A4 horizontal
  const sheetWidth = 1200;
  const sheetHeight = 860;
  const gridSize = document.gridSize || 20;

  // Transformaciones de visualización (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(0.65);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 100, y: 50 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanToolActive, setIsPanToolActive] = useState<boolean>(false);

  // Selección y arrastre de componentes
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Trazado interactivo de cables
  const [wireStart, setWireStart] = useState<{ x: number; y: number } | null>(null);
  const [mouseGridPos, setMouseGridPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Función para ajustar el plano/circuito a la pantalla con encuadre óptimo
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    // Si hay componentes en el esquema, encuadramos el circuito centrado a una escala cómoda
    if (document.components && document.components.length > 0) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      document.components.forEach(c => {
        const w = 4 * gridSize;
        const h = (c.type.includes('motor') ? 6 : 4) * gridSize;
        minX = Math.min(minX, c.x * gridSize);
        maxX = Math.max(maxX, c.x * gridSize + w);
        minY = Math.min(minY, c.y * gridSize);
        maxY = Math.max(maxY, c.y * gridSize + h);
      });

      if (document.wires && document.wires.length > 0) {
        document.wires.forEach(w => {
          minX = Math.min(minX, w.fromX * gridSize, w.toX * gridSize);
          maxX = Math.max(maxX, w.fromX * gridSize, w.toX * gridSize);
          minY = Math.min(minY, w.fromY * gridSize, w.toY * gridSize);
          maxY = Math.max(maxY, w.fromY * gridSize, w.toY * gridSize);
        });
      }

      // Márgenes cómodos alrededor del circuito en píxeles de dibujo
      const padCircuitX = 35;
      const padCircuitY = 25;
      const boxMinX = Math.max(0, minX - padCircuitX);
      const boxMaxX = Math.min(sheetWidth, maxX + padCircuitX);
      const boxMinY = Math.max(0, minY - padCircuitY);
      const boxMaxY = Math.min(sheetHeight, maxY + padCircuitY);

      const boxW = Math.max(300, boxMaxX - boxMinX);
      const boxH = Math.max(300, boxMaxY - boxMinY);
      const boxCenterX = (boxMinX + boxMaxX) / 2;
      const boxCenterY = (boxMinY + boxMaxY) / 2;

      // Espacio disponible en la pantalla con margen de seguridad superior e inferior
      const screenMarginX = 50;
      const screenMarginY = 28;
      const availW = Math.max(200, clientWidth - screenMarginX * 2);
      const availH = Math.max(200, clientHeight - screenMarginY * 2);

      const scaleX = availW / boxW;
      const scaleY = availH / boxH;
      // Ajuste exacto para que el circuito NUNCA se corte ni arriba ni abajo
      const fitZoom = Math.min(scaleX, scaleY);
      const optimalZoom = Math.min(Math.max(0.40, fitZoom), 1.15);

      const centeredX = clientWidth / 2 - boxCenterX * optimalZoom;
      const centeredY = clientHeight / 2 - boxCenterY * optimalZoom;

      setZoom(Number(optimalZoom.toFixed(2)));
      setPan({ x: Math.round(centeredX), y: Math.round(centeredY) });
    } else {
      // Si el lienzo está vacío, encuadramos la hoja completa
      const padding = 50;
      const availableW = clientWidth - padding * 2;
      const availableH = clientHeight - padding * 2;

      const scaleX = availableW / sheetWidth;
      const scaleY = availableH / sheetHeight;
      const optimalZoom = Math.min(Math.max(0.6, Math.min(scaleX, scaleY)), 1.1);

      const centeredX = (clientWidth - sheetWidth * optimalZoom) / 2;
      const centeredY = (clientHeight - sheetHeight * optimalZoom) / 2;

      setZoom(optimalZoom);
      setPan({ x: Math.round(centeredX), y: Math.round(centeredY) });
    }
  }, [document.components, document.wires, gridSize, sheetWidth, sheetHeight]);

  // Ajustar automáticamente al cargar y ante cambios de tamaño del contenedor
  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen();
    }, 100);

    if (!containerRef.current) return () => clearTimeout(timer);
    const observer = new ResizeObserver(() => {
      fitToScreen();
    });
    observer.observe(containerRef.current);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [fitToScreen]);

  // Convertir coordenadas del ratón a coordenadas de la rejilla
  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = (clientX - rect.left - pan.x) / zoom;
    const rawY = (clientY - rect.top - pan.y) / zoom;
    return {
      x: Math.round(rawX / gridSize),
      y: Math.round(rawY / gridSize)
    };
  }, [pan, zoom, gridSize]);

  // Manejo de Zoom con rueda del ratón hacia el punto del cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomMultiplier = e.deltaY < 0 ? 1.12 : 0.89;
    const newZoom = Math.min(Math.max(0.3, zoom * zoomMultiplier), 3.0);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setPan(prev => ({
        x: mouseX - (mouseX - prev.x) * (newZoom / zoom),
        y: mouseY - (mouseY - prev.y) * (newZoom / zoom)
      }));
      setZoom(newZoom);
    }
  };

  // Botones rápidos de Zoom
  const zoomIn = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newZoom = Math.min(3.0, zoom * 1.2);
    setPan(prev => ({
      x: centerX - (centerX - prev.x) * (newZoom / zoom),
      y: centerY - (centerY - prev.y) * (newZoom / zoom)
    }));
    setZoom(newZoom);
  };

  const zoomOut = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newZoom = Math.max(0.3, zoom * 0.83);
    setPan(prev => ({
      x: centerX - (centerX - prev.x) * (newZoom / zoom),
      y: centerY - (centerY - prev.y) * (newZoom / zoom)
    }));
    setZoom(newZoom);
  };

  const resetZoom = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newZoom = 1.0;
    setPan(prev => ({
      x: centerX - (centerX - prev.x) * (newZoom / zoom),
      y: centerY - (centerY - prev.y) * (newZoom / zoom)
    }));
    setZoom(newZoom);
  };

  useImperativeHandle(ref, () => ({
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen
  }), [zoomIn, zoomOut, resetZoom, fitToScreen]);

  // Manejo de eventos de ratón
  const handleMouseDown = (e: React.MouseEvent) => {
    // 1. Panning con Botón Secundario (Clic derecho), Botón Central (Rueda), Espacio o Modo Mano
    if (e.button === 2 || e.button === 1 || isSpacePressed || isPanToolActive) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    const gridPos = screenToGrid(e.clientX, e.clientY);

    // Herramienta de cableado
    if (activeTool === 'wire' && activeWireType) {
      if (!wireStart) {
        setWireStart(gridPos);
      } else {
        if (wireStart.x !== gridPos.x || wireStart.y !== gridPos.y) {
          const newWire: WireSegment = {
            id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            fromX: wireStart.x,
            fromY: wireStart.y,
            toX: gridPos.x,
            toY: gridPos.y,
            wireType: activeWireType
          };

          onUpdateDocument({
            ...document,
            wires: [...document.wires, newWire]
          });
        }
        setWireStart(gridPos);
      }
      return;
    }

    // Clic en fondo: deseleccionar
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).classList.contains('schematic-background')) {
      setSelectedId(null);
      onComponentSelect(null);
      setWireStart(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
      return;
    }

    const gridPos = screenToGrid(e.clientX, e.clientY);
    setMouseGridPos(gridPos);
    onCoordinatesChange(gridPos.x, gridPos.y);

    // Arrastre de componentes
    if (draggingCompId && simulationState.mode === 'stopped') {
      const updatedComps = document.components.map(c => {
        if (c.id === draggingCompId) {
          return {
            ...c,
            x: Math.max(1, gridPos.x - dragOffset.x),
            y: Math.max(1, gridPos.y - dragOffset.y)
          };
        }
        return c;
      });
      onUpdateDocument({ ...document, components: updatedComps });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingCompId(null);
  };

  // Interacción con componentes
  const handleComponentClick = (comp: PlacedComponent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPanning || isPanToolActive) return;

    if (simulationState.mode === 'running') {
      if (comp.type.startsWith('breaker_')) {
        onToggleBreaker(comp.id);
        return;
      }
      if (comp.type.startsWith('button_') || comp.type === 'emergency_stop' || comp.type.startsWith('limit_switch_')) {
        onPressButton(comp.id, true);
        setTimeout(() => onPressButton(comp.id, false), 350);
        return;
      }
    }

    setSelectedId(comp.id);
    onComponentSelect(comp);
  };

  const handleComponentMouseDown = (comp: PlacedComponent, e: React.MouseEvent) => {
    if (isSpacePressed || isPanToolActive || e.button === 2) return;
    if (simulationState.mode !== 'stopped') return;
    if (e.button === 0) {
      const gridPos = screenToGrid(e.clientX, e.clientY);
      setDraggingCompId(comp.id);
      setDragOffset({
        x: gridPos.x - comp.x,
        y: gridPos.y - comp.y
      });
      setSelectedId(comp.id);
      onComponentSelect(comp);
    }
  };

  // Escucha de teclado global: Espacio para paneo, F para encuadre, Supr para borrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Espacio para Modo Mano
      if (e.code === 'Space' && !e.repeat && (window.document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      // Atajo 'F' para Fit to screen
      if ((e.key === 'f' || e.key === 'F') && (window.document.activeElement?.tagName !== 'INPUT')) {
        fitToScreen();
      }

      // Atajo '0' para Reset Zoom 100%
      if (e.key === '0' && (window.document.activeElement?.tagName !== 'INPUT')) {
        resetZoom();
      }

      // Atajos de componente seleccionado
      if (!selectedId || simulationState.mode !== 'stopped') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        onUpdateDocument({
          ...document,
          components: document.components.filter(c => c.id !== selectedId)
        });
        setSelectedId(null);
        onComponentSelect(null);
      } else if (e.key === 'r' || e.key === 'R') {
        onUpdateDocument({
          ...document,
          components: document.components.map(c => {
            if (c.id === selectedId) {
              const nextRot = ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270;
              return { ...c, rotation: nextRot };
            }
            return c;
          })
        });
      } else if (e.key === 'Escape') {
        setWireStart(null);
        setSelectedId(null);
        onComponentSelect(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, document, simulationState.mode, onUpdateDocument, onComponentSelect, fitToScreen]);

  // Determinar cursor dinámico
  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (isSpacePressed || isPanToolActive) return 'cursor-grab';
    if (activeTool === 'wire') return 'cursor-crosshair';
    return 'cursor-default';
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-[#e9edf2] select-none ${getCursorClass()}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={e => e.preventDefault()}
    >
      <svg
        className="w-full h-full overflow-visible"
        width="100%"
        height="100%"
      >
        <defs>
          {/* Patrón de cuadrícula milimétrica nítida para plano técnico blanco */}
          <pattern
            id="cad-grid-pattern"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={gridSize / 2} cy={gridSize / 2} r={0.8} fill="#94a3b8" opacity={0.65} />
          </pattern>
        </defs>

        {/* Grupo Maestro con Pan y Zoom (Sin restricciones de recorte del viewport SVG) */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Hoja de plano DIN A4 con fondo blanco hueso técnico, marco y sombra de papel */}
          <g className="schematic-sheet">
          {/* Sombra de la hoja */}
          <rect
            x={4}
            y={6}
            width={sheetWidth}
            height={sheetHeight}
            rx={2}
            className="fill-slate-900/10"
          />
          {/* Papel blanco técnico */}
          <rect
            x={0}
            y={0}
            width={sheetWidth}
            height={sheetHeight}
            rx={2}
            className="fill-white stroke-slate-300 stroke-1"
          />
          {/* Rejilla de puntos */}
          <rect
            x={0}
            y={0}
            width={sheetWidth}
            height={sheetHeight}
            fill="url(#cad-grid-pattern)"
            className="pointer-events-none"
          />
          {/* Marco exterior de margen reglamentario DIN A4 */}
          <rect
            x={12}
            y={12}
            width={sheetWidth - 24}
            height={sheetHeight - 24}
            className="fill-none stroke-slate-700 stroke-1 pointer-events-none"
          />
          <rect
            x={14}
            y={14}
            width={sheetWidth - 28}
            height={sheetHeight - 28}
            className="fill-none stroke-slate-300 stroke-0.5 pointer-events-none"
          />
        </g>

        {/* Capa de Cables y Conexiones */}
        <WireRenderer
          wires={document.wires}
          junctions={document.junctions}
          gridSize={gridSize}
          energizedWires={simulationState.energizedWires}
        />

        {/* Previsualización del cable en trazado activo */}
        {wireStart && (
          <line
            x1={wireStart.x * gridSize}
            y1={wireStart.y * gridSize}
            x2={mouseGridPos.x * gridSize}
            y2={mouseGridPos.y * gridSize}
            stroke="#2563eb"
            strokeWidth={2.5}
            strokeDasharray="4 3"
            className="animate-pulse"
          />
        )}

        {/* Capa de Componentes Eléctricos */}
        {document.components.map(comp => (
          <ComponentRenderer
            key={comp.id}
            component={comp}
            gridSize={gridSize}
            isSelected={comp.id === selectedId}
            simulationState={simulationState}
            onMouseDown={e => handleComponentMouseDown(comp, e)}
            onClick={e => handleComponentClick(comp, e)}
          />
        ))}

        {/* Cajetín de Título DIN A4 */}
        <TitleBlock
          data={document.titleBlock}
          sheetWidth={sheetWidth}
          sheetHeight={sheetHeight}
          gridSize={gridSize}
          onEditClick={() => {}}
        />

        {/* Mira y cursor de alineación de cuadrícula */}
        {activeTool === 'wire' && (
          <circle
            cx={mouseGridPos.x * gridSize}
            cy={mouseGridPos.y * gridSize}
            r={3}
            className="fill-blue-600 pointer-events-none animate-ping"
          />
        )}
        </g>
      </svg>

      {/* DOCK FLOTANTE DE CONTROL DE ZOOM Y NAVEGACIÓN (Bottom-Right) */}
      <div className="absolute bottom-5 right-5 z-40 flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-300 text-slate-700">
        <button
          onClick={zoomOut}
          title="Alejar Zoom (-)"
          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Porcentaje de Zoom / Reset */}
        <button
          onClick={resetZoom}
          title="Restablecer zoom al 100% (0)"
          className="px-2 py-1 text-xs font-mono font-bold hover:bg-slate-100 rounded-md transition-colors min-w-[50px] text-center"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={zoomIn}
          title="Acercar Zoom (+)"
          className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Ajustar a Pantalla (Fit All) */}
        <button
          onClick={fitToScreen}
          title="Ajustar hoja completa a la pantalla (F)"
          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg hover:bg-slate-100 text-slate-800 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Ajustar</span>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Conmutador Modo Mano / Paneo */}
        <button
          onClick={() => setIsPanToolActive(!isPanToolActive)}
          title="Modo Mano / Desplazar plano (Espacio + Arrastre / Clic derecho)"
          className={`p-1.5 rounded-lg transition-colors ${
            isPanToolActive
              ? 'bg-blue-600 text-white shadow-xs'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Hand className="w-4 h-4" />
        </button>
      </div>

      {/* Tarjeta flotante con guía rápida de navegación */}
      <div className="absolute bottom-5 left-5 z-40 hidden sm:flex items-center gap-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg border border-slate-300 text-[11px] text-slate-600 shadow-sm pointer-events-none">
        <span><kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono font-bold text-slate-800">Clic Derecho</kbd> o <kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono font-bold text-slate-800">Espacio</kbd> + Arrastrar para mover</span>
        <span>•</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono font-bold text-slate-800">Rueda</kbd> para Zoom</span>
        <span>•</span>
        <span><kbd className="px-1 py-0.5 bg-slate-100 border rounded font-mono font-bold text-slate-800">F</kbd> para Centrar</span>
      </div>
    </div>
  );
});
