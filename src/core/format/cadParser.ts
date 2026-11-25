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
      } else if (this.mapCodeToType(typeId, attrs, label) !== null) {
        if (rawX > 0 && rawY > 0) {
          minRawX = Math.min(minRawX, rawX);
          minRawY = Math.min(minRawY, rawY);
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
      const { tag, plcAddress, value } = this.extractTagAndAddress(typeId, mappedType, attrs, label, idx);

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
   * Extrae automáticamente un programa TIA Portal (LAD / SCL / GRAFCET + Tabla de Tags)
   * si el circuito importado contiene bloques GRAFCET o Ladder.
   */
  public static extractTiaProgram(doc: CircuitDocument): TiaProgramDocument | null {
    const grafcetComps = doc.components.filter(c => c.type.startsWith('grafcet_'));
    const ladderComps = doc.components.filter(c => c.type.startsWith('plc_ladder_'));

    if (grafcetComps.length === 0 && ladderComps.length === 0) {
      return null;
    }

    const tagsByAddr = new Map<string, TiaTag>();
    const symbolToAddr = new Map<string, string>();
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
      const explicit = normalizeExplicitAddr(explicitAddr) || normalizeExplicitAddr(cleanRaw);

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
        if (normKey) symbolToAddr.set(normKey, explicit);
        return explicit;
      }

      if (normKey && symbolToAddr.has(normKey)) {
        return symbolToAddr.get(normKey)!;
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
      if (normKey) symbolToAddr.set(normKey, addr);
      return addr;
    };

    // Pre-registrar bobinas y acciones primero para que los contactos que referencian una salida/marca reutilicen su dirección
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
    // Registrar también pulsadores/sensores del plano si tienen dirección PLC o nombres útiles
    for (const c of doc.components) {
      if (c.type === 'plc_input_module' || c.type === 'plc_output_module') {
        const exp = normalizeExplicitAddr(c.plcAddress || c.tag);
        if (exp) {
          ensureTag(c.tag, exp, exp.startsWith('%Q') ? 'Q' : 'I', 'Borne PLC importado');
        }
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

    if (ladderCoils.length > 0) {
      // Agrupar bobinas por banda horizontal (misma columna de bobinas: |dx| <= 6)
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

      for (let colIdx = 0; colIdx < coilColumns.length; colIdx++) {
        const colCoils = coilColumns[colIdx].sort((a, b) => a.y - b.y || a.x - b.x);
        const colCoilX = Math.max(...colCoils.map(c => c.x));
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

        for (let rIdx = 0; rIdx < coilRows.length; rIdx++) {
          const rowCoils = coilRows[rIdx];
          const rungTopY = Math.min(...rowCoils.map(c => c.y));
          const nextRungTopY =
            rIdx + 1 < coilRows.length ? Math.min(...coilRows[rIdx + 1].map(c => c.y)) : Infinity;

          // Contactos pertenecientes a esta columna y banda vertical [rungTopY - 1, nextRungTopY - 1)
          const rungContacts = ladderContacts.filter(
            ct =>
              !usedContactIds.has(ct.id) &&
              ct.x > prevColX &&
              ct.x < colCoilX &&
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

          const coilNames = rowCoils.map(c => c.tag).join(', ');
          rungs.push({
            id: `cad_net_${rungNum}`,
            number: rungNum,
            comment: `Red ${rungNum}: ${coilNames || coils.map(c => c.address).join(', ')}`,
            branches,
            seriesContacts,
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

      for (const sc of stepComps) {
        const stepId = compToStepId.get(sc.id)!;
        const linkedActions = (actionsByStepCompId.get(sc.id) || []).sort((a, b) => a.x - b.x);
        const primaryAction = linkedActions[0];
        const actionTag = primaryAction
          ? ensureTag(
              primaryAction.tag,
              primaryAction.plcAddress,
              looksLikeOutput(primaryAction.tag) ? 'Q' : 'M',
              `Acción etapa ${stepId}`
            )
          : '';
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

      // Si no había Ladder explícito, sintetizar redes Ladder equivalentes desde el GRAFCET para poblar LAD y SCL
      if (rungs.length === 0) {
        let synthNum = 1;
        for (const step of grafcetSteps) {
          if (!step.actionTag) continue;
          const stepMemAddr = ensureTag(`E${step.id}`, undefined, 'M', `Marca Etapa GRAFCET ${step.id}`);
          rungs.push({
            id: `cad_grafcet_net_${synthNum}`,
            number: synthNum,
            comment: `GRAFCET Etapa ${step.id} -> ${step.actionLabel}`,
            branches: [
              {
                id: `cad_g_br_${synthNum}`,
                contacts: [
                  {
                    id: `cad_g_ct_${synthNum}`,
                    type: 'NO',
                    address: stepMemAddr
                  }
                ]
              }
            ],
            seriesContacts: [],
            coils: [
              {
                id: `cad_g_coil_${synthNum}`,
                type: 'OUT',
                address: step.actionTag
              }
            ]
          });
          synthNum++;
        }
      }
    }

    const finalTags = Array.from(tagsByAddr.values());
    const finalRungs = rungs.length > 0 ? rungs : DEFAULT_TIA_PROGRAM.rungs;
    const finalSteps = grafcetSteps.length > 0 ? grafcetSteps : DEFAULT_TIA_PROGRAM.grafcetSteps;
    const finalTransitions =
      grafcetSteps.length > 0 ? grafcetTransitions : DEFAULT_TIA_PROGRAM.grafcetTransitions;

    const sclCode = transpileLadderToScl(finalRungs, finalTags.length > 0 ? finalTags : DEFAULT_TIA_PROGRAM.tags);

    return {
      cpuModel: DEFAULT_TIA_PROGRAM.cpuModel,
      blockName: doc.titleBlock.title
        ? doc.titleBlock.title.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 24) || 'Main'
        : 'Main',
      activeLanguage: grafcetSteps.length > 0 && ladderComps.length < grafcetComps.length ? 'GRAFCET' : 'LAD',
      tags: finalTags.length > 0 ? finalTags : DEFAULT_TIA_PROGRAM.tags,
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
    // Excluir gráficos, líneas, rectángulos, textos, decoraciones y ancla de cajetín
    if (code < 1000) return null;
    if (code >= 4000 && code <= 5999) return null;
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
      case 'grafcet_action':
        return { dx: 0, dy: -1 };
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
  ): { tag: string; plcAddress?: string; value?: string } {
    const a0 = this.cleanText(attrs[0] || '');
    const a1 = this.cleanText(attrs[1] || '');
    const cleanLabel = this.cleanText(label);

    const iecRegex = /^%?([IQM]\d+\.\d+)$/i;
    const toIec = (s: string): string | undefined => {
      const m = s.match(iecRegex);
      return m ? `%${m[1].toUpperCase()}` : undefined;
    };

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
   * Exporta el documento en formato nativo CADe_SIMU V4.2 (*.cad)
   */
  public static export(doc: CircuitDocument): string {
    const chunks: string[] = ['CADe_SIMU'];
    let idx = 0;

    // Offset base en múltiplos de 3 para garantizar coordenadas limpias y roundtrip exacto
    const toRaw = (gridVal: number) => Math.max(3, Math.round(gridVal * 3));

    for (const comp of doc.components) {
      const typeCode = this.mapTypeToCode(comp.type);
      const rawTag = (comp.tag || `E${idx}`).replace(/[#*]/g, '').slice(0, 24);
      const keepRawTag =
        comp.type.startsWith('plc_') ||
        comp.type.startsWith('grafcet_') ||
        comp.type.startsWith('power_') ||
        /^-[A-G][+-]?$/.test(rawTag);
      const cleanTag = keepRawTag ? rawTag : rawTag.replace(/^-(?=[A-Z])/, '');
      const plcAddr = (comp.plcAddress || '').replace(/[#*]/g, '').slice(0, 12);

      const rotCode =
        comp.rotation === 90 ? 1 : comp.rotation === 180 ? 2 : comp.rotation === 270 ? 3 : 0;

      const rx = toRaw(comp.x);
      const ry = toRaw(comp.y);
      const coords = `0*0*0*0*0*0*0*0*${rx}*${ry}*0*0*-12*-3*18*18*0*${rotCode}*0*1*0*0*0`;

      if (comp.type === 'grafcet_transition') {
        const attrs = ['', '', '', '', '', '', '', '', '', ''].join('#');
        chunks.push(`*${idx}*${typeCode}#${attrs}#*${coords}#${cleanTag}`);
      } else {
        const attrs = [cleanTag, plcAddr, '', '', '', '', '', '', '', ''].join('#');
        const label = comp.type === 'grafcet_action' && comp.value ? comp.value.replace(/[#*]/g, '') : '';
        chunks.push(`*${idx}*${typeCode}#${attrs}#*${coords}#${label}`);
      }
      idx++;
    }

    for (const wire of doc.wires) {
      if (wire.fromX === wire.toX && wire.fromY === wire.toY) continue;
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
      const x1 = toRaw(wire.fromX);
      const y1 = toRaw(wire.fromY);
      const x2 = toRaw(wire.toX);
      const y2 = toRaw(wire.toY);
      const attrs = '#########';
      const coords = `0*0*0*0*0*0*0*0*${x1}*${y1}*${x2}*${y2}*0*0*0*0*0*0*0*0*0*1*0`;
      chunks.push(`*${idx}*${wCode}#${attrs}#*${coords}#`);
      idx++;
    }

    for (const junc of doc.junctions) {
      const jx = toRaw(junc.x);
      const jy = toRaw(junc.y);
      const attrs = '#########';
      const coords = `0*0*0*0*0*0*0*0*${jx}*${jy}*${jx}*${jy}*0*0*0*0*0*0*0*0*0*1*0`;
      chunks.push(`*${idx}*4001#${attrs}#*${coords}#`);
      idx++;
    }

    // Cajetín normalizado (exacto 12 campos de texto + 14 flags habilitados)
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

      default: return 7000;
    }
  }
}
