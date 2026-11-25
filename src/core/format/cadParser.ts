import { CircuitDocument, PlacedComponent, WireSegment, WireType } from '../../types/circuit';
import { COMPONENT_CATALOG } from '../components/catalog';
import {
  DEFAULT_TIA_PROGRAM,
  TiaGrafcetStep,
  TiaGrafcetTransition,
  TiaLadderBranch,
  TiaLadderCoil,
  TiaLadderContact,
  TiaLadderRung,
  TiaLadderTimer,
  TiaProgramDocument,
  TiaTag,
  transpileLadderToScl
} from '../plc/tiaEngine';

interface RawElem {
  idx: number;
  typeId: number;
  attrs: string[];
  coords: number[];
  label: string;
  rawX: number;
  rawY: number;
  rawX2: number;
  rawY2: number;
  rotIdx: number;
}

interface WorldPin {
  componentId: string;
  pinId: string;
  x: number;
  y: number;
}

const CATALOG_MAP = new Map(COMPONENT_CATALOG.map(c => [c.type, c]));

export class CadParser {
  /**
   * Analiza gramática de cualquier versión de CADe_SIMU (.cad)
   * V1.0, V2.0, V3.0, V4.0 y V4.2 (incluyendo bloques neumáticos, Ladder, PLC y GRAFCET)
   */
  public static parse(content: string): CircuitDocument {
    if (!content || !content.includes('CADe_SIMU')) {
      throw new Error('El archivo no contiene la cabecera válida de CADe_SIMU (*.cad)');
    }

    const doc: CircuitDocument = {
      version: '4.2',
      components: [],
      wires: [],
      junctions: [],
      titleBlock: {
        title: 'Esquema Eléctrico CADe_SIMU',
        project: 'Automatismos Industriales',
        author: 'Simón Barrera Ruíz',
        date: new Date().toISOString().split('T')[0],
        sheet: '1/1',
        scale: '1:1',
        revision: '1.0',
        company: 'Sistemas de Automatización'
      },
      gridSize: 20
    };

    // Separar cuerpo del circuito del bloque de carátula ($$$)
    const parts = content.split('$$$');
    let circuitBody = parts[0];
    const headerIdx = circuitBody.indexOf('CADe_SIMU');
    if (headerIdx !== -1) {
      circuitBody = circuitBody.slice(headerIdx + 'CADe_SIMU'.length);
    }

    const rawElements: RawElem[] = [];

    // Escáner determinista:
    // *<idx>*<type_id>#<attrs>*<16..25 enteros separados por *>#<optional_label>
    // Nota: en actuadores neumáticos (10501 / 10508) el último atributo NO está vacío (ej: #B+*1*1*...)
    // por lo que buscar '#*' tragaba elementos completos. Buscar el bloque numérico resuelve ambos casos.
    let pos = 0;
    const headRegex = /^\*(\d+)\*(\d+)#/;
    const nextElemRegex = /\*\d+\*\d+#/;
    const coordBlockRegex = /\*(-?\d+(?:\*-?\d+){15,})#/;

    while (pos < circuitBody.length) {
      const mHead = headRegex.exec(circuitBody.slice(pos));
      if (!mHead) {
        pos++;
        continue;
      }

      const idx = parseInt(mHead[1], 10);
      const typeId = parseInt(mHead[2], 10);
      let p = pos + mHead[0].length;

      const tail = circuitBody.slice(p);
      let attrStr = '';
      let coords: number[] = [];

      const mCoord = coordBlockRegex.exec(tail);
      if (mCoord) {
        attrStr = tail.slice(0, mCoord.index);
        coords = mCoord[1]
          .split('*')
          .map(v => parseInt(v, 10))
          .filter(n => !isNaN(n));
        p = p + mCoord.index + mCoord[0].length;
      } else {
        // Respaldo para bloques sintéticos con menos de 16 coordenadas
        const hashStar = circuitBody.indexOf('#*', p);
        if (hashStar === -1) break;
        attrStr = circuitBody.slice(p, hashStar);
        const coordStart = hashStar + 2;
        const nextHash = circuitBody.indexOf('#', coordStart);
        if (nextHash === -1) break;
        coords = circuitBody
          .slice(coordStart, nextHash)
          .split('*')
          .map(v => parseInt(v.trim(), 10))
          .filter(n => !isNaN(n));
        p = nextHash + 1;
      }

      const attrs = attrStr.split('#');

      const mNext = nextElemRegex.exec(circuitBody.slice(p));
      let label = '';
      if (mNext) {
        label = circuitBody.slice(p, p + mNext.index);
        pos = p + mNext.index;
      } else {
        label = circuitBody.slice(p);
        pos = circuitBody.length;
      }

      // Extraer coordenadas crudas (en 10501 / 10508 con 9 banderas previas, x/y están en [9],[10])
      let rawX = 0;
      let rawY = 0;
      let rawX2 = 0;
      let rawY2 = 0;
      let rotIdx = 17;

      const isPneumaticShifted =
        (typeId === 10501 || typeId === 10508) &&
        coords.length >= 11 &&
        (coords.length >= 24 || (coords[8] >= 0 && coords[8] <= 1 && coords[9] > 2 && coords[10] > 2));

      if (isPneumaticShifted) {
        rawX = coords[9];
        rawY = coords[10];
        rawX2 = coords.length >= 13 ? coords[11] : rawX;
        rawY2 = coords.length >= 13 ? coords[12] : rawY;
        rotIdx = 18;
      } else if (coords.length >= 10) {
        rawX = coords[8];
        rawY = coords[9];
        rawX2 = coords.length >= 12 ? coords[10] : rawX;
        rawY2 = coords.length >= 12 ? coords[11] : rawY;
        rotIdx = 17;
      }

      rawElements.push({
        idx,
        typeId,
        attrs,
        coords,
        label: this.cleanText(label),
        rawX,
        rawY,
        rawX2,
        rawY2,
        rotIdx
      });
    }

    // Detectar si el archivo fue exportado por esta aplicación web (roundtrip exacto)
    const nonWireElems = rawElements.filter(
      e =>
        !this.isWireType(e.typeId) &&
        e.typeId !== 4001 &&
        this.mapCodeToType(e.typeId, e.attrs, e.label) !== null
    );

    const isWebExport =
      (parts.length > 1 && parts[1].includes('333*3234&&&*Automatas')) ||
      (nonWireElems.length > 0 &&
        nonWireElems.every(
          e =>
            e.coords.length === 23 &&
            e.coords[12] === -12 &&
            e.coords[13] === -3 &&
            e.coords[14] === 18 &&
            e.coords[15] === 18
        ));

    // Calcular límites mínimos únicamente sobre elementos eléctricos/lógicos válidos
    // (ignorando gráficos, textos 5000..5999, ancla de cajetín 20000, etc.)
    let minRawX = Infinity;
    let minRawY = Infinity;

    for (const elem of rawElements) {
      const { typeId, attrs, coords, label, rawX, rawY, rawX2, rawY2 } = elem;
      if (coords.length < 10) continue;

      if (this.isWireType(typeId) && coords.length >= 12) {
        if (rawX === rawX2 && rawY === rawY2) continue;
        if (rawX > 0 && rawY > 0) {
          minRawX = Math.min(minRawX, rawX);
          minRawY = Math.min(minRawY, rawY);
        }
        if (rawX2 > 0 && rawY2 > 0) {
          minRawX = Math.min(minRawX, rawX2);
          minRawY = Math.min(minRawY, rawY2);
        }
      } else if (typeId === 4001) {
        if (rawX > 0 && rawY > 0) {
          minRawX = Math.min(minRawX, rawX);
          minRawY = Math.min(minRawY, rawY);
        }
      } else {
        const mapped = this.mapCodeToType(typeId, attrs, label);
        if (mapped !== null && mapped !== 'cad_text' && rawX > 0 && rawY > 0) {
          minRawX = Math.min(minRawX, rawX);
          minRawY = Math.min(minRawY, rawY);
        }
      }
    }

    // Si el archivo contiene únicamente anotaciones cad_text, usar su origen
    if (minRawX === Infinity) {
      for (const elem of rawElements) {
        if (elem.coords.length < 10) continue;
        if (this.mapCodeToType(elem.typeId, elem.attrs, elem.label) === 'cad_text' && elem.rawX > 0 && elem.rawY > 0) {
          minRawX = Math.min(minRawX, elem.rawX);
          minRawY = Math.min(minRawY, elem.rawY);
        }
      }
    }

    if (minRawX === Infinity) minRawX = 0;
    if (minRawY === Infinity) minRawY = 0;

    // Escala: CADe_SIMU usa múltiplos exactos de 3 -> 1 unidad de rejilla web.
    // En roundtrip web con coordenadas ya normalizadas, preservar posición exacta.
    const preserveExactWebCoords =
      isWebExport && minRawX >= 3 && minRawY >= 3 && minRawX <= 90 && minRawY <= 90;

    const scaleCoord = (raw: number, minRef: number): number => {
      if (preserveExactWebCoords) {
        return Math.round(raw / 3);
      }
      return Math.round((raw - minRef) / 3) + 3;
    };

    let compCounter = 1;
    let wireCounter = 1;
    let junctionCounter = 1;

    for (const elem of rawElements) {
      const { idx, typeId, attrs, coords, label, rawX, rawY, rawX2, rawY2, rotIdx } = elem;
      if (coords.length < 10) continue;

      // A. Cables y conductores (incluyendo enlaces GRAFCET 10105 / 10106 / 10112)
      if (this.isWireType(typeId) && coords.length >= 12) {
        const fromX = scaleCoord(rawX, minRawX);
        const fromY = scaleCoord(rawY, minRawY);
        const toX = scaleCoord(rawX2, minRawX);
        const toY = scaleCoord(rawY2, minRawY);

        // Descartar cables de longitud cero
        if (fromX === toX && fromY === toY) continue;

        doc.wires.push({
          id: `wire_${wireCounter++}`,
          fromX,
          fromY,
          toX,
          toY,
          wireType: this.mapWireType(typeId)
        });
        continue;
      }

      // B. Nodos de unión (Junctions)
      if (typeId === 4001) {
        doc.junctions.push({
          id: `jnc_${junctionCounter++}`,
          x: scaleCoord(rawX, minRawX),
          y: scaleCoord(rawY, minRawY)
        });
        continue;
      }

      // C. Componentes eléctricos, PLC, Ladder, GRAFCET y Neumática
      const mappedType = this.mapCodeToType(typeId, attrs, label);
      if (!mappedType) continue;

      const baseGridX = scaleCoord(rawX, minRawX);
      const baseGridY = scaleCoord(rawY, minRawY);

      const { dx, dy } = isWebExport
        ? { dx: 0, dy: 0 }
        : this.getDesktopAnchorOffset(typeId, mappedType);

      const posX = baseGridX + dx;
      const posY = baseGridY + dy;

      const rotation = this.parseRotation(coords, rotIdx, isWebExport);
      const { tag, plcAddress, value, timerValue } = this.extractTagAndAddress(typeId, mappedType, attrs, label, idx);

      const comp: PlacedComponent = {
        id: `comp_${compCounter++}`,
        type: mappedType,
        tag,
        x: posX,
        y: posY,
        rotation,
        state: { isOpen: false, isActuated: false, pistonPos: 0, valvePos: 'B' }
      };

      if (plcAddress) comp.plcAddress = plcAddress;
      if (value) comp.value = value;
      if (timerValue !== undefined) comp.timerValue = timerValue;

      doc.components.push(comp);
    }

    // Garantizar margen limpio mínimo (3, 3) sin alterar geometría relativa si el offset movió algo < 3
    if (!preserveExactWebCoords && (doc.components.length > 0 || doc.wires.length > 0)) {
      let actualMinX = Infinity;
      let actualMinY = Infinity;
      for (const c of doc.components) {
        actualMinX = Math.min(actualMinX, c.x);
        actualMinY = Math.min(actualMinY, c.y);
      }
      for (const w of doc.wires) {
        actualMinX = Math.min(actualMinX, w.fromX, w.toX);
        actualMinY = Math.min(actualMinY, w.fromY, w.toY);
      }
      for (const j of doc.junctions) {
        actualMinX = Math.min(actualMinX, j.x);
        actualMinY = Math.min(actualMinY, j.y);
      }

      const shiftX = actualMinX < 3 ? 3 - actualMinX : 0;
      const shiftY = actualMinY < 3 ? 3 - actualMinY : 0;
      if (shiftX !== 0 || shiftY !== 0) {
        for (const c of doc.components) {
          c.x += shiftX;
          c.y += shiftY;
        }
        for (const w of doc.wires) {
          w.fromX += shiftX;
          w.fromY += shiftY;
          w.toX += shiftX;
          w.toY += shiftY;
        }
        for (const j of doc.junctions) {
          j.x += shiftX;
          j.y += shiftY;
        }
      }
    }

    // Deduplicación, snapping de extremos a pines (<= 1 celda), puentes Ladder y división de T-uniones
    // (solo para .cad externos de escritorio para preservar roundtrip 100% fiel de export())
    if (!isWebExport) {
      this.snapWireEndpointsToPins(doc);
      this.bridgeAdjacentLadderElements(doc);
      this.bridgeGrafcetLinks(doc);
      this.splitWiresAtInteriorPoints(doc);
    }
    doc.wires = this.deduplicateWires(doc.wires);

    // Carátula y metadata del bloque $$$
    if (parts.length > 1) {
      const tb = parts[1];
      const filenameMatch = tb.match(/\*([^*#]+\.cad)\*/i);
      if (filenameMatch) {
        doc.titleBlock.title = this.cleanText(
          filenameMatch[1].replace(/\.cad$/i, '').replace(/_/g, ' ')
        );
      }
    }

    return doc;
  }

  /**
   * Extrae o sintetiza automáticamente un programa TIA Portal completo (LAD + SCL + GRAFCET + Tabla de Tags)
   * a partir de cualquier circuito importado (GRAFCET, Ladder, o esquema eléctrico/neumático puro).
   */
  public static extractTiaProgram(doc: CircuitDocument): TiaProgramDocument {
    const blockName = doc.titleBlock.title
      ? doc.titleBlock.title.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 24) || 'Main'
      : 'Main';

    if (doc.components.length === 0) {
      return {
        ...DEFAULT_TIA_PROGRAM,
        blockName
      };
    }

    const grafcetComps = doc.components.filter(c => c.type.startsWith('grafcet_'));
    const ladderComps = doc.components.filter(c => c.type.startsWith('plc_ladder_'));

    const tagsByAddr = new Map<string, TiaTag>();
    const exactSymbolToAddr = new Map<string, string>();
    const lowerSymbolToAddr = new Map<string, string>();
    const usedNames = new Set<string>();

    let nextInputBit = 0;
    let nextOutputBit = 0;
    let nextMemBit = 0;

    const allocBit = (area: 'I' | 'Q' | 'M'): string => {
      while (true) {
        const idx = area === 'I' ? nextInputBit++ : area === 'Q' ? nextOutputBit++ : nextMemBit++;
        const addr = `%${area}${Math.floor(idx / 8)}.${idx % 8}`;
        if (!tagsByAddr.has(addr)) return addr;
      }
    };

    const toValidSymbol = (raw: string, fallback: string): string => {
      let s = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\+/g, '_Mas')
        .replace(/-/g, '_Menos')
        .replace(/[^A-Za-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      if (!s || /^\d/.test(s)) {
        s = `${fallback}_${s || 'Tag'}`;
      }
      let candidate = s;
      let suffix = 2;
      while (usedNames.has(candidate.toLowerCase())) {
        candidate = `${s}_${suffix++}`;
      }
      usedNames.add(candidate.toLowerCase());
      return candidate;
    };

    const normalizeExplicitAddr = (raw?: string): string | null => {
      if (!raw) return null;
      const m = raw.trim().match(/^%?([IQM]\d+\.\d+)$/i);
      return m ? `%${m[1].toUpperCase()}` : null;
    };

    const looksLikeOutput = (name: string): boolean => {
      const n = name.trim();
      return /^([A-G][+-]|H_|KM|EV|Y\d|M_|Q\d|PILOT|MOTOR|VALV)/i.test(n);
    };

    const ensureTag = (
      rawName: string,
      explicitAddr: string | undefined,
      preferredArea: 'I' | 'Q' | 'M',
      comment?: string
    ): string => {
      const cleanRaw = this.cleanText(rawName);
      const normKey = cleanRaw.toLowerCase();
      // Evitar colisiones entre etapas GRAFCET (E0, E1) y sensores de cilindro (e0, e1)
      const isCaseSensitiveShort = /^[A-Za-z]\d+$/.test(cleanRaw);
      const explicit = normalizeExplicitAddr(explicitAddr) || normalizeExplicitAddr(cleanRaw);

      const registerSymbol = (addr: string) => {
        if (!cleanRaw) return;
        exactSymbolToAddr.set(cleanRaw, addr);
        if (!isCaseSensitiveShort) {
          lowerSymbolToAddr.set(normKey, addr);
        }
      };

      if (explicit) {
        if (!tagsByAddr.has(explicit)) {
          const symBase =
            cleanRaw && !normalizeExplicitAddr(cleanRaw)
              ? cleanRaw
              : explicit.replace('%', 'Tag_').replace('.', '_');
          tagsByAddr.set(explicit, {
            address: explicit,
            name: toValidSymbol(symBase, preferredArea),
            dataType: 'Bool',
            schematicTag: cleanRaw || explicit,
            comment: comment || `Importado desde CADe_SIMU (${cleanRaw || explicit})`
          });
        }
        registerSymbol(explicit);
        return explicit;
      }

      if (cleanRaw) {
        const existing = exactSymbolToAddr.get(cleanRaw) || (!isCaseSensitiveShort ? lowerSymbolToAddr.get(normKey) : undefined);
        if (existing) return existing;
      }

      const area = preferredArea === 'M' && looksLikeOutput(cleanRaw) ? 'Q' : preferredArea;
      const addr = allocBit(area);
      const symName = toValidSymbol(cleanRaw || addr.replace('%', ''), area);

      tagsByAddr.set(addr, {
        address: addr,
        name: symName,
        dataType: 'Bool',
        schematicTag: cleanRaw || undefined,
        comment: comment || `Variable extraída de plano CADe_SIMU`
      });
      registerSymbol(addr);
      return addr;
    };

    const getTagLabel = (addr: string): string => {
      const t = tagsByAddr.get(addr);
      return t?.schematicTag || t?.name || addr;
    };

    // Pre-registrar en 3 fases:
    // 1) Bobinas y acciones CON dirección explícita (prioridad de nombre de salida/marca)
    // 2) Contactos y bornes CON dirección explícita (reservar %I/%Q/%M declarados antes de autoasignar)
    // 3) Bobinas y acciones SIN dirección explícita
    for (const c of ladderComps) {
      if (c.type.startsWith('plc_ladder_coil')) {
        const exp = normalizeExplicitAddr(c.plcAddress) || normalizeExplicitAddr(c.tag);
        if (exp) ensureTag(c.tag, exp, looksLikeOutput(c.tag) ? 'Q' : 'M', 'Bobina Ladder importada');
      }
    }
    for (const c of grafcetComps) {
      if (c.type === 'grafcet_action') {
        const exp = normalizeExplicitAddr(c.plcAddress) || normalizeExplicitAddr(c.tag);
        if (exp) ensureTag(c.tag, exp, looksLikeOutput(c.tag) ? 'Q' : 'M', 'Acción GRAFCET importada');
      }
    }
    for (const c of ladderComps) {
      if (!c.type.startsWith('plc_ladder_coil')) {
        const exp = normalizeExplicitAddr(c.plcAddress) || normalizeExplicitAddr(c.tag);
        if (exp) {
          const area: 'I' | 'Q' | 'M' = exp.startsWith('%Q') ? 'Q' : exp.startsWith('%M') ? 'M' : 'I';
          ensureTag(c.tag, exp, area, 'Contacto Ladder importado');
        }
      }
    }
    for (const c of doc.components) {
      if (c.type === 'plc_input_module' || c.type === 'plc_output_module') {
        const exp = normalizeExplicitAddr(c.plcAddress || c.tag);
        if (exp) {
          ensureTag(c.tag, exp, exp.startsWith('%Q') ? 'Q' : 'I', 'Borne PLC importado');
        }
      }
    }
    for (const c of ladderComps) {
      if (c.type.startsWith('plc_ladder_coil')) {
        ensureTag(c.tag, c.plcAddress, looksLikeOutput(c.tag) ? 'Q' : 'M', 'Bobina Ladder importada');
      }
    }
    for (const c of grafcetComps) {
      if (c.type === 'grafcet_action') {
        ensureTag(c.tag, c.plcAddress, looksLikeOutput(c.tag) ? 'Q' : 'M', 'Acción GRAFCET importada');
      }
    }

    // ------------------------------------------------------------------------
    // 1. Reconstrucción de Redes Ladder (TiaLadderRung[])
    // ------------------------------------------------------------------------
    const rungs: TiaLadderRung[] = [];
    const ladderCoils = ladderComps
      .filter(c => c.type.startsWith('plc_ladder_coil'))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const ladderContacts = ladderComps
      .filter(c => c.type === 'plc_ladder_contact_no' || c.type === 'plc_ladder_contact_nc')
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const ladderTimers =
      ladderCoils.length > 0
        ? doc.components
            .filter(c => c.type === 'coil_timer_ton' || c.type === 'coil_timer_tof')
            .sort((a, b) => a.y - b.y || a.x - b.x)
        : [];

    if (ladderCoils.length > 0) {
      // Agrupar bobinas por banda horizontal (misma columna de bobinas: |dx| <= 8)
      const coilColumns: PlacedComponent[][] = [];
      for (const coil of ladderCoils) {
        const col = coilColumns.find(group => Math.abs(group[0].x - coil.x) <= 8);
        if (col) col.push(coil);
        else coilColumns.push([coil]);
      }

      // Ordenar columnas izquierda -> derecha y bobinas arriba -> abajo
      coilColumns.sort((a, b) => a[0].x - b[0].x);
      let rungNum = 1;
      const usedContactIds = new Set<string>();
      const usedTimerIds = new Set<string>();

      for (let colIdx = 0; colIdx < coilColumns.length; colIdx++) {
        const colCoils = coilColumns[colIdx].sort((a, b) => a.y - b.y || a.x - b.x);
        const prevColX = colIdx > 0 ? Math.max(...coilColumns[colIdx - 1].map(c => c.x)) + 2 : -Infinity;

        // Agrupar bobinas que comparten fila (|dy| <= 1) como bobinas en paralelo del mismo rung
        const coilRows: PlacedComponent[][] = [];
        for (const coil of colCoils) {
          const last = coilRows[coilRows.length - 1];
          if (last && Math.abs(last[0].y - coil.y) <= 1) {
            last.push(coil);
          } else {
            coilRows.push([coil]);
          }
        }

        // Pre-emparejar temporizadores IEC TON/TOF (10066) en cada fila de bobinas:
        // en CADe_SIMU el pin IN del 10066 está ~2 celdas arriba de la bobina conectada a Q.
        const rowTimers: (PlacedComponent | undefined)[] = coilRows.map((rowCoils, rIdx) => {
          const coilY = Math.min(...rowCoils.map(c => c.y));
          const prevCoilY = rIdx > 0 ? Math.min(...coilRows[rIdx - 1].map(c => c.y)) : -Infinity;
          const nextCoilY = rIdx + 1 < coilRows.length ? Math.min(...coilRows[rIdx + 1].map(c => c.y)) : Infinity;
          const rowMinCoilX = Math.min(...rowCoils.map(c => c.x));
          const candidates = ladderTimers.filter(
            tm =>
              !usedTimerIds.has(tm.id) &&
              tm.x > prevColX &&
              tm.x < rowMinCoilX &&
              tm.y >= coilY - 2 &&
              tm.y <= coilY + 1 &&
              tm.y > prevCoilY &&
              tm.y < nextCoilY - 1
          );
          if (candidates.length === 0) return undefined;
          candidates.sort((a, b) => Math.abs(a.y - coilY) - Math.abs(b.y - coilY));
          usedTimerIds.add(candidates[0].id);
          return candidates[0];
        });

        const getRowTopY = (rIdx: number): number => {
          const coilY = Math.min(...coilRows[rIdx].map(c => c.y));
          const tm = rowTimers[rIdx];
          return tm ? Math.min(coilY, tm.y - 1) : coilY;
        };

        for (let rIdx = 0; rIdx < coilRows.length; rIdx++) {
          const rowCoils = coilRows[rIdx];
          const rowCoilX = Math.min(...rowCoils.map(c => c.x));
          const rungTopY = getRowTopY(rIdx);
          const nextRungTopY =
            rIdx + 1 < coilRows.length ? getRowTopY(rIdx + 1) : Infinity;

          // Contactos pertenecientes a esta columna y banda vertical [rungTopY - 1, nextRungTopY - 1)
          const rungContacts = ladderContacts.filter(
            ct =>
              !usedContactIds.has(ct.id) &&
              ct.x > prevColX &&
              ct.x < rowCoilX &&
              ct.y >= rungTopY - 1 &&
              ct.y < nextRungTopY - 1
          );
          rungContacts.forEach(ct => usedContactIds.add(ct.id));

          // Agrupar contactos por fila (|dy| <= 1)
          const contactRowGroups: PlacedComponent[][] = [];
          for (const ct of rungContacts.sort((a, b) => a.y - b.y || a.x - b.x)) {
            const grp = contactRowGroups.find(g => Math.abs(g[0].y - ct.y) <= 1);
            if (grp) grp.push(ct);
            else contactRowGroups.push([ct]);
          }
          contactRowGroups.sort((a, b) => a[0].y - b[0].y);

          const toTiaContact = (ct: PlacedComponent, cIdx: number): TiaLadderContact => ({
            id: `cad_ct_${rungNum}_${cIdx}`,
            type: ct.type === 'plc_ladder_contact_nc' ? 'NC' : 'NO',
            address: ensureTag(ct.tag, ct.plcAddress, 'I', 'Contacto Ladder importado')
          });

          const branches: TiaLadderBranch[] = [];
          const seriesContacts: TiaLadderContact[] = [];

          if (contactRowGroups.length <= 1) {
            const row = (contactRowGroups[0] || []).sort((a, b) => a.x - b.x);
            if (row.length > 0) {
              branches.push({
                id: `cad_br_${rungNum}_0`,
                contacts: [toTiaContact(row[0], 0)]
              });
              for (let k = 1; k < row.length; k++) {
                seriesContacts.push(toTiaContact(row[k], k));
              }
            }
          } else {
            // Si hay múltiples filas en paralelo (OR), detectar dónde converge la rama paralela
            const parallelRows = contactRowGroups.slice(1);
            const maxParallelX = Math.max(...parallelRows.flat().map(c => c.x));
            const topRow = contactRowGroups[0].sort((a, b) => a.x - b.x);
            const topBranchComps = topRow.filter(c => c.x <= maxParallelX + 1);
            const topSeriesComps = topRow.filter(c => c.x > maxParallelX + 1);

            let cSeq = 0;
            if (topBranchComps.length > 0) {
              branches.push({
                id: `cad_br_${rungNum}_0`,
                contacts: topBranchComps.map(c => toTiaContact(c, cSeq++))
              });
            }
            for (let bIdx = 0; bIdx < parallelRows.length; bIdx++) {
              const pRow = parallelRows[bIdx].sort((a, b) => a.x - b.x);
              branches.push({
                id: `cad_br_${rungNum}_${bIdx + 1}`,
                contacts: pRow.map(c => toTiaContact(c, cSeq++))
              });
            }
            for (const sc of topSeriesComps) {
              seriesContacts.push(toTiaContact(sc, cSeq++));
            }
          }

          const coils: TiaLadderCoil[] = rowCoils.map((cl, idx) => ({
            id: `cad_coil_${rungNum}_${idx}`,
            type:
              cl.type === 'plc_ladder_coil_set'
                ? 'SET'
                : cl.type === 'plc_ladder_coil_reset'
                  ? 'RESET'
                  : 'OUT',
            address: ensureTag(cl.tag, cl.plcAddress, looksLikeOutput(cl.tag) ? 'Q' : 'M', 'Bobina Ladder importada')
          }));

          const tmComp = rowTimers[rIdx];
          const timer: TiaLadderTimer | undefined = tmComp
            ? {
                id: `cad_tm_${rungNum}`,
                name: toValidSymbol(tmComp.tag || `TON_${rungNum}`, 'TON'),
                type: tmComp.type === 'coil_timer_tof' ? 'TOF' : 'TON',
                presetSeconds: tmComp.timerValue && tmComp.timerValue > 0 ? tmComp.timerValue : 3.0
              }
            : undefined;

          const coilNames = rowCoils.map(c => c.tag).join(', ');
          rungs.push({
            id: `cad_net_${rungNum}`,
            number: rungNum,
            comment: `Red ${rungNum}: ${coilNames || coils.map(c => c.address).join(', ')}`,
            branches,
            seriesContacts,
            ...(timer ? { timer } : {}),
            coils
          });
          rungNum++;
        }
      }
    }

    // ------------------------------------------------------------------------
    // 2. Reconstrucción de Etapas y Transiciones GRAFCET
    // ------------------------------------------------------------------------
    const grafcetSteps: TiaGrafcetStep[] = [];
    const grafcetTransitions: TiaGrafcetTransition[] = [];

    const stepComps = grafcetComps
      .filter(c => c.type === 'grafcet_step_init' || c.type === 'grafcet_step')
      .sort((a, b) => a.x - b.x || a.y - b.y);
    const actionComps = grafcetComps.filter(c => c.type === 'grafcet_action');
    const transComps = grafcetComps
      .filter(c => c.type === 'grafcet_transition')
      .sort((a, b) => a.x - b.x || a.y - b.y);

    if (stepComps.length > 0) {
      const compToStepId = new Map<string, number>();
      const usedStepIds = new Set<number>();
      let fallbackStepId = 0;

      for (const sc of stepComps) {
        const numMatch = sc.tag.match(/\d+/);
        let stepId = numMatch ? parseInt(numMatch[0], 10) : fallbackStepId;
        while (usedStepIds.has(stepId)) {
          stepId = ++fallbackStepId;
        }
        usedStepIds.add(stepId);
        compToStepId.set(sc.id, stepId);
      }

      // Asociar cada acción a su etapa más cercana a la izquierda (misma banda horizontal)
      const actionsByStepCompId = new Map<string, PlacedComponent[]>();
      for (const act of actionComps) {
        let bestStep: PlacedComponent | null = null;
        let bestDist = Infinity;
        for (const sc of stepComps) {
          const dx = act.x - sc.x;
          const dy = Math.abs(act.y - sc.y);
          if (dx >= 1 && dx <= 16 && dy <= 4) {
            const dist = dx + dy * 3;
            if (dist < bestDist) {
              bestDist = dist;
              bestStep = sc;
            }
          }
        }
        if (bestStep) {
          const list = actionsByStepCompId.get(bestStep.id) || [];
          list.push(act);
          actionsByStepCompId.set(bestStep.id, list);
        }
      }

      const stepActionsMap = new Map<number, string[]>();

      for (const sc of stepComps) {
        const stepId = compToStepId.get(sc.id)!;
        const linkedActions = (actionsByStepCompId.get(sc.id) || []).sort((a, b) => a.x - b.x);
        const actionAddrs = linkedActions.map(act =>
          ensureTag(
            act.tag,
            act.plcAddress,
            looksLikeOutput(act.tag) ? 'Q' : 'M',
            `Acción etapa ${stepId}`
          )
        );
        stepActionsMap.set(stepId, actionAddrs);
        const actionTag = actionAddrs[0] || '';
        const actionLabel =
          linkedActions.length > 0
            ? linkedActions.map(a => (a.value ? `${a.tag} (${a.value})` : a.tag)).join(', ')
            : sc.type === 'grafcet_step_init'
              ? 'Reposo / Inicial'
              : `Etapa ${stepId}`;

        grafcetSteps.push({
          id: stepId,
          name: `E${stepId}`,
          isInitial: sc.type === 'grafcet_step_init',
          actionTag,
          actionLabel
        });
      }

      // Garantizar al menos una etapa inicial
      if (grafcetSteps.length > 0 && !grafcetSteps.some(s => s.isInitial)) {
        grafcetSteps[0].isInitial = true;
      }

      // Pre-registrar marcas de etapa (%M) ANTES de normalizar receptividades (evita que E26/E31 caigan en %I)
      const stepMemMap = new Map<number, string>();
      for (const step of grafcetSteps) {
        stepMemMap.set(
          step.id,
          ensureTag(`E${step.id}`, undefined, 'M', `Marca Etapa GRAFCET ${step.id}`)
        );
      }

      // Agrupar etapas por columnas para enlazar transiciones arriba -> abajo (y retorno de cierre)
      const normalizeReceptivity = (rawCond: string): string => {
        const cleaned = this.cleanText(rawCond);
        if (!cleaned || cleaned === '1') return 'TRUE';
        // Convertir operadores CADe_SIMU: · / & / * -> AND, + -> OR, [FP]/[FN] flancos -> espacio, separar paréntesis
        const normalized = cleaned
          .replace(/\[F[PN]\]/gi, ' ')
          .replace(/\(/g, ' ( ')
          .replace(/\)/g, ' ) ')
          .replace(/[·÷&*]+/g, ' AND ')
          .replace(/\s*\+\s*/g, ' OR ');

        const tokens = normalized.split(/\s+/).filter(Boolean);
        const outTokens: string[] = [];

        for (const tok of tokens) {
          const upper = tok.toUpperCase();
          if (upper === 'AND' || upper === 'OR' || upper === 'XOR' || upper === 'NOT') {
            outTokens.push(upper);
            continue;
          }
          if (tok === '(') {
            const prev = outTokens[outTokens.length - 1];
            if (prev && prev !== 'AND' && prev !== 'OR' && prev !== 'XOR' && prev !== 'NOT' && prev !== '(') {
              outTokens.push('AND');
            }
            outTokens.push('(');
            continue;
          }
          if (tok === ')') {
            outTokens.push(')');
            continue;
          }
          let negated = false;
          let varName = tok;
          if (/^[_!/~]/.test(varName)) {
            negated = true;
            varName = varName.slice(1);
          }
          if (!varName) continue;

          // Si el token sigue a otro operando o ')' sin operador, insertar AND implícito
          const prev = outTokens[outTokens.length - 1];
          if (prev && prev !== 'AND' && prev !== 'OR' && prev !== 'XOR' && prev !== 'NOT' && prev !== '(') {
            outTokens.push('AND');
          }
          const addr = ensureTag(varName, undefined, 'I', `Receptividad GRAFCET (${varName})`);
          if (negated) outTokens.push('NOT');
          outTokens.push(addr);
        }

        return outTokens.length > 0 ? outTokens.join(' ') : 'TRUE';
      };

      let trId = 1;
      for (const tc of transComps) {
        // Buscar etapa inmediatamente superior en la misma columna (|dx| <= 4)
        let fromComp: PlacedComponent | null = null;
        let minUpDist = Infinity;
        let toComp: PlacedComponent | null = null;
        let minDownDist = Infinity;

        for (const sc of stepComps) {
          const dx = Math.abs(sc.x - tc.x);
          if (dx > 5) continue;
          const dy = tc.y - sc.y;
          if (dy > 0 && dy < minUpDist) {
            minUpDist = dy;
            fromComp = sc;
          } else if (dy < 0 && -dy < minDownDist) {
            minDownDist = -dy;
            toComp = sc;
          }
        }

        // Si no hay etapa directamente arriba en la misma columna, buscar la más cercana por arriba en general
        if (!fromComp) {
          let bestScore = Infinity;
          for (const sc of stepComps) {
            if (sc.y < tc.y) {
              const score = Math.abs(sc.x - tc.x) * 2 + (tc.y - sc.y);
              if (score < bestScore) {
                bestScore = score;
                fromComp = sc;
              }
            }
          }
        }

        // Si no hay etapa debajo (cierre de lazo), volver a la etapa inicial o superior de la columna
        if (!toComp && fromComp) {
          const sameColSteps = stepComps
            .filter(sc => Math.abs(sc.x - tc.x) <= 10)
            .sort((a, b) => a.y - b.y);
          toComp =
            sameColSteps.find(sc => sc.type === 'grafcet_step_init') ||
            sameColSteps[0] ||
            stepComps.find(sc => sc.type === 'grafcet_step_init') ||
            stepComps[0];
        }

        if (fromComp && toComp) {
          const fromStep = compToStepId.get(fromComp.id)!;
          const toStep = compToStepId.get(toComp.id)!;
          if (fromStep !== toStep) {
            grafcetTransitions.push({
              id: trId++,
              fromStep,
              toStep,
              condition: normalizeReceptivity(tc.tag),
              label: tc.tag || `T${trId - 1}`
            });
          }
        }
      }

      // Si no había Ladder completo (ej. solo GRAFCET o GRAFCET + 1-2 redes auxiliares como FG),
      // sintetizar redes Ladder completas desde el GRAFCET conservando las redes existentes:
      // 1) Inicialización de etapa inicial, 2) Transiciones (E_from AND receptividad -> SET E_to, RESET E_from),
      // 3) Activación de salidas por etapa (agrupadas por salida para evitar doble bobina).
      if (rungs.length < Math.max(3, Math.floor(grafcetSteps.length / 2))) {
        const parseClauseContacts = (clause: string, prefixId: string): TiaLadderContact[] => {
          const out: TiaLadderContact[] = [];
          const toks = clause.replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
          let neg = false;
          let seq = 0;
          for (const tk of toks) {
            const up = tk.toUpperCase();
            if (up === 'NOT') {
              neg = true;
              continue;
            }
            if (up === 'AND' || up === 'OR' || up === 'XOR' || up === 'TRUE') {
              neg = false;
              continue;
            }
            const addr = normalizeExplicitAddr(tk) || ensureTag(tk, undefined, 'I');
            out.push({
              id: `${prefixId}_c${seq++}`,
              type: neg ? 'NC' : 'NO',
              address: addr
            });
            neg = false;
          }
          return out;
        };

        const stripOuterParens = (expr: string): string => {
          let s = expr.trim();
          while (s.startsWith('(') && s.endsWith(')')) {
            let depth = 0;
            let closesAtEnd = true;
            for (let i = 0; i < s.length; i++) {
              if (s[i] === '(') depth++;
              else if (s[i] === ')') {
                depth--;
                if (depth === 0 && i < s.length - 1) {
                  closesAtEnd = false;
                  break;
                }
              }
            }
            if (!closesAtEnd) break;
            s = s.slice(1, -1).trim();
          }
          return s;
        };

        const splitTopLevel = (expr: string, op: 'OR' | 'AND'): string[] => {
          const out: string[] = [];
          let depth = 0;
          let buf = '';
          const words = expr.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(/\s+/).filter(Boolean);
          for (const w of words) {
            if (w === '(') depth++;
            else if (w === ')') depth = Math.max(0, depth - 1);
            if (depth === 0 && w.toUpperCase() === op) {
              if (buf.trim()) out.push(buf.trim());
              buf = '';
            } else {
              buf += (buf ? ' ' : '') + w;
            }
          }
          if (buf.trim()) out.push(buf.trim());
          return out;
        };

        let synthNum = rungs.length + 1;
        const initSteps = grafcetSteps.filter(s => s.isInitial);
        const nonInitSteps = grafcetSteps.filter(s => !s.isInitial);
        const initIdSet = new Set(initSteps.map(s => s.id));
        if (initSteps.length > 0 && nonInitSteps.length > 0) {
          for (const initStep of initSteps) {
            const initAddr = stepMemMap.get(initStep.id)!;
            // Encontrar etapas no-iniciales alcanzables desde esta etapa inicial (útil en GEMMA multi-GRAFCET)
            let peerSteps: TiaGrafcetStep[] = [];
            if (initSteps.length > 1) {
              const visited = new Set<number>([initStep.id]);
              const queue = [initStep.id];
              while (queue.length > 0) {
                const cur = queue.shift()!;
                for (const tr of grafcetTransitions) {
                  if (tr.fromStep === cur && !visited.has(tr.toStep) && !initIdSet.has(tr.toStep)) {
                    visited.add(tr.toStep);
                    queue.push(tr.toStep);
                  }
                }
              }
              peerSteps = nonInitSteps.filter(s => visited.has(s.id));
            }
            const guardSteps = (peerSteps.length > 0 ? peerSteps : nonInitSteps).slice(0, 8);
            const otherGuards = guardSteps.map((s, idx) => ({
              id: `cad_g_init_${synthNum}_c${idx}`,
              type: 'NC' as const,
              address: stepMemMap.get(s.id)!
            }));
            if (otherGuards.length > 0) {
              rungs.push({
                id: `cad_grafcet_net_${synthNum}`,
                number: synthNum,
                comment: `Inicialización etapa inicial ${initStep.name}`,
                branches: [
                  {
                    id: `cad_g_br_${synthNum}_0`,
                    contacts: [otherGuards[0]]
                  }
                ],
                seriesContacts: otherGuards.slice(1),
                coils: [
                  {
                    id: `cad_g_coil_${synthNum}_set`,
                    type: 'SET',
                    address: initAddr
                  }
                ]
              });
              synthNum++;
            }
          }
        }

        for (const tr of grafcetTransitions) {
          const fromAddr = stepMemMap.get(tr.fromStep);
          const toAddr = stepMemMap.get(tr.toStep);
          if (!fromAddr || !toAddr) continue;

          const cond = stripOuterParens((tr.condition || 'TRUE').trim());
          const branches: TiaLadderBranch[] = [];
          const seriesContacts: TiaLadderContact[] = [];

          if (!cond || cond === 'TRUE') {
            branches.push({
              id: `cad_g_br_${synthNum}_0`,
              contacts: [{ id: `cad_g_tr_${synthNum}_from`, type: 'NO', address: fromAddr }]
            });
          } else {
            const topOrParts = splitTopLevel(cond, 'OR').map(stripOuterParens);
            if (topOrParts.length > 1) {
              topOrParts.forEach((part, bIdx) => {
                const cts = parseClauseContacts(part, `cad_g_tr_${synthNum}_${bIdx}`);
                if (cts.length > 0) {
                  branches.push({ id: `cad_g_br_${synthNum}_${bIdx}`, contacts: cts });
                }
              });
              seriesContacts.push({
                id: `cad_g_tr_${synthNum}_from`,
                type: 'NO',
                address: fromAddr
              });
            } else {
              // Descomponer factores AND: si uno contiene OR parentizado (ej. b1 AND (NOT ET OR Bp)),
              // extraer sus ramas OR a branches[] y mantener los demás factores en seriesContacts[]
              const andFactors = splitTopLevel(cond, 'AND').map(stripOuterParens);
              const orGroups = andFactors.filter(f => splitTopLevel(f, 'OR').length > 1);
              const plainFactors = andFactors.filter(f => splitTopLevel(f, 'OR').length <= 1);

              if (orGroups.length === 1) {
                const orBranches = splitTopLevel(orGroups[0], 'OR').map(stripOuterParens);
                orBranches.forEach((part, bIdx) => {
                  const cts = parseClauseContacts(part, `cad_g_tr_${synthNum}_${bIdx}`);
                  if (cts.length > 0) {
                    branches.push({ id: `cad_g_br_${synthNum}_${bIdx}`, contacts: cts });
                  }
                });
                seriesContacts.push({
                  id: `cad_g_tr_${synthNum}_from`,
                  type: 'NO',
                  address: fromAddr
                });
                let pSeq = 0;
                for (const pf of plainFactors) {
                  seriesContacts.push(...parseClauseContacts(pf, `cad_g_tr_${synthNum}_p${pSeq++}`));
                }
              } else {
                branches.push({
                  id: `cad_g_br_${synthNum}_0`,
                  contacts: [{ id: `cad_g_tr_${synthNum}_from`, type: 'NO', address: fromAddr }]
                });
                let pSeq = 0;
                for (const af of andFactors) {
                  seriesContacts.push(...parseClauseContacts(af, `cad_g_tr_${synthNum}_p${pSeq++}`));
                }
              }
            }
          }

          rungs.push({
            id: `cad_grafcet_net_${synthNum}`,
            number: synthNum,
            comment: `Transición T${tr.id}: E${tr.fromStep} -> E${tr.toStep} (${tr.label})`,
            branches,
            seriesContacts,
            coils: [
              { id: `cad_g_coil_${synthNum}_set`, type: 'SET', address: toAddr },
              { id: `cad_g_coil_${synthNum}_rst`, type: 'RESET', address: fromAddr }
            ]
          });
          synthNum++;
        }

        // Agrupar salidas por acción para generar una red limpia por actuador
        const stepsByAction = new Map<string, number[]>();
        for (const step of grafcetSteps) {
          const actions = stepActionsMap.get(step.id) || (step.actionTag ? [step.actionTag] : []);
          for (const actAddr of actions) {
            if (!actAddr) continue;
            const list = stepsByAction.get(actAddr) || [];
            if (!list.includes(step.id)) list.push(step.id);
            stepsByAction.set(actAddr, list);
          }
        }

        for (const [actAddr, stepIds] of stepsByAction.entries()) {
          const branches: TiaLadderBranch[] = stepIds.map((sid, bIdx) => ({
            id: `cad_g_act_br_${synthNum}_${bIdx}`,
            contacts: [
              {
                id: `cad_g_act_ct_${synthNum}_${bIdx}`,
                type: 'NO',
                address: stepMemMap.get(sid)!
              }
            ]
          }));
          rungs.push({
            id: `cad_grafcet_net_${synthNum}`,
            number: synthNum,
            comment: `Salida ${getTagLabel(actAddr)} (Etapas ${stepIds.map(s => `E${s}`).join(', ')})`,
            branches,
            seriesContacts: [],
            coils: [
              {
                id: `cad_g_act_coil_${synthNum}`,
                type: 'OUT',
                address: actAddr
              }
            ]
          });
          synthNum++;
        }
      }
    }

    // Si había Ladder pero no GRAFCET, sintetizar GRAFCET directamente desde las redes Ladder
    if (rungs.length > 0 && grafcetSteps.length === 0) {
      grafcetSteps.push({
        id: 0,
        name: 'E0',
        isInitial: true,
        actionTag: '',
        actionLabel: 'Reposo / Espera'
      });

      const formatRungCond = (rung: TiaLadderRung): { cond: string; label: string } => {
        const branchExprs = rung.branches
          .filter(b => b.contacts.length > 0)
          .map(b => {
            const parts = b.contacts.map(c => (c.type === 'NC' ? `NOT ${c.address}` : c.address));
            return parts.length > 1 ? `(${parts.join(' AND ')})` : parts[0];
          });
        const orPart = branchExprs.length > 1 ? `(${branchExprs.join(' OR ')})` : branchExprs[0] || '';
        const seriesPart = rung.seriesContacts
          .map(c => (c.type === 'NC' ? `NOT ${c.address}` : c.address))
          .join(' AND ');
        const cond = [orPart, seriesPart].filter(Boolean).join(' AND ') || 'TRUE';

        const labelParts: string[] = [];
        for (const b of rung.branches.slice(0, 1)) {
          for (const c of b.contacts) {
            labelParts.push(c.type === 'NC' ? `/${getTagLabel(c.address)}` : getTagLabel(c.address));
          }
        }
        for (const c of rung.seriesContacts) {
          labelParts.push(c.type === 'NC' ? `/${getTagLabel(c.address)}` : getTagLabel(c.address));
        }
        return { cond, label: labelParts.join(' · ') || `Red ${rung.number}` };
      };

      const seqRungs = rungs.slice(0, 16);
      let prevStepId = 0;
      let trSeq = 1;
      for (const rung of seqRungs) {
        const mainCoil = rung.coils[0];
        if (!mainCoil) continue;
        const stepId = prevStepId + 1;
        const actName = getTagLabel(mainCoil.address);
        grafcetSteps.push({
          id: stepId,
          name: `E${stepId}`,
          isInitial: false,
          actionTag: mainCoil.address,
          actionLabel: actName
        });
        const { cond, label } = formatRungCond(rung);
        grafcetTransitions.push({
          id: trSeq++,
          fromStep: prevStepId,
          toStep: stepId,
          condition: cond,
          label
        });
        prevStepId = stepId;
      }

      if (prevStepId > 0) {
        const ncStop = rungs.flatMap(r => r.seriesContacts).find(c => c.type === 'NC');
        const firstNo = rungs[0]?.branches[0]?.contacts[0];
        const resetCond = ncStop ? ncStop.address : firstNo ? `NOT ${firstNo.address}` : 'TRUE';
        const resetLabel = ncStop ? getTagLabel(ncStop.address) : firstNo ? `/${getTagLabel(firstNo.address)}` : 'Fin ciclo';
        grafcetTransitions.push({
          id: trSeq,
          fromStep: prevStepId,
          toStep: 0,
          condition: resetCond,
          label: resetLabel
        });
      }
    }

    // Caso B: circuito eléctrico / neumático puro (sin GRAFCET ni Ladder explícitos)
    if (rungs.length === 0 && grafcetSteps.length === 0) {
      const sortedComps = [...doc.components].sort((a, b) => a.y - b.y || a.x - b.x);
      const startInputs: string[] = [];
      const stopInputs: string[] = [];
      const faultInputs: string[] = [];
      const limitInputs: string[] = [];

      const mainCoils: { addr: string; tag: string }[] = [];
      const greenPilots: string[] = [];
      const alarmPilots: string[] = [];
      const timerCoils: { addr: string; name: string; type: 'TON' | 'TOF' }[] = [];
      const valvePairs: { y1: string; y2: string; tag: string }[] = [];

      for (const c of sortedComps) {
        if (c.type === 'button_no') {
          startInputs.push(ensureTag(c.tag, c.plcAddress, 'I', 'Pulsador NA'));
        } else if (c.type === 'button_nc' || c.type === 'emergency_stop') {
          stopInputs.push(ensureTag(c.tag, c.plcAddress, 'I', 'Pulsador NC / Paro'));
        } else if (c.type === 'thermal_contact_nc' || c.type === 'thermal_contact_no') {
          faultInputs.push(ensureTag(c.tag, c.plcAddress, 'I', 'Protección térmica'));
        } else if (c.type === 'limit_switch_no' || c.type === 'limit_switch_nc') {
          limitInputs.push(ensureTag(c.tag, c.plcAddress, 'I', 'Final de carrera / Sensor'));
        } else if (c.type === 'coil_contactor') {
          const addr = ensureTag(c.tag, c.plcAddress, 'Q', 'Bobina contactor');
          mainCoils.push({ addr, tag: c.tag });
        } else if (c.type === 'pilot_light_green' || c.type === 'pilot_light_yellow') {
          greenPilots.push(ensureTag(c.tag, c.plcAddress, 'Q', 'Piloto señalización'));
        } else if (c.type === 'pilot_light_red' || c.type === 'horn_siren') {
          alarmPilots.push(ensureTag(c.tag, c.plcAddress, 'Q', 'Piloto falla / alarma'));
        } else if (c.type === 'coil_timer_ton' || c.type === 'coil_timer_tof') {
          const addr = ensureTag(`${c.tag}_Q`, c.plcAddress, 'M', 'Salida temporizador');
          timerCoils.push({
            addr,
            name: toValidSymbol(c.tag || 'TON_1', 'TON'),
            type: c.type === 'coil_timer_tof' ? 'TOF' : 'TON'
          });
        } else if (c.type === 'solenoid_valve_5_2') {
          const y1 = ensureTag(`${c.tag}_Y1`, undefined, 'Q', `Solenoide Y1 (${c.tag})`);
          const y2 = ensureTag(`${c.tag}_Y2`, undefined, 'Q', `Solenoide Y2 (${c.tag})`);
          valvePairs.push({ y1, y2, tag: c.tag });
        }
      }

      // Respaldos si el plano solo contiene fuerza/actuadores (ej. disyuntor + motor)
      if (startInputs.length === 0 && limitInputs.length === 0) {
        startInputs.push(ensureTag('Boton_Marcha', undefined, 'I', 'Orden de marcha'));
      }
      if (stopInputs.length === 0) {
        stopInputs.push(ensureTag('Boton_Paro', undefined, 'I', 'Orden de paro'));
      }
      if (mainCoils.length === 0 && valvePairs.length === 0) {
        const powerKM = sortedComps.find(c => c.type === 'contactor_power_3p');
        const motor = sortedComps.find(c => c.type.startsWith('motor_'));
        const fallbackName = powerKM?.tag || motor?.tag || 'KM1';
        mainCoils.push({
          addr: ensureTag(fallbackName, powerKM?.plcAddress, 'Q', 'Contactor principal'),
          tag: fallbackName
        });
      }

      const startAddr = startInputs[0] || limitInputs[0];
      const stopAddrs = [...stopInputs, ...faultInputs].slice(0, 3);
      let netNum = 1;

      if (mainCoils.length > 0) {
        const primary = mainCoils[0];
        const coilList: TiaLadderCoil[] = [
          { id: `el_coil_${netNum}_0`, type: 'OUT', address: primary.addr },
          ...greenPilots.slice(0, 2).map((pAddr, pIdx) => ({
            id: `el_coil_${netNum}_p${pIdx}`,
            type: 'OUT' as const,
            address: pAddr
          }))
        ];
        rungs.push({
          id: `el_net_${netNum}`,
          number: netNum,
          comment: `Marcha y Enclavamiento ${primary.tag}`,
          branches: [
            {
              id: `el_br_${netNum}_0`,
              contacts: [{ id: `el_c_${netNum}_start`, type: 'NO', address: startAddr }]
            },
            {
              id: `el_br_${netNum}_1`,
              contacts: [{ id: `el_c_${netNum}_latch`, type: 'NO', address: primary.addr }]
            }
          ],
          seriesContacts: stopAddrs.map((sAddr, sIdx) => ({
            id: `el_c_${netNum}_stop_${sIdx}`,
            type: 'NC',
            address: sAddr
          })),
          coils: coilList
        });
        netNum++;

        // Contactores secundarios (ej. estrella-triángulo / inversión)
        for (let i = 1; i < mainCoils.length; i++) {
          const sec = mainCoils[i];
          const secStart = startInputs[i] || primary.addr;
          rungs.push({
            id: `el_net_${netNum}`,
            number: netNum,
            comment: `Mando auxiliar ${sec.tag}`,
            branches: [
              {
                id: `el_br_${netNum}_0`,
                contacts: [{ id: `el_c_${netNum}_0`, type: 'NO', address: secStart }]
              }
            ],
            seriesContacts: stopAddrs.slice(0, 1).map((sAddr, sIdx) => ({
              id: `el_c_${netNum}_stop_${sIdx}`,
              type: 'NC',
              address: sAddr
            })),
            coils: [{ id: `el_coil_${netNum}_0`, type: 'OUT', address: sec.addr }]
          });
          netNum++;
        }
      }

      const refRunAddr = mainCoils[0]?.addr || startAddr;

      for (const tm of timerCoils) {
        rungs.push({
          id: `el_net_${netNum}`,
          number: netNum,
          comment: `Temporizador ${tm.name} (${tm.type})`,
          branches: [
            {
              id: `el_br_${netNum}_0`,
              contacts: [{ id: `el_c_${netNum}_0`, type: 'NO', address: refRunAddr }]
            }
          ],
          seriesContacts: [],
          timer: {
            id: `el_tm_${netNum}`,
            name: tm.name,
            type: tm.type,
            presetSeconds: 3.0
          },
          coils: [{ id: `el_coil_${netNum}_0`, type: 'OUT', address: tm.addr }]
        });
        netNum++;
      }

      for (let vIdx = 0; vIdx < valvePairs.length; vIdx++) {
        const vp = valvePairs[vIdx];
        const advanceTrigger = limitInputs[vIdx * 2] || refRunAddr;
        const returnTrigger = limitInputs[vIdx * 2 + 1] || stopAddrs[0];
        rungs.push({
          id: `el_net_${netNum}`,
          number: netNum,
          comment: `Avance Electroválvula ${vp.tag} (Y1)`,
          branches: [
            {
              id: `el_br_${netNum}_0`,
              contacts: [{ id: `el_c_${netNum}_0`, type: 'NO', address: advanceTrigger }]
            }
          ],
          seriesContacts: stopAddrs.slice(0, 1).map((sAddr, sIdx) => ({
            id: `el_c_${netNum}_stop_${sIdx}`,
            type: 'NC',
            address: sAddr
          })),
          coils: [{ id: `el_coil_${netNum}_0`, type: 'OUT', address: vp.y1 }]
        });
        netNum++;

        rungs.push({
          id: `el_net_${netNum}`,
          number: netNum,
          comment: `Retorno Electroválvula ${vp.tag} (Y2)`,
          branches: [
            {
              id: `el_br_${netNum}_0`,
              contacts: [{ id: `el_c_${netNum}_0`, type: 'NO', address: returnTrigger }]
            }
          ],
          seriesContacts: [{ id: `el_c_${netNum}_1`, type: 'NC', address: vp.y1 }],
          coils: [{ id: `el_coil_${netNum}_0`, type: 'OUT', address: vp.y2 }]
        });
        netNum++;
      }

      if (alarmPilots.length > 0) {
        const alarmTrigger = faultInputs[0] || stopAddrs[0];
        rungs.push({
          id: `el_net_${netNum}`,
          number: netNum,
          comment: 'Señalización de Falla / Paro',
          branches: [
            {
              id: `el_br_${netNum}_0`,
              contacts: [{ id: `el_c_${netNum}_0`, type: 'NO', address: alarmTrigger }]
            }
          ],
          seriesContacts: [],
          coils: alarmPilots.map((aAddr, aIdx) => ({
            id: `el_coil_${netNum}_a${aIdx}`,
            type: 'OUT',
            address: aAddr
          }))
        });
        netNum++;
      }

      // Sintetizar GRAFCET secuencial del automatismo eléctrico/neumático
      grafcetSteps.push({
        id: 0,
        name: 'E0',
        isInitial: true,
        actionTag: '',
        actionLabel: 'Reposo / Parado'
      });

      const seqOutputs: { addr: string; label: string; cond: string; condLabel: string }[] = [];
      if (mainCoils[0]) {
        seqOutputs.push({
          addr: mainCoils[0].addr,
          label: `Activar ${mainCoils[0].tag}`,
          cond: stopAddrs[0] ? `${startAddr} AND NOT ${stopAddrs[0]}` : startAddr,
          condLabel: getTagLabel(startAddr)
        });
      }
      for (const vp of valvePairs) {
        seqOutputs.push({
          addr: vp.y1,
          label: `Avance ${vp.tag}+`,
          cond: startAddr,
          condLabel: getTagLabel(startAddr)
        });
        seqOutputs.push({
          addr: vp.y2,
          label: `Retorno ${vp.tag}-`,
          cond: limitInputs[1] || stopAddrs[0],
          condLabel: getTagLabel(limitInputs[1] || stopAddrs[0])
        });
      }
      if (seqOutputs.length === 0) {
        seqOutputs.push({
          addr: refRunAddr,
          label: 'Operación',
          cond: startAddr,
          condLabel: getTagLabel(startAddr)
        });
      }

      let prevId = 0;
      let trNum = 1;
      for (const so of seqOutputs) {
        const sid = prevId + 1;
        grafcetSteps.push({
          id: sid,
          name: `E${sid}`,
          isInitial: false,
          actionTag: so.addr,
          actionLabel: so.label
        });
        grafcetTransitions.push({
          id: trNum++,
          fromStep: prevId,
          toStep: sid,
          condition: so.cond,
          label: so.condLabel
        });
        prevId = sid;
      }
      grafcetTransitions.push({
        id: trNum,
        fromStep: prevId,
        toStep: 0,
        condition: stopAddrs[0] || 'TRUE',
        label: stopAddrs[0] ? getTagLabel(stopAddrs[0]) : 'Fin ciclo'
      });
    }

    const finalTags = Array.from(tagsByAddr.values());
    const finalRungs = rungs.length > 0 ? rungs : DEFAULT_TIA_PROGRAM.rungs;
    const finalSteps = grafcetSteps.length > 0 ? grafcetSteps : DEFAULT_TIA_PROGRAM.grafcetSteps;
    const finalTransitions =
      grafcetSteps.length > 0 ? grafcetTransitions : DEFAULT_TIA_PROGRAM.grafcetTransitions;
    const resolvedTags = finalTags.length > 0 ? finalTags : DEFAULT_TIA_PROGRAM.tags;

    const sclCode = transpileLadderToScl(finalRungs, resolvedTags);

    return {
      cpuModel: DEFAULT_TIA_PROGRAM.cpuModel,
      blockName,
      activeLanguage: grafcetComps.length > ladderComps.length ? 'GRAFCET' : 'LAD',
      tags: resolvedTags,
      rungs: finalRungs,
      sclCode,
      grafcetSteps: finalSteps,
      grafcetTransitions: finalTransitions
    };
  }

  private static cleanText(raw: string): string {
    if (!raw) return '';
    return raw
      .replace(/[\u00F7\uFFFD]/g, '·')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static isWireType(typeId: number): boolean {
    return (
      (typeId >= 4000 && typeId <= 4025 && typeId !== 4001) ||
      typeId === 10105 ||
      typeId === 10106 ||
      typeId === 10112
    );
  }

  private static mapWireType(typeId: number): WireType {
    switch (typeId) {
      case 4002:
        return 'neutral';
      case 4010:
        return 'pe';
      case 4011:
      case 4018:
        return 'dc_pos';
      case 4012:
      case 4019:
        return 'dc_neg';
      case 10105:
      case 10106:
      case 10112:
        return 'control';
      case 4000:
      default:
        return 'phase1';
    }
  }

  private static mapCodeToType(code: number, attrs: string[], label: string): string | null {
    const textContent = this.cleanText(attrs[0] || '') || this.cleanText(label);

    // Anotaciones de texto CADe_SIMU (255 y 5000..5015) sin crear contactos fantasma
    if (code < 1000) {
      if (code === 255 && textContent) return 'cad_text';
      return null;
    }
    if (code >= 4000 && code <= 5999) {
      if (code >= 5000 && code <= 5015 && textContent) return 'cad_text';
      return null;
    }
    if (code >= 10300 && code <= 10499) return null;
    if (code > 10520) return null;

    // 1. Motores y actuadores rotativos (1000..1005)
    if (code === 1000) return 'motor_3phase';
    if (code === 1001) {
      const joined = attrs.join(' ').toUpperCase();
      if (joined.includes('W2') || joined.includes('U2') || joined.includes('V2')) {
        return 'motor_3phase_6p';
      }
      return 'motor_1phase';
    }
    if (code === 1002) return 'motor_3phase_6p';
    if (code >= 1003 && code <= 1005) return 'motor_3phase';

    // 2. Contactores principales (2000..2005)
    if (code >= 2000 && code <= 2005) return 'contactor_power_3p';

    // 3. Alimentaciones de red y DC (3000..3010)
    if (code === 3000) return 'power_l';
    if (code === 3001) return 'power_n';
    if (code === 3002 || code === 3010) return 'power_pe';
    if (code === 3003) return 'power_ln';
    if (code === 3004) return 'power_3phase';
    if (code === 3005 || code === 3006) return 'power_3phase_pe';
    if (code === 3007) return 'power_dc';
    if (code === 3008) return 'power_l'; // Borne monopolar +24V DC en CADe_SIMU escritorio
    if (code === 3009) return 'power_n'; // Borne monopolar 0V DC en CADe_SIMU escritorio

    // 4. Protecciones y disyuntores (6000..6020)
    if (code === 6007) return 'thermal_relay_power';
    if (code === 6000 || code === 6001 || code === 6008 || code === 6010) return 'breaker_1p_n';
    if (code >= 6002 && code <= 6020) return 'breaker_3p';

    // 5. Contactos auxiliares y sensores de proximidad (7000..7520)
    if (code === 7000 || code === 7002) return 'contact_no';
    if (code === 7001 || code === 7003) return 'contact_nc';
    if (code === 7004 || code === 7006) return 'contact_timer_ton_no';
    if (code === 7005 || code === 7007) return 'contact_timer_ton_nc';
    if (code >= 7500 && code <= 7520) return 'limit_switch_no';

    // 6. Pulsadores, selectores, setas, finales de carrera y relés térmicos (8000..8025)
    if (code === 8000 || code === 8003 || code === 8008) return 'button_no';
    if (code === 8001 || code === 8004 || code === 8009) return 'button_nc';
    if (code === 8002 || code === 8006) return 'emergency_stop';
    if (code === 8012 || code === 8023) return 'limit_switch_no';
    if (code === 8013 || code === 8024) return 'limit_switch_nc';
    if (code === 8016) return 'thermal_contact_no';
    if (code === 8017 || code === 8018) return 'thermal_contact_nc';

    // 7. Bobinas, temporizadores y señalización (9000..9020)
    if (code === 9000 || code === 9003) return 'coil_contactor';
    if (code === 9001 || code === 9004) return 'coil_timer_ton';
    if (code === 9002) return 'coil_timer_tof';
    if (code === 9008) {
      const hint = `${attrs[0] || ''} ${label}`.toUpperCase();
      if (/ROJ|RED|PE|ERR|FALLA|ALARM|STOP/.test(hint)) return 'pilot_light_red';
      if (/AMAR|AMBAR|YELL|MAN|WARN/.test(hint)) return 'pilot_light_yellow';
      return 'pilot_light_green';
    }
    if (code === 9009) return 'horn_siren';

    // 8. Ladder IEC en plano CAD (10050..10066)
    if (code === 10050 || code === 10052) return 'plc_ladder_contact_no';
    if (code === 10051 || code === 10053) return 'plc_ladder_contact_nc';
    if (code === 10060) return 'plc_ladder_coil';
    if (code === 10061) return 'plc_ladder_coil_set';
    if (code === 10062) return 'plc_ladder_coil_reset';
    if (code === 10066) return 'coil_timer_ton';

    // 9. GRAFCET (10100..10110) — en CADe_SIMU real: 10102 = Transición, 10103 = Acción
    if (code === 10100) return 'grafcet_step_init';
    if (code === 10101) return 'grafcet_step';
    if (code === 10102) return 'grafcet_transition';
    if (code === 10103) return 'grafcet_action';
    if (code === 10104) return 'grafcet_and_divergence';
    if (code === 10107 || code === 10108) return 'grafcet_jump';
    if (code === 10109) return 'grafcet_or_divergence';

    // 10. PLC S7-1200 / LOGO / Módulos E/S (10200..10210)
    if (code === 10200 || code === 10206) return 'plc_cpu_s71200';
    if (code === 10201) return 'plc_logo';
    if (code === 10202 || code === 10204 || code === 10207 || code === 10209) return 'plc_input_module';
    if (code === 10203 || code === 10205 || code === 10208 || code === 10210) return 'plc_output_module';

    // 11. Electroneumática (10500..10520)
    if (code === 10510 || code === 10511) return 'solenoid_valve_5_2';
    if (code >= 10500 && code <= 10520) return 'pneumatic_cylinder_da';

    // Nunca crear contactos fantasma para códigos desconocidos/decorativos
    return null;
  }

  /**
   * Alinea el ancla de pin de CADe_SIMU escritorio con la esquina superior-izquierda
   * del símbolo en COMPONENT_CATALOG para que cables y pines coincidan con exactitud.
   */
  private static getDesktopAnchorOffset(typeId: number, mappedType: string): { dx: number; dy: number } {
    switch (mappedType) {
      case 'power_l':
      case 'power_n':
      case 'power_pe':
      case 'power_ln':
      case 'power_dc':
        return { dx: -1, dy: -2 };
      case 'power_3phase':
      case 'power_3phase_pe':
        return { dx: 0, dy: -2 };
      case 'breaker_3p':
      case 'contactor_power_3p':
      case 'thermal_relay_power':
      case 'motor_3phase':
      case 'motor_3phase_6p':
        return { dx: 0, dy: 0 };
      case 'plc_ladder_contact_no':
      case 'plc_ladder_contact_nc':
      case 'plc_ladder_coil':
      case 'plc_ladder_coil_set':
      case 'plc_ladder_coil_reset':
        return { dx: 0, dy: -1 };
      case 'grafcet_action':
        return { dx: 0, dy: -2 };
      case 'cad_text':
        return { dx: 0, dy: 0 };
      case 'plc_input_module':
        return { dx: -2, dy: 0 };
      case 'plc_output_module':
        // En CADe_SIMU (10205 / 10208), la salida inferior sale 24 raw (=8 grid) debajo del origen
        return typeId === 10205 || typeId === 10208 ? { dx: -2, dy: 5 } : { dx: -2, dy: 0 };
      case 'pneumatic_cylinder_da':
      case 'solenoid_valve_5_2':
      case 'plc_cpu_s71200':
      case 'plc_logo':
        return { dx: 0, dy: 0 };
      default:
        // Contactos, pulsadores, bobinas, pilotos y etapas/transiciones GRAFCET tienen pin superior en (1, 0)
        return { dx: -1, dy: 0 };
    }
  }

  /**
   * Extrae rotación válida (0 | 90 | 180 | 270).
   * Nota: en archivos nativos CADe_SIMU, coords[19] es 1 para TODOS los componentes sin rotar
   * (flag de visibilidad de etiqueta); solo se acepta coords[19] si contiene grados explícitos (90/180/270).
   */
  private static parseRotation(coords: number[], rotIdx: number, isWebExport: boolean): 0 | 90 | 180 | 270 {
    const c19 = coords.length > 19 ? coords[19] : 0;
    if (c19 === 90 || c19 === 180 || c19 === 270) {
      return c19;
    }

    if (isWebExport && coords.length > rotIdx) {
      const r = coords[rotIdx];
      if (r === 1 || r === 90) return 90;
      if (r === 2 || r === 180) return 180;
      if (r === 3 || r === 270) return 270;
    }

    return 0;
  }

  private static extractTagAndAddress(
    typeId: number,
    mappedType: string,
    attrs: string[],
    label: string,
    idx: number
  ): { tag: string; plcAddress?: string; value?: string; timerValue?: number } {
    const a0 = this.cleanText(attrs[0] || '');
    const a1 = this.cleanText(attrs[1] || '');
    const cleanLabel = this.cleanText(label);

    const iecRegex = /^%?([IQM]\d+\.\d+)$/i;
    const toIec = (s: string): string | undefined => {
      const m = s.match(iecRegex);
      return m ? `%${m[1].toUpperCase()}` : undefined;
    };

    // Anotaciones de texto CAD (5000..5015 / 255)
    if (mappedType === 'cad_text') {
      const tag = a0 || cleanLabel || 'NOTA';
      return { tag, value: cleanLabel && cleanLabel !== tag ? cleanLabel : undefined };
    }

    // Transiciones GRAFCET (10102): CADe_SIMU almacena la receptividad en label
    if (typeId === 10102 || mappedType === 'grafcet_transition') {
      const tag = cleanLabel || a0 || `T${idx}`;
      return { tag };
    }

    // Acciones GRAFCET (10103): acción en attrs[0], condición/calificador opcional en label
    if (typeId === 10103 || mappedType === 'grafcet_action') {
      const tag = a0 || cleanLabel || `ACT${idx}`;
      return { tag, value: cleanLabel && cleanLabel !== tag ? cleanLabel : undefined };
    }

    // Temporizador Ladder IEC (10066): nombre en attrs[0], preset en attrs[5] (o attrs[4])
    if (typeId === 10066) {
      const plcAddress = toIec(a1);
      const tag = a0 || plcAddress || cleanLabel || `TON_${idx}`;
      const p5 = parseFloat(this.cleanText(attrs[5] || ''));
      const p4 = parseFloat(this.cleanText(attrs[4] || ''));
      const timerValue = !isNaN(p5) && p5 > 0 ? p5 : !isNaN(p4) && p4 > 0 ? p4 : 3;
      return {
        tag,
        plcAddress,
        value: `${timerValue}s`,
        timerValue
      };
    }

    // Contactos y bobinas Ladder (10050..10062): revisar tanto attrs[0] como attrs[1]
    if (mappedType.startsWith('plc_ladder_')) {
      const addr1 = toIec(a1);
      const addr0 = toIec(a0);
      const plcAddress = addr1 || addr0;
      const tag = a0 || plcAddress || a1 || cleanLabel || `L${idx}`;
      return { tag, plcAddress };
    }

    // Bornes / módulos PLC (10204 / 10205)
    if (mappedType.startsWith('plc_')) {
      const plcAddress = toIec(a1) || toIec(a0);
      const tag = a0 || plcAddress || cleanLabel || `PLC${idx}`;
      return { tag, plcAddress };
    }

    // Etapas y saltos GRAFCET
    if (mappedType.startsWith('grafcet_')) {
      return { tag: a0 || cleanLabel || `${idx}` };
    }

    // Alimentaciones (+24V, 0V, L, N, PE): mantener etiqueta limpia sin guión artificial
    if (mappedType.startsWith('power_')) {
      const defaultPowerTag =
        typeId === 3008
          ? '+24V'
          : typeId === 3009
            ? '0V'
            : mappedType === 'power_n'
              ? 'N'
              : mappedType === 'power_pe'
                ? 'PE'
                : 'L';
      return { tag: a0 || defaultPowerTag };
    }

    // Resto de componentes eléctricos (contactores, pulsadores, motores, pilotos, neumáticos)
    const rawTag = a0 || cleanLabel || `E${idx}`;
    const plcAddress = toIec(a1) || toIec(a0);
    const keepUnprefixed =
      rawTag.startsWith('-') ||
      rawTag.startsWith('+') ||
      rawTag.startsWith('%') ||
      /^[a-z]/.test(rawTag) ||
      /^[A-G][+-]?$/.test(rawTag);

    return {
      tag: keepUnprefixed ? rawTag : `-${rawTag}`,
      plcAddress
    };
  }

  private static getComponentWorldPins(components: PlacedComponent[]): WorldPin[] {
    const pins: WorldPin[] = [];
    for (const comp of components) {
      const def = CATALOG_MAP.get(comp.type);
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
        pins.push({
          componentId: comp.id,
          pinId: pin.id,
          x: comp.x + px,
          y: comp.y + py
        });
      }
    }
    return pins;
  }

  /**
   * Ajusta extremos de cable que queden a <= 1 celda de un pin real de componente
   * para garantizar continuidad eléctrica en CircuitSolver sin provocar cortocircuitos entre polos vecinos.
   */
  private static snapWireEndpointsToPins(doc: CircuitDocument): void {
    const pins = this.getComponentWorldPins(doc.components);
    if (pins.length === 0 || doc.wires.length === 0) return;

    const exactPinCoords = new Set<string>(pins.map(p => `${p.x},${p.y}`));
    const occupiedPins = new Set<string>();

    // Registrar pines que ya tienen un cable exacto en distancia 0
    for (const w of doc.wires) {
      const k1 = `${w.fromX},${w.fromY}`;
      const k2 = `${w.toX},${w.toY}`;
      if (exactPinCoords.has(k1)) occupiedPins.add(k1);
      if (exactPinCoords.has(k2)) occupiedPins.add(k2);
    }

    const findBestSnap = (
      x: number,
      y: number,
      otherX: number,
      otherY: number
    ): { x: number; y: number } | null => {
      if (exactPinCoords.has(`${x},${y}`)) return null;

      const isVertical = x === otherX && y !== otherY;
      const isHorizontal = y === otherY && x !== otherX;

      let bestPin: WorldPin | null = null;
      let bestPriority = Infinity;

      for (const p of pins) {
        const dx = Math.abs(p.x - x);
        const dy = Math.abs(p.y - y);
        const manhattan = dx + dy;
        if (manhattan !== 1) continue;

        const key = `${p.x},${p.y}`;
        const isAlignedWithAxis = (isVertical && dx === 0) || (isHorizontal && dy === 0);

        // Si el ajuste es perpendicular al cable (ej. L1/L3 en columnas trifásicas),
        // solo ajustar a pines que no tengan ya otro cable conectado exactamente.
        if (!isAlignedWithAxis && occupiedPins.has(key)) continue;

        const priority = isAlignedWithAxis ? 0 : 1;
        if (priority < bestPriority) {
          bestPriority = priority;
          bestPin = p;
        }
      }

      return bestPin ? { x: bestPin.x, y: bestPin.y } : null;
    };

    for (const w of doc.wires) {
      const snapFrom = findBestSnap(w.fromX, w.fromY, w.toX, w.toY);
      const snapTo = findBestSnap(w.toX, w.toY, w.fromX, w.fromY);
      if (snapFrom) {
        w.fromX = snapFrom.x;
        w.fromY = snapFrom.y;
      }
      if (snapTo) {
        w.toX = snapTo.x;
        w.toY = snapTo.y;
      }
    }
  }

  /**
   * En CADe_SIMU los símbolos Ladder tienen 4 celdas de ancho (12 raw), mientras que
   * en el catálogo web tienen 2 celdas. Si existe otro contacto/bobina/cable/unión
   * exactamente 2 celdas a la derecha del pin OUT, se tiende el tramo de enlace.
   */
  private static bridgeAdjacentLadderElements(doc: CircuitDocument): void {
    const ladderElems = doc.components.filter(c => c.type.startsWith('plc_ladder_'));
    if (ladderElems.length === 0) return;

    const targetCoords = new Set<string>();
    for (const c of ladderElems) {
      targetCoords.add(`${c.x},${c.y + 1}`);
    }
    for (const w of doc.wires) {
      targetCoords.add(`${w.fromX},${w.fromY}`);
      targetCoords.add(`${w.toX},${w.toY}`);
    }
    for (const j of doc.junctions) {
      targetCoords.add(`${j.x},${j.y}`);
    }

    let bridgeSeq = 1;
    for (const c of ladderElems) {
      const outX = c.x + 2;
      const outY = c.y + 1;
      const expectedNextX = c.x + 4;
      if (targetCoords.has(`${expectedNextX},${outY}`)) {
        doc.wires.push({
          id: `wire_lad_${bridgeSeq++}`,
          fromX: outX,
          fromY: outY,
          toX: expectedNextX,
          toY: outY,
          wireType: 'control'
        });
      }
    }
  }

  /**
   * Conecta automáticamente pequeños huecos (1..3 celdas) entre etapas, transiciones y acciones
   * GRAFCET importadas desde CADe_SIMU de escritorio.
   */
  private static bridgeGrafcetLinks(doc: CircuitDocument): void {
    const steps = doc.components.filter(
      c => c.type === 'grafcet_step' || c.type === 'grafcet_step_init'
    );
    const transitions = doc.components.filter(c => c.type === 'grafcet_transition');
    const actions = doc.components.filter(c => c.type === 'grafcet_action');

    if (steps.length === 0) return;

    let gSeq = 1;
    const pushLink = (fromX: number, fromY: number, toX: number, toY: number) => {
      if (fromX === toX && fromY === toY) return;
      doc.wires.push({
        id: `wire_graf_${gSeq++}`,
        fromX,
        fromY,
        toX,
        toY,
        wireType: 'control'
      });
    };

    // 1. Enlaces verticales Etapa <-> Transición en la misma columna
    for (const s of steps) {
      for (const t of transitions) {
        if (s.x !== t.x) continue;
        const gapStepToTrans = t.y - (s.y + 2);
        if (gapStepToTrans >= 1 && gapStepToTrans <= 3) {
          pushLink(s.x + 1, s.y + 2, t.x + 1, t.y);
        }
        const gapTransToStep = s.y - (t.y + 2);
        if (gapTransToStep >= 1 && gapTransToStep <= 3) {
          pushLink(t.x + 1, t.y + 2, s.x + 1, s.y);
        }
      }
    }

    // 2. Enlace horizontal Etapa -> primera Acción en la misma fila
    for (const s of steps) {
      const rightX = s.x + 2;
      let firstAct: PlacedComponent | null = null;
      let bestDx = Infinity;
      for (const a of actions) {
        if (Math.abs(a.y - s.y) > 1) continue;
        const dx = a.x - rightX;
        if (dx >= 1 && dx <= 5 && dx < bestDx) {
          bestDx = dx;
          firstAct = a;
        }
      }
      if (firstAct) {
        pushLink(rightX, s.y + 1, firstAct.x, firstAct.y + 1);
      }
    }

    // 3. Enlace horizontal entre acciones encadenadas en la misma fila
    for (const a1 of actions) {
      const rightX = a1.x + 3;
      let nextAct: PlacedComponent | null = null;
      let bestDx = Infinity;
      for (const a2 of actions) {
        if (a1.id === a2.id || Math.abs(a2.y - a1.y) > 1) continue;
        const dx = a2.x - rightX;
        if (dx >= 1 && dx <= 4 && dx < bestDx) {
          bestDx = dx;
          nextAct = a2;
        }
      }
      if (nextAct) {
        pushLink(rightX, a1.y + 1, nextAct.x, nextAct.y + 1);
      }
    }
  }

  /**
   * Divide buses horizontales y verticales en puntos interiores (uniones T, extremos de derivación o pines)
   * para que el grafo equipotencial de CircuitSolver propague tensión en todos los ramales.
   */
  private static splitWiresAtInteriorPoints(doc: CircuitDocument): void {
    if (doc.wires.length === 0) return;

    const splitPointsByY = new Map<number, Set<number>>();
    const splitPointsByX = new Map<number, Set<number>>();

    const addPoint = (x: number, y: number) => {
      let xs = splitPointsByY.get(y);
      if (!xs) {
        xs = new Set<number>();
        splitPointsByY.set(y, xs);
      }
      xs.add(x);

      let ys = splitPointsByX.get(x);
      if (!ys) {
        ys = new Set<number>();
        splitPointsByX.set(x, ys);
      }
      ys.add(y);
    };

    for (const j of doc.junctions) addPoint(j.x, j.y);
    for (const w of doc.wires) {
      addPoint(w.fromX, w.fromY);
      addPoint(w.toX, w.toY);
    }
    for (const p of this.getComponentWorldPins(doc.components)) {
      addPoint(p.x, p.y);
    }

    const result: WireSegment[] = [];
    let splitCounter = 1;

    for (const w of doc.wires) {
      if (w.fromY === w.toY && w.fromX !== w.toX) {
        const minX = Math.min(w.fromX, w.toX);
        const maxX = Math.max(w.fromX, w.toX);
        const candidates = splitPointsByY.get(w.fromY);
        const cuts = candidates
          ? Array.from(candidates)
              .filter(px => px > minX && px < maxX)
              .sort((a, b) => a - b)
          : [];

        if (cuts.length === 0) {
          result.push(w);
        } else {
          let prev = minX;
          for (const cut of [...cuts, maxX]) {
            result.push({
              id: `${w.id}_s${splitCounter++}`,
              fromX: prev,
              fromY: w.fromY,
              toX: cut,
              toY: w.fromY,
              wireType: w.wireType
            });
            prev = cut;
          }
        }
      } else if (w.fromX === w.toX && w.fromY !== w.toY) {
        const minY = Math.min(w.fromY, w.toY);
        const maxY = Math.max(w.fromY, w.toY);
        const candidates = splitPointsByX.get(w.fromX);
        const cuts = candidates
          ? Array.from(candidates)
              .filter(py => py > minY && py < maxY)
              .sort((a, b) => a - b)
          : [];

        if (cuts.length === 0) {
          result.push(w);
        } else {
          let prev = minY;
          for (const cut of [...cuts, maxY]) {
            result.push({
              id: `${w.id}_s${splitCounter++}`,
              fromX: w.fromX,
              fromY: prev,
              toX: w.fromX,
              toY: cut,
              wireType: w.wireType
            });
            prev = cut;
          }
        }
      } else {
        result.push(w);
      }
    }

    doc.wires = result;
  }

  private static deduplicateWires(wires: WireSegment[]): WireSegment[] {
    const seen = new Set<string>();
    const clean: WireSegment[] = [];

    for (const w of wires) {
      if (w.fromX === w.toX && w.fromY === w.toY) continue;
      const forward = `${w.fromX},${w.fromY}->${w.toX},${w.toY}`;
      const reverse = `${w.toX},${w.toY}->${w.fromX},${w.fromY}`;
      if (seen.has(forward) || seen.has(reverse)) continue;
      seen.add(forward);
      clean.push(w);
    }

    return clean;
  }

  /**
   * Exporta el documento en formato nativo CADe_SIMU V4.2 (*.cad) con las 3 zonas lado a lado:
   * Zona 1 (Izquierda): Potencia / Neumática / PLC,
   * Zona 2 (Centro): Ladder OB1 (si tiaProgram tiene redes y el plano no incluye Ladder),
   * Zona 3 (Derecha): GRAFCET (si tiaProgram tiene etapas y el plano no incluye GRAFCET).
   */
  public static export(doc: CircuitDocument, tiaProgram?: TiaProgramDocument): string {
    const chunks: string[] = ['CADe_SIMU'];
    let idx = 0;

    // Coordenadas estrictas múltiplos de 3 para garantizar roundtrip exacto
    const toRaw = (gridVal: number) => Math.max(3, Math.round(gridVal) * 3);

    const emitComp = (
      typeCode: number,
      x: number,
      y: number,
      attr0: string,
      attr1 = '',
      rotCode = 0,
      label = ''
    ) => {
      const rx = toRaw(x);
      const ry = toRaw(y);
      const coords = `0*0*0*0*0*0*0*0*${rx}*${ry}*0*0*-12*-3*18*18*0*${rotCode}*0*1*0*0*0`;
      const cleanA0 = (attr0 || '').replace(/[#*]/g, '').slice(0, 32);
      const cleanA1 = (attr1 || '').replace(/[#*]/g, '').slice(0, 16);
      const cleanLbl = (label || '').replace(/[#*]/g, '').slice(0, 40);
      const attrs = [cleanA0, cleanA1, '', '', '', '', '', '', '', ''].join('#');
      chunks.push(`*${idx}*${typeCode}#${attrs}#*${coords}#${cleanLbl}`);
      idx++;
    };

    const emitWire = (wCode: number, fromX: number, fromY: number, toX: number, toY: number) => {
      if (fromX === toX && fromY === toY) return;
      const x1 = toRaw(fromX);
      const y1 = toRaw(fromY);
      const x2 = toRaw(toX);
      const y2 = toRaw(toY);
      const attrs = '#########';
      const coords = `0*0*0*0*0*0*0*0*${x1}*${y1}*${x2}*${y2}*0*0*0*0*0*0*0*0*0*1*0`;
      chunks.push(`*${idx}*${wCode}#${attrs}#*${coords}#`);
      idx++;
    };

    // ------------------------------------------------------------------------
    // ZONA 1 (Izquierda): Esquema de Potencia / Mando / Neumática / PLC
    // ------------------------------------------------------------------------
    let maxX = 0;
    for (const comp of doc.components) {
      const w = CATALOG_MAP.get(comp.type)?.width ?? 2;
      maxX = Math.max(maxX, comp.x + w);

      const typeCode = this.mapTypeToCode(comp.type);
      const rawTag = (comp.tag || `E${idx}`).replace(/[#*]/g, '').slice(0, 32);
      const keepRawTag =
        comp.type.startsWith('plc_') ||
        comp.type.startsWith('grafcet_') ||
        comp.type.startsWith('power_') ||
        comp.type === 'cad_text' ||
        /^-[A-G][+-]?$/.test(rawTag);
      const cleanTag = keepRawTag ? rawTag : rawTag.replace(/^-(?=[A-Z])/, '');
      const plcAddr = (comp.plcAddress || '').replace(/[#*]/g, '').slice(0, 12);

      const rotCode =
        comp.rotation === 90 ? 1 : comp.rotation === 180 ? 2 : comp.rotation === 270 ? 3 : 0;

      if (comp.type === 'grafcet_transition') {
        emitComp(typeCode, comp.x, comp.y, '', '', rotCode, cleanTag);
      } else {
        const label =
          (comp.type === 'grafcet_action' || comp.type === 'cad_text') && comp.value
            ? comp.value.replace(/[#*]/g, '')
            : '';
        emitComp(typeCode, comp.x, comp.y, cleanTag, plcAddr, rotCode, label);
      }
    }

    for (const wire of doc.wires) {
      maxX = Math.max(maxX, wire.fromX, wire.toX);
      const wCode =
        wire.wireType === 'neutral'
          ? 4002
          : wire.wireType === 'pe'
            ? 4010
            : wire.wireType === 'dc_pos'
              ? 4018
              : wire.wireType === 'dc_neg'
                ? 4019
                : wire.wireType === 'control'
                  ? 10106
                  : 4000;
      emitWire(wCode, wire.fromX, wire.fromY, wire.toX, wire.toY);
    }

    for (const junc of doc.junctions) {
      maxX = Math.max(maxX, junc.x);
      const jx = toRaw(junc.x);
      const jy = toRaw(junc.y);
      const attrs = '#########';
      const coords = `0*0*0*0*0*0*0*0*${jx}*${jy}*${jx}*${jy}*0*0*0*0*0*0*0*0*0*1*0`;
      chunks.push(`*${idx}*4001#${attrs}#*${coords}#`);
      idx++;
    }

    // ------------------------------------------------------------------------
    // ZONA 2 (Centro): Ladder Nativo CADe_SIMU (LAD / KOP)
    // ------------------------------------------------------------------------
    let maxLadX = maxX;
    const hasExistingLadder = doc.components.some(c => c.type.startsWith('plc_ladder_'));
    if (tiaProgram && tiaProgram.rungs.length > 0 && !hasExistingLadder) {
      const tagMap = new Map(tiaProgram.tags.map(t => [t.address.toUpperCase(), t]));
      const resolveLabel = (addr: string) => {
        const t = tagMap.get(addr.toUpperCase());
        return t?.schematicTag || t?.name || addr;
      };

      const ladStartX = Math.max(Math.round(maxX) + 10, 48);
      const RUNGS_PER_COL = 16;
      const COL_WIDTH = 22;
      const RUNG_HEIGHT = 4;
      const numCols = Math.ceil(tiaProgram.rungs.length / RUNGS_PER_COL);

      for (let colIdx = 0; colIdx < numCols; colIdx++) {
        const colX = ladStartX + colIdx * COL_WIDTH;
        const colRungs = tiaProgram.rungs.slice(
          colIdx * RUNGS_PER_COL,
          (colIdx + 1) * RUNGS_PER_COL
        );
        const leftRailPinX = colX + 1;
        const rightRailPinX = colX + 19;
        maxLadX = Math.max(maxLadX, colX + COL_WIDTH);

        emitComp(
          5000,
          colX,
          3,
          numCols > 1 ? `LADDER OB1 (${colIdx + 1})` : 'LADDER OB1'
        );
        emitComp(3008, colX, 6, '+24V');
        emitComp(3009, colX + 18, 6, '0V');

        const lastRungY = 8 + (colRungs.length - 1) * RUNG_HEIGHT;
        const lastPinY = lastRungY + 1 + (colRungs[colRungs.length - 1]?.branches.length > 1 ? 2 : 0);
        emitWire(4018, leftRailPinX, 8, leftRailPinX, lastPinY);
        emitWire(4019, rightRailPinX, 8, rightRailPinX, lastPinY);

        colRungs.forEach((rung, rIdx) => {
          const rungY = 8 + rIdx * RUNG_HEIGHT;
          const pinY = rungY + 1;
          const b0Contacts = rung.branches[0]?.contacts || [];
          const hasParallel = rung.branches.length > 1;
          const mainContacts = [...b0Contacts, ...rung.seriesContacts].slice(0, 4);
          const contactStep = mainContacts.length > 3 ? 3 : 4;
          const firstContactX = colX + 3;

          if (mainContacts.length === 0) {
            emitWire(4018, leftRailPinX, pinY, colX + 15, pinY);
          } else {
            emitWire(4018, leftRailPinX, pinY, firstContactX, pinY);
            mainContacts.forEach((ct, cIdx) => {
              const cx = firstContactX + cIdx * contactStep;
              const code = ct.type === 'NC' ? 10051 : 10050;
              emitComp(code, cx, rungY, resolveLabel(ct.address), ct.address);
              const nextX =
                cIdx + 1 < mainContacts.length
                  ? firstContactX + (cIdx + 1) * contactStep
                  : colX + 15;
              emitWire(4018, cx + 2, pinY, nextX, pinY);
            });
          }

          // Rama OR paralela (máximo 1 rama inferior por red para mantener paso limpio de 4 celdas)
          if (hasParallel && rung.branches[1]?.contacts.length) {
            const pY = rungY + 2;
            const pPinY = pY + 1;
            const pContacts = rung.branches[1].contacts.slice(0, 2);
            const pEndX = firstContactX + b0Contacts.length * contactStep;
            emitWire(4018, leftRailPinX, pinY, leftRailPinX, pPinY);
            emitWire(4018, leftRailPinX, pPinY, firstContactX, pPinY);
            pContacts.forEach((pct, pIdx) => {
              const px = firstContactX + pIdx * contactStep;
              const pCode = pct.type === 'NC' ? 10051 : 10050;
              emitComp(pCode, px, pY, resolveLabel(pct.address), pct.address);
              const nextPx =
                pIdx + 1 < pContacts.length
                  ? firstContactX + (pIdx + 1) * contactStep
                  : Math.max(px + 2, pEndX - (b0Contacts.length > 0 ? 0 : 0));
              emitWire(4018, px + 2, pPinY, nextPx, pPinY);
            });
            const mergeX = Math.max(firstContactX + pContacts.length * contactStep, firstContactX + 2);
            emitWire(4018, mergeX, pPinY, mergeX, pinY);
          }

          // Bobina principal de la red (SET / RESET / OUT)
          const mainCoil = rung.coils[0];
          if (mainCoil) {
            const coilCode =
              mainCoil.type === 'SET' ? 10061 : mainCoil.type === 'RESET' ? 10062 : 10060;
            emitComp(coilCode, colX + 15, rungY, resolveLabel(mainCoil.address), mainCoil.address);
          } else {
            emitWire(4018, colX + 15, pinY, colX + 17, pinY);
          }
          emitWire(4018, colX + 17, pinY, rightRailPinX, pinY);
        });
      }
    }

    // ------------------------------------------------------------------------
    // ZONA 3 (Derecha): GRAFCET Nativo CADe_SIMU
    // ------------------------------------------------------------------------
    const hasExistingGrafcet = doc.components.some(c => c.type.startsWith('grafcet_step'));
    if (tiaProgram && tiaProgram.grafcetSteps.length > 0 && !hasExistingGrafcet) {
      const grafStartX = Math.max(Math.round(maxLadX) + 10, 74);
      const STEPS_PER_COL = 12;
      const GRAF_COL_WIDTH = 16;
      const STEP_PITCH_Y = 6;
      const numGrafCols = Math.ceil(tiaProgram.grafcetSteps.length / STEPS_PER_COL);

      for (let colIdx = 0; colIdx < numGrafCols; colIdx++) {
        const colX = grafStartX + colIdx * GRAF_COL_WIDTH;
        const colSteps = tiaProgram.grafcetSteps.slice(
          colIdx * STEPS_PER_COL,
          (colIdx + 1) * STEPS_PER_COL
        );

        emitComp(
          5000,
          colX,
          3,
          numGrafCols > 1 ? `GRAFCET (${colIdx + 1})` : 'GRAFCET'
        );

        colSteps.forEach((step, iInCol) => {
          const stepY = 6 + iInCol * STEP_PITCH_Y;
          const stepCode = step.isInitial ? 10100 : 10101;
          emitComp(stepCode, colX, stepY, String(step.id));

          // Acción asociada a la derecha de la etapa (alineada al mismo Y)
          const hasMeaningfulAction =
            Boolean(step.actionTag) ||
            (Boolean(step.actionLabel) &&
              !/^(Reposo|Esperando Marcha|Etapa \d+)$/i.test(step.actionLabel));
          if (hasMeaningfulAction) {
            const actText = step.actionLabel || step.actionTag;
            emitComp(10103, colX + 3, stepY, actText, step.actionTag || '');
            emitWire(10106, colX + 2, stepY + 1, colX + 3, stepY + 1);
          }

          // Transición saliente debajo de la etapa
          const nextStep = colSteps[iInCol + 1];
          const tr =
            (nextStep &&
              tiaProgram.grafcetTransitions.find(
                t => t.fromStep === step.id && t.toStep === nextStep.id
              )) ||
            tiaProgram.grafcetTransitions.find(t => t.fromStep === step.id);

          if (tr) {
            const transY = stepY + 3;
            emitComp(10102, colX, transY, '', '', 0, tr.label || tr.condition || `T${tr.id}`);
            emitWire(10106, colX + 1, stepY + 2, colX + 1, transY);
            if (nextStep) {
              emitWire(10106, colX + 1, transY + 2, colX + 1, stepY + STEP_PITCH_Y);
            }
          } else if (nextStep) {
            emitWire(10106, colX + 1, stepY + 2, colX + 1, stepY + STEP_PITCH_Y);
          }
        });
      }
    }

    // Cajetín ISO 7200 normalizado (Simón Barrera Ruíz)
    const pad = (val: string, len: number) => (val || '').slice(0, len).padEnd(len, ' ');
    const safeTitle = (doc.titleBlock?.title || 'esquema').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 16);
    const authorField = pad(doc.titleBlock?.author || 'Simón Barrera Ruíz', 25);
    const dateField = pad(doc.titleBlock?.date || '2026-11-12', 11);
    const fileField = pad(`${safeTitle}.cad`, 20);

    const cajetin =
      `$$$*1*1*1*2*5*0*1*0*0*333*3234&&&*` +
      `${pad('Automatas', 11)}*${pad('DISENO', 11)}*${pad('', 11)}*${pad('', 11)}*` +
      `${pad(doc.titleBlock?.project || 'Automatismos Industriales', 25)}*${authorField}*` +
      `${dateField}*${pad('1', 10)}*${pad('1', 10)}*${fileField}*` +
      `1*1*1*1*1*1*1*1*1*1*1*1*1*1***$$$&&&***$$$&&&`;

    return chunks.join('') + cajetin;
  }

  private static mapTypeToCode(type: string): number {
    switch (type) {
      case 'power_l': return 3000;
      case 'power_n': return 3001;
      case 'power_pe': return 3002;
      case 'power_ln': return 3003;
      case 'power_3phase': return 3004;
      case 'power_3phase_pe': return 3005;
      case 'power_dc': return 3007;

      case 'breaker_3p': return 6009;
      case 'breaker_1p_n': return 6008;
      case 'thermal_relay_power': return 6007;
      case 'thermal_contact_nc': return 8017;
      case 'thermal_contact_no': return 8016;

      case 'contactor_power_3p': return 2001;
      case 'contact_no': return 7000;
      case 'contact_nc': return 7001;
      case 'contact_timer_ton_no': return 7004;
      case 'contact_timer_ton_nc': return 7005;

      case 'button_no': return 8000;
      case 'button_nc': return 8001;
      case 'emergency_stop': return 8002;
      case 'limit_switch_no': return 8023;
      case 'limit_switch_nc': return 8024;

      case 'coil_contactor': return 9000;
      case 'coil_timer_ton': return 9001;
      case 'coil_timer_tof': return 9002;

      case 'motor_3phase': return 1000;
      case 'motor_1phase': return 1001;
      case 'motor_3phase_6p': return 1002;

      case 'pilot_light_green':
      case 'pilot_light_red':
      case 'pilot_light_yellow': return 9008;
      case 'horn_siren': return 9009;

      case 'plc_cpu_s71200': return 10200;
      case 'plc_logo': return 10201;
      case 'plc_input_module': return 10204;
      case 'plc_output_module': return 10205;
      case 'plc_ladder_contact_no': return 10050;
      case 'plc_ladder_contact_nc': return 10051;
      case 'plc_ladder_coil': return 10060;
      case 'plc_ladder_coil_set': return 10061;
      case 'plc_ladder_coil_reset': return 10062;

      case 'grafcet_step_init': return 10100;
      case 'grafcet_step': return 10101;
      case 'grafcet_transition': return 10102;
      case 'grafcet_action': return 10103;
      case 'grafcet_and_divergence': return 10104;
      case 'grafcet_jump': return 10107;
      case 'grafcet_or_divergence': return 10109;

      case 'pneumatic_cylinder_da': return 10501;
      case 'solenoid_valve_5_2': return 10510;
      case 'cad_text': return 5000;

      default: return 7000;
    }
  }
}
