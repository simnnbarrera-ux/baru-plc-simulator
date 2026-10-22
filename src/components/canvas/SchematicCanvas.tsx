import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { PlacedComponent, WireSegment, CircuitDocument, WireType } from '../../types/circuit';
import { SimulationState } from '../../types/simulation';
import { COMPONENT_CATALOG } from '../../core/components/catalog';
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

export interface SnapPoint {
  x: number;
  y: number;
  type: 'pin' | 'wire_terminal' | 'junction';
  id: string;
  label?: string;
  componentTag?: string;
}

interface Props {
  document: CircuitDocument;
  simulationState: SimulationState;
  activeWireType: WireType | null;
  activeTool: 'select' | 'wire' | 'delete' | string | null;
  selectedWireId?: string | null;
  onSetTool?: (tool: string | null) => void;
  onUpdateDocument: (doc: CircuitDocument, recordHistory?: boolean, prevSnapshot?: CircuitDocument) => void;
  onComponentSelect: (comp: PlacedComponent | null) => void;
  onWireSelect?: (wire: WireSegment | null) => void;
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
  selectedWireId,
  onSetTool,
  onUpdateDocument,
  onComponentSelect,
  onWireSelect,
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

  // Selección y arrastre de componentes y cables
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [internalSelectedWireId, setInternalSelectedWireId] = useState<string | null>(null);
  const currentSelectedWireId = selectedWireId !== undefined ? selectedWireId : internalSelectedWireId;

  const setSelectedWire = useCallback((wireId: string | null) => {
    setInternalSelectedWireId(wireId);
    const wire = wireId ? document.wires.find(w => w.id === wireId) || null : null;
    onWireSelect?.(wire);
  }, [document.wires, onWireSelect]);

  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartDocRef = useRef<CircuitDocument | null>(null);
  const dragStartPosRef = useRef<{ id: string; x: number; y: number } | null>(null);

  // Trazado interactivo de cables y snapping estricto
  const [wireStart, setWireStart] = useState<{ x: number; y: number } | null>(null);
  const [hoveredSnap, setHoveredSnap] = useState<SnapPoint | null>(null);
  const [mouseGridPos, setMouseGridPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isWiringMode = activeTool === 'wire' || (typeof activeTool === 'string' && activeTool.startsWith('wire'));
  const effectiveWireType: WireType = activeWireType || 'phase1';

  // Si salimos del modo cableado, cancelar inmediatamente cualquier cable pendiente
  useEffect(() => {
    if (!isWiringMode) {
      setWireStart(null);
      setHoveredSnap(null);
    }
  }, [isWiringMode]);

  // Recopilar todos los puntos de conexión válidos del esquema (pines, extremos de cables, uniones)
  const getSnapPoints = useCallback((): SnapPoint[] => {
    const points: SnapPoint[] = [];
    const seen = new Set<string>();

    // 1. Pines de componentes colocados
    for (const comp of document.components) {
      const def = COMPONENT_CATALOG.find(c => c.type === comp.type);
      if (!def) continue;

      for (const pin of def.pins) {
        let px = pin.relX;
        let py = pin.relY;

        if (comp.rotation === 90) {
          const oldX = px;
          px = def.height - py;
          py = oldX;
        } else if (comp.rotation === 180) {
          px = def.width - px;
          py = def.height - py;
        } else if (comp.rotation === 270) {
          const oldX = px;
          px = py;
          py = def.width - oldX;
        }

        const worldX = comp.x + px;
        const worldY = comp.y + py;
        const key = `${worldX},${worldY}`;
        seen.add(key);

        points.push({
          x: worldX,
          y: worldY,
          type: 'pin',
          id: `${comp.id}_${pin.id}`,
          label: `${comp.tag}:${pin.label}`,
          componentTag: comp.tag
        });
      }
    }

    // 2. Extremos de cables existentes
    for (const wire of document.wires) {
      const kFrom = `${wire.fromX},${wire.fromY}`;
      if (!seen.has(kFrom)) {
        seen.add(kFrom);
        points.push({
          x: wire.fromX,
          y: wire.fromY,
          type: 'wire_terminal',
          id: `wire_${wire.id}_from`,
          label: 'Terminal'
        });
      }

      const kTo = `${wire.toX},${wire.toY}`;
      if (!seen.has(kTo)) {
        seen.add(kTo);
        points.push({
          x: wire.toX,
          y: wire.toY,
          type: 'wire_terminal',
          id: `wire_${wire.id}_to`,
          label: 'Terminal'
        });
      }
    }

    // 3. Nodos de unión existentes
    for (const j of document.junctions) {
      const kJ = `${j.x},${j.y}`;
      if (!seen.has(kJ)) {
        seen.add(kJ);
        points.push({
          x: j.x,
          y: j.y,
          type: 'junction',
          id: j.id,
          label: 'Conexión'
        });
      }
    }

    return points;
  }, [document.components, document.wires, document.junctions]);

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

  // Convertir coordenadas del ratón a coordenadas de la rejilla (flotante y entera)
  const screenToGridRaw = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { rawGridX: 0, rawGridY: 0, gridX: 0, gridY: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = (clientX - rect.left - pan.x) / zoom;
    const rawY = (clientY - rect.top - pan.y) / zoom;
    return {
      rawGridX: rawX / gridSize,
      rawGridY: rawY / gridSize,
      gridX: Math.round(rawX / gridSize),
      gridY: Math.round(rawY / gridSize)
    };
  }, [pan, zoom, gridSize]);

  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    const { gridX, gridY } = screenToGridRaw(clientX, clientY);
    return { x: gridX, y: gridY };
  }, [screenToGridRaw]);

  // Buscar el punto de conexión válido más próximo al cursor
  const findNearestSnapPoint = useCallback((rawGridX: number, rawGridY: number, maxDist: number = 0.95): SnapPoint | null => {
    const points = getSnapPoints();
    let nearest: SnapPoint | null = null;
    let minDist = maxDist;

    for (const pt of points) {
      const dist = Math.hypot(pt.x - rawGridX, pt.y - rawGridY);
      if (dist < minDist) {
        minDist = dist;
        nearest = pt;
      }
    }
    return nearest;
  }, [getSnapPoints]);

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

  // Manejo de conexión de cables con verificación estricta de terminales
  const handleSnapClick = (e: React.MouseEvent) => {
    if (!isWiringMode) return;
    const { rawGridX, rawGridY } = screenToGridRaw(e.clientX, e.clientY);
    const snap = findNearestSnapPoint(rawGridX, rawGridY, 0.95);

    // REGLA ESTRICTA: No permitir colocar cables en el vacío. Sólo desde terminal/pin válido.
    if (!snap) {
      return;
    }

    if (!wireStart) {
      // Iniciar el trazado desde este pin o terminal
      setWireStart({ x: snap.x, y: snap.y });
    } else {
      // Finalizar el trazado: SOLO en un segundo pin/terminal/nodo diferente
      if (wireStart.x === snap.x && wireStart.y === snap.y) {
        return; // Clic en el mismo punto de origen: ignorar
      }

      const newWires: WireSegment[] = [];

      // Si los puntos coinciden en X o Y, crear un único segmento recto
      if (wireStart.x === snap.x || wireStart.y === snap.y) {
        newWires.push({
          id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          fromX: wireStart.x,
          fromY: wireStart.y,
          toX: snap.x,
          toY: snap.y,
          wireType: effectiveWireType
        });
      } else {
        // Si están en diagonal, crear trazado ortogonal limpio (2 tramos en ángulo recto)
        const cornerX = snap.x;
        const cornerY = wireStart.y;
        const idBase = Date.now();
        newWires.push({
          id: `wire_${idBase}_1`,
          fromX: wireStart.x,
          fromY: wireStart.y,
          toX: cornerX,
          toY: cornerY,
          wireType: effectiveWireType
        });
        newWires.push({
          id: `wire_${idBase}_2`,
          fromX: cornerX,
          fromY: cornerY,
          toX: snap.x,
          toY: snap.y,
          wireType: effectiveWireType
        });
      }

      onUpdateDocument({
        ...document,
        wires: [...document.wires, ...newWires]
      }, true);

      // Finalizar trazado actual
      setWireStart(null);
    }
  };

  // Borrado de cables con reconexión limpia de nodos
  const deleteWire = useCallback((wireId: string) => {
    const remainingWires = document.wires.filter(w => w.id !== wireId);
    const updatedJunctions = document.junctions.filter(j => {
      let connections = 0;
      for (const w of remainingWires) {
        if ((w.fromX === j.x && w.fromY === j.y) || (w.toX === j.x && w.toY === j.y)) {
          connections++;
        }
      }
      return connections >= 2;
    });
    onUpdateDocument({
      ...document,
      wires: remainingWires,
      junctions: updatedJunctions
    }, true);
    setSelectedWire(null);
  }, [document, onUpdateDocument, setSelectedWire]);

  // Borrado de componente
  const deleteComponent = useCallback((compId: string) => {
    onUpdateDocument({
      ...document,
      components: document.components.filter(c => c.id !== compId)
    }, true);
    setSelectedId(null);
    onComponentSelect(null);
  }, [document, onUpdateDocument, onComponentSelect]);

  // Manejo de eventos de ratón
  const handleMouseDown = (e: React.MouseEvent) => {
    // 1. Panning con Botón Secundario (Clic derecho), Botón Central (Rueda), Espacio o Modo Mano
    if (e.button === 2 || e.button === 1 || isSpacePressed || isPanToolActive) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    // Si estamos en modo cableado, resolver click de conexión con snapping
    if (isWiringMode) {
      handleSnapClick(e);
      return;
    }

    // Clic en fondo: deseleccionar
    if (
      e.target === containerRef.current || 
      (e.target as HTMLElement).tagName === 'svg' || 
      (e.target as HTMLElement).classList.contains('schematic-background') ||
      (e.target as HTMLElement).classList.contains('schematic-sheet') ||
      (e.target as HTMLElement).tagName === 'rect'
    ) {
      setSelectedId(null);
      setSelectedWire(null);
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

    const { rawGridX, rawGridY, gridX, gridY } = screenToGridRaw(e.clientX, e.clientY);
    setMouseGridPos({ x: gridX, y: gridY });
    onCoordinatesChange(gridX, gridY);

    if (isWiringMode) {
      const snap = findNearestSnapPoint(rawGridX, rawGridY, 0.95);
      setHoveredSnap(snap);
    } else if (hoveredSnap) {
      setHoveredSnap(null);
    }

    // Arrastre de componentes (sólo fuera de modo cableado)
    if (!isWiringMode && draggingCompId && simulationState.mode === 'stopped') {
      const updatedComps = document.components.map(c => {
        if (c.id === draggingCompId) {
          return {
            ...c,
            x: Math.max(1, gridX - dragOffset.x),
            y: Math.max(1, gridY - dragOffset.y)
          };
        }
        return c;
      });
      // Actualizar posición visualmente sin registrar pasos intermedios en el historial
      onUpdateDocument({ ...document, components: updatedComps }, false);
    }
  };

  const handleMouseUp = () => {
    if (draggingCompId && dragStartPosRef.current && dragStartDocRef.current) {
      const currComp = document.components.find(c => c.id === draggingCompId);
      if (currComp && (currComp.x !== dragStartPosRef.current.x || currComp.y !== dragStartPosRef.current.y)) {
        // La posición ha cambiado: registrar un único paso en el historial con el documento inicial
        onUpdateDocument(document, true, dragStartDocRef.current);
      }
    }
    setIsPanning(false);
    setDraggingCompId(null);
    dragStartDocRef.current = null;
    dragStartPosRef.current = null;
  };

  // Interacción con cables
  const handleWireClick = useCallback((wire: WireSegment, e: React.MouseEvent) => {
    if (isPanning || isPanToolActive) return;

    if (isWiringMode) {
      handleSnapClick(e);
      return;
    }

    e.stopPropagation();

    if (activeTool === 'delete') {
      deleteWire(wire.id);
      return;
    }

    setSelectedWire(wire.id);
    setSelectedId(null);
    onComponentSelect(null);
  }, [isPanning, isPanToolActive, isWiringMode, activeTool, deleteWire, handleSnapClick, onComponentSelect, setSelectedWire]);

  // Interacción con componentes
  const handleComponentClick = (comp: PlacedComponent, e: React.MouseEvent) => {
    if (isPanning || isPanToolActive) return;

    if (isWiringMode) {
      e.stopPropagation();
      handleSnapClick(e);
      return;
    }

    e.stopPropagation();

    if (activeTool === 'delete') {
      deleteComponent(comp.id);
      return;
    }

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
    setSelectedWire(null);
    onComponentSelect(comp);
  };

  const handleComponentMouseDown = (comp: PlacedComponent, e: React.MouseEvent) => {
    if (isSpacePressed || isPanToolActive || e.button === 2) return;
    if (isWiringMode) return; // En modo cableado no iniciar arrastre
    if (simulationState.mode !== 'stopped') return;
    if (e.button === 0) {
      const { gridX, gridY } = screenToGridRaw(e.clientX, e.clientY);
      setDraggingCompId(comp.id);
      setDragOffset({
        x: gridX - comp.x,
        y: gridY - comp.y
      });
      dragStartDocRef.current = JSON.parse(JSON.stringify(document));
      dragStartPosRef.current = { id: comp.id, x: comp.x, y: comp.y };
      setSelectedId(comp.id);
      setSelectedWire(null);
      onComponentSelect(comp);
    }
  };

  // Escucha de teclado global: Espacio para paneo, F para encuadre, Supr para borrar, Escape para cancelar
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

      // Atajo 'W' para entrar en modo cableado
      if ((e.key === 'w' || e.key === 'W') && (window.document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        onSetTool?.('wire');
      }

      // Tecla Escape: cancela cualquier trazado activo, deselecciona cable y componente
      if (e.key === 'Escape') {
        e.preventDefault();
        setWireStart(null);
        setHoveredSnap(null);
        setSelectedId(null);
        setSelectedWire(null);
        onComponentSelect(null);
        if (isWiringMode) {
          onSetTool?.('select');
        }
        return;
      }

      // Borrado de elementos o cables con Delete / Backspace (Supr)
      if (simulationState.mode === 'stopped' && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (currentSelectedWireId) {
          e.preventDefault();
          deleteWire(currentSelectedWireId);
          return;
        }
        if (selectedId) {
          e.preventDefault();
          deleteComponent(selectedId);
          return;
        }
      }

      // Atajo R para rotar componente seleccionado
      if (selectedId && simulationState.mode === 'stopped' && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        onUpdateDocument({
          ...document,
          components: document.components.map(c => {
            if (c.id === selectedId) {
              const nextRot = ((c.rotation + 90) % 360) as 0 | 90 | 180 | 270;
              return { ...c, rotation: nextRot };
            }
            return c;
          })
        }, true);
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
  }, [selectedId, currentSelectedWireId, document, simulationState.mode, isWiringMode, onUpdateDocument, onComponentSelect, setSelectedWire, deleteWire, deleteComponent, onSetTool, fitToScreen]);

  // Determinar cursor dinámico
  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (isSpacePressed || isPanToolActive) return 'cursor-grab';
    if (isWiringMode) {
      return hoveredSnap ? 'cursor-pointer' : 'cursor-crosshair';
    }
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
          selectedWireId={currentSelectedWireId}
          onWireClick={handleWireClick}
        />

        {/* Previsualización ortogonal del cable en trazado activo */}
        {wireStart && (() => {
          const targetX = hoveredSnap ? hoveredSnap.x : mouseGridPos.x;
          const targetY = hoveredSnap ? hoveredSnap.y : mouseGridPos.y;
          const isCollinear = wireStart.x === targetX || wireStart.y === targetY;

          return (
            <g className="wire-preview pointer-events-none">
              {isCollinear ? (
                <line
                  x1={wireStart.x * gridSize}
                  y1={wireStart.y * gridSize}
                  x2={targetX * gridSize}
                  y2={targetY * gridSize}
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  strokeDasharray="4 3"
                  className="animate-pulse"
                />
              ) : (
                <>
                  <line
                    x1={wireStart.x * gridSize}
                    y1={wireStart.y * gridSize}
                    x2={targetX * gridSize}
                    y2={wireStart.y * gridSize}
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    strokeDasharray="4 3"
                    className="animate-pulse"
                  />
                  <line
                    x1={targetX * gridSize}
                    y1={wireStart.y * gridSize}
                    x2={targetX * gridSize}
                    y2={targetY * gridSize}
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    strokeDasharray="4 3"
                    className="animate-pulse"
                  />
                  <circle
                    cx={targetX * gridSize}
                    cy={wireStart.y * gridSize}
                    r={3}
                    className="fill-blue-600 opacity-70"
                  />
                </>
              )}
              {/* Punto de origen del cable */}
              <circle
                cx={wireStart.x * gridSize}
                cy={wireStart.y * gridSize}
                r={4.5}
                className="fill-emerald-500 stroke-white stroke-2"
              />
            </g>
          );
        })()}

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

        {/* Capa de Puntos de Conexión (Snap targets) visible en modo cableado */}
        {isWiringMode && (
          <g className="snap-points-layer pointer-events-none">
            {getSnapPoints().map(pt => {
              const isOrigin = wireStart && wireStart.x === pt.x && wireStart.y === pt.y;
              const isHovered = hoveredSnap && hoveredSnap.x === pt.x && hoveredSnap.y === pt.y;
              return (
                <g key={pt.id}>
                  <circle
                    cx={pt.x * gridSize}
                    cy={pt.y * gridSize}
                    r={isHovered ? 5.5 : 3.5}
                    className={
                      isOrigin
                        ? 'fill-emerald-500 stroke-white stroke-1.5'
                        : isHovered
                          ? 'fill-emerald-400 stroke-emerald-600 stroke-2'
                          : 'fill-blue-500/50 stroke-blue-700/80 stroke-1'
                    }
                  />
                  {isHovered && (
                    <>
                      <circle
                        cx={pt.x * gridSize}
                        cy={pt.y * gridSize}
                        r={9}
                        className="fill-none stroke-emerald-500 stroke-1.5 animate-ping opacity-75"
                      />
                      {pt.label && (
                        <g transform={`translate(${pt.x * gridSize}, ${pt.y * gridSize - 14})`}>
                          <rect
                            x={-34}
                            y={-12}
                            width={68}
                            height={15}
                            rx={3}
                            className="fill-slate-900/90 stroke-slate-700 stroke-0.5"
                          />
                          <text
                            x={0}
                            y={-2}
                            textAnchor="middle"
                            className="text-[9px] font-mono font-bold fill-white select-none"
                          >
                            {pt.label}
                          </text>
                        </g>
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Cajetín de Título DIN A4 */}
        <TitleBlock
          data={document.titleBlock}
          sheetWidth={sheetWidth}
          sheetHeight={sheetHeight}
          gridSize={gridSize}
          onEditClick={() => {}}
        />

        {/* Mira y cursor de alineación de cuadrícula */}
        {isWiringMode && (
          <circle
            cx={(hoveredSnap ? hoveredSnap.x : mouseGridPos.x) * gridSize}
            cy={(hoveredSnap ? hoveredSnap.y : mouseGridPos.y) * gridSize}
            r={hoveredSnap ? 4 : 2.5}
            className={`${hoveredSnap ? 'fill-emerald-500' : 'fill-blue-600'} pointer-events-none opacity-80`}
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
