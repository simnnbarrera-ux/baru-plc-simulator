import { CircuitDocument, WireType } from '../../types/circuit';

export class CadParser {
  /**
   * Analiza gramática de cualquier versión de CADe_SIMU (.cad)
   * V1.0, V2.0, V3.0, V4.0 y V4.2
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
    if (circuitBody.startsWith('CADe_SIMU')) {
      circuitBody = circuitBody.slice('CADe_SIMU'.length);
    }

    let compCounter = 1;
    let wireCounter = 1;
    let junctionCounter = 1;

    let minRawX = Infinity;
    let minRawY = Infinity;

    interface RawElem {
      idx: number;
      typeId: number;
      attrs: string[];
      coords: number[];
      label: string;
    }

    const rawElements: RawElem[] = [];

    // Escáner determinista: *<idx>*<type_id>#<attrs>#*<coords>#<optional_label>
    let pos = 0;
    const headRegex = /^\*(\d+)\*(\d+)#/;
    const nextElemRegex = /\*\d+\*\d+#/;

    while (pos < circuitBody.length) {
      const mHead = headRegex.exec(circuitBody.slice(pos));
      if (!mHead) {
        pos++;
        continue;
      }

      const idx = parseInt(mHead[1], 10);
      const typeId = parseInt(mHead[2], 10);
      let p = pos + mHead[0].length;

      const hashStar = circuitBody.indexOf('#*', p);
      if (hashStar === -1) break;
      const attrStr = circuitBody.slice(p, hashStar);
      const attrs = attrStr.split('#');

      p = hashStar + 2;
      const nextHash = circuitBody.indexOf('#', p);
      if (nextHash === -1) break;
      const coordStr = circuitBody.slice(p, nextHash);
      const coords = coordStr
        .split('*')
        .map(v => parseInt(v.trim(), 10))
        .filter(n => !isNaN(n));

      p = nextHash + 1;
      const mNext = nextElemRegex.exec(circuitBody.slice(p));
      let label = '';
      if (mNext) {
        label = circuitBody.slice(p, p + mNext.index).trim();
        pos = p + mNext.index;
      } else {
        label = circuitBody.slice(p).trim();
        pos = circuitBody.length;
      }

      if (coords.length >= 10) {
        const x = coords[8];
        const y = coords[9];
        if (x > 0 && y > 0) {
          minRawX = Math.min(minRawX, x);
          minRawY = Math.min(minRawY, y);
        }
        if (this.isWireType(typeId) && coords.length >= 12) {
          const x2 = coords[10];
          const y2 = coords[11];
          if (x2 > 0 && y2 > 0) {
            minRawX = Math.min(minRawX, x2);
            minRawY = Math.min(minRawY, y2);
          }
        }
      }

      rawElements.push({ idx, typeId, attrs, coords, label });
    }

    if (minRawX === Infinity) minRawX = 0;
    if (minRawY === Infinity) minRawY = 0;

    // Normalizador de escala: CADe_SIMU usa múltiplos de 3 en píxeles internos -> unidades de rejilla web
    const scaleCoord = (raw: number, minRef: number): number => {
      const offset = Math.max(0, raw - minRef);
      return Math.round(offset / 3) + 4;
    };

    for (const elem of rawElements) {
      const { idx, typeId, attrs, coords, label } = elem;
      const rawTag = attrs[0]?.trim() || label || `E${idx}`;

      // A. Cables y conductores
      if (this.isWireType(typeId) && coords.length >= 12) {
        const fromX = scaleCoord(coords[8], minRawX);
        const fromY = scaleCoord(coords[9], minRawY);
        const toX = scaleCoord(coords[10], minRawX);
        const toY = scaleCoord(coords[11], minRawY);

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
      if (typeId === 4001 && coords.length >= 10) {
        doc.junctions.push({
          id: `jnc_${junctionCounter++}`,
          x: scaleCoord(coords[8], minRawX),
          y: scaleCoord(coords[9], minRawY)
        });
        continue;
      }

      // C. Componentes
      const mappedType = this.mapCodeToType(typeId);
      if (mappedType && coords.length >= 10) {
        const posX = scaleCoord(coords[8], minRawX);
        const posY = scaleCoord(coords[9], minRawY);

        doc.components.push({
          id: `comp_${compCounter++}`,
          type: mappedType,
          tag: rawTag.startsWith('-') || mappedType.startsWith('plc_') || mappedType.startsWith('grafcet_')
            ? rawTag
            : `-${rawTag}`,
          x: posX,
          y: posY,
          rotation: 0,
          state: { isOpen: false, isActuated: false, pistonPos: 0, valvePos: 'B' }
        });
      }
    }

    // Carátula y metadata del bloque $$$
    if (parts.length > 1) {
      const tb = parts[1];
      const filenameMatch = tb.match(/\*([^*#]+\.cad)\*/i);
      if (filenameMatch) {
        doc.titleBlock.title = filenameMatch[1].replace('.cad', '').replace(/_/g, ' ').trim();
      }
    }

    return doc;
  }

  private static isWireType(typeId: number): boolean {
    return (typeId >= 4000 && typeId <= 4025 && typeId !== 4001) || typeId === 10106;
  }

  private static mapWireType(typeId: number): WireType {
    switch (typeId) {
      case 4002: return 'neutral';
      case 4010: return 'pe';
      case 4011:
      case 4018: return 'dc_pos';
      case 4012:
      case 4019: return 'dc_neg';
      case 4000:
      default:
        return 'phase1';
    }
  }

  private static mapCodeToType(code: number): string | null {
    // 1. Motores y actuadores
    if (code === 1001) return 'motor_1phase';
    if (code >= 1000 && code <= 1005) return 'motor_3phase';

    // 2. Contactores principales
    if (code >= 2000 && code <= 2005) return 'contactor_power_3p';

    // 3. Alimentaciones de red
    if (code === 3000) return 'power_l';
    if (code === 3001) return 'power_n';
    if (code === 3002) return 'power_pe';
    if (code === 3004) return 'power_3phase';
    if (code === 3005 || code === 3006) return 'power_3phase_pe';
    if (code === 3007 || code === 3008) return 'power_dc';
    if (code >= 3000 && code <= 3010) return 'power_3phase';

    // 4. Protecciones
    if (code === 6007) return 'thermal_relay_power';
    if (code === 6008) return 'breaker_1p_n';
    if (code >= 6000 && code <= 6015) return 'breaker_3p';

    // 5. Contactos auxiliares
    if (code === 7000) return 'contact_no';
    if (code === 7001) return 'contact_nc';
    if (code === 7004 || code === 7006) return 'contact_timer_ton_no';
    if (code === 7005 || code === 7007) return 'contact_timer_ton_nc';

    // 6. Pulsadores, térmicos y finales de carrera
    if (code === 8000) return 'button_no';
    if (code === 8001) return 'button_nc';
    if (code === 8002) return 'emergency_stop';
    if (code === 8016) return 'thermal_contact_no';
    if (code === 8017) return 'thermal_contact_nc';
    if (code === 8023) return 'limit_switch_no';

    // 7. Bobinas y señalizadores
    if (code === 9000) return 'coil_contactor';
    if (code === 9001) return 'coil_timer_ton';
    if (code === 9002 || code === 9004) return 'coil_timer_tof';
    if (code === 9003) return 'solenoid_valve_5_2';
    if (code === 9008) return 'pilot_light_green';
    if (code === 9009) return 'horn_siren';

    // 8. GRAFCET y Ladder en plano CAD
    if (code === 10050) return 'plc_ladder_contact_no';
    if (code === 10051) return 'plc_ladder_contact_nc';
    if (code === 10060) return 'plc_ladder_coil';
    if (code === 10100) return 'grafcet_step_init';
    if (code === 10101) return 'grafcet_step';
    if (code === 10102) return 'grafcet_action';
    if (code === 10103) return 'grafcet_transition';

    // 9. PLC S7-1200 / LOGO
    if (code === 10200) return 'plc_cpu_s71200';
    if (code === 10201) return 'plc_logo';

    // 10. Electroneumática
    if (code === 10510 || code === 10511) return 'solenoid_valve_5_2';
    if (code >= 10500 && code <= 10520) return 'pneumatic_cylinder_da';

    return 'contact_no';
  }

  /**
   * Exporta el documento en formato nativo CADe_SIMU V4.2 (*.cad)
   */
  public static export(doc: CircuitDocument): string {
    const chunks: string[] = ['CADe_SIMU'];
    let idx = 0;

    // Offset base en múltiplos de 3 para garantizar coordenadas positivas limpias en escritorio
    const toRaw = (gridVal: number) => Math.max(6, Math.round(gridVal * 3));

    for (const comp of doc.components) {
      const typeCode = this.mapTypeToCode(comp.type);
      const cleanTag = (comp.tag || `E${idx}`).replace(/^-(?=[A-Z])/, '').slice(0, 12);
      const attrs = [cleanTag, '', '', '', '', '', '', '', '', ''].join('#');
      const rx = toRaw(comp.x);
      const ry = toRaw(comp.y);
      const coords = `0*0*0*0*0*0*0*0*${rx}*${ry}*0*0*-12*-3*18*18*0*0*0*1*0*0*0`;
      chunks.push(`*${idx}*${typeCode}#${attrs}#*${coords}#`);
      idx++;
    }

    for (const wire of doc.wires) {
      const wCode =
        wire.wireType === 'neutral'
          ? 4002
          : wire.wireType === 'pe'
            ? 4010
            : wire.wireType === 'dc_pos'
              ? 4018
              : wire.wireType === 'dc_neg'
                ? 4019
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
      case 'power_ln': return 3000;
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
      case 'limit_switch_no':
      case 'limit_switch_nc': return 8023;

      case 'coil_contactor': return 9000;
      case 'coil_timer_ton': return 9001;
      case 'coil_timer_tof': return 9002;

      case 'motor_3phase':
      case 'motor_3phase_6p': return 1000;
      case 'motor_1phase': return 1001;

      case 'pilot_light_green':
      case 'pilot_light_red':
      case 'pilot_light_yellow': return 9008;
      case 'horn_siren': return 9009;

      case 'plc_cpu_s71200': return 10200;
      case 'plc_logo': return 10201;
      case 'plc_ladder_contact_no': return 10050;
      case 'plc_ladder_contact_nc': return 10051;
      case 'plc_ladder_coil':
      case 'plc_ladder_coil_set':
      case 'plc_ladder_coil_reset': return 10060;

      case 'grafcet_step_init': return 10100;
      case 'grafcet_step': return 10101;
      case 'grafcet_action': return 10102;
      case 'grafcet_transition': return 10103;

      case 'pneumatic_cylinder_da': return 10501;
      case 'solenoid_valve_5_2': return 10510;

      default: return 7000;
    }
  }
}
