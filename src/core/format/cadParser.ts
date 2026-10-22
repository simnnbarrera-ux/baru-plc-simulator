import { CircuitDocument, PlacedComponent, WireSegment, JunctionNode, WireType } from '../../types/circuit';

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
    const circuitBody = parts[0];

    // Expresión regular universal para extraer elementos: *<idx>*<type_id>#<attrs>#*<coords>#<label>
    const elementRegex = /\*(\d+)\*(\d+)#([^#]*(?:#[^#]*)*)#\*([^*#]*(?:\*[^*#]*)*)#([^*]*)/g;
    let match: RegExpExecArray | null;

    let compCounter = 1;
    let wireCounter = 1;
    let junctionCounter = 1;

    // Colectores para cálculo de encuadre y normalización de coordenadas
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

    // Paso 1: Parsear todos los tokens elementales
    while ((match = elementRegex.exec(circuitBody)) !== null) {
      const idx = parseInt(match[1], 10);
      const typeId = parseInt(match[2], 10);
      const attrs = match[3].split('#');
      const coords = match[4].split('*').map(v => parseInt(v.trim(), 10)).filter(n => !isNaN(n));
      const label = match[5]?.trim() || '';

      if (coords.length >= 10) {
        const x = coords[8];
        const y = coords[9];
        if (x > 0 && y > 0) {
          minRawX = Math.min(minRawX, x);
          minRawY = Math.min(minRawY, y);
        }
      }

      rawElements.push({ idx, typeId, attrs, coords, label });
    }

    if (minRawX === Infinity) minRawX = 0;
    if (minRawY === Infinity) minRawY = 0;

    // Normalizador de escala: CADe_SIMU usa paso de 3 o 6 en sus coordenadas nativas
    // Convertimos a coordenadas de rejilla cómodas (1 paso = 1 módulo)
    const scaleCoord = (raw: number, minRef: number): number => {
      const offset = Math.max(0, raw - minRef);
      return Math.round(offset / 3) + 4;
    };

    // Paso 2: Instanciar componentes, cables y uniones
    for (const elem of rawElements) {
      const { idx, typeId, attrs, coords, label } = elem;
      const tag = attrs[0]?.trim() || label || `E${idx}`;

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

      // C. Componentes de potencia, maniobra, PLC y electroneumática
      const mappedType = this.mapCodeToType(typeId);
      if (mappedType && coords.length >= 10) {
        const posX = scaleCoord(coords[8], minRawX);
        const posY = scaleCoord(coords[9], minRawY);

        doc.components.push({
          id: `comp_${compCounter++}`,
          type: mappedType,
          tag: tag.startsWith('-') ? tag : `-${tag}`,
          x: posX,
          y: posY,
          rotation: 0,
          state: { isOpen: false, isActuated: false }
        });
      }
    }

    // Paso 3: Carátula y formato de hoja
    if (parts.length > 1) {
      const tb = parts[1];
      const filenameMatch = tb.match(/\*([^*#]+\.cad)\*/i);
      if (filenameMatch) {
        doc.titleBlock.title = filenameMatch[1].replace('.cad', '').replace(/_/g, ' ');
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
      case 4011: return 'dc_pos';
      case 4012: return 'dc_neg';
      case 4000:
      default:
        return 'phase1';
    }
  }

  private static mapCodeToType(code: number): string | null {
    // 1. Motores y actuadores
    if (code >= 1000 && code <= 1005) return 'motor_3phase';

    // 2. Contactos de contactor principales
    if (code >= 2000 && code <= 2005) return 'contactor_3p';

    // 3. Alimentaciones de red
    if (code >= 3000 && code <= 3008) return 'source_3p';

    // 4. Protecciones (Disyuntores, guardamotores, relés térmicos)
    if (code === 6007) return 'thermal_relay';
    if (code >= 6000 && code <= 6015) return 'breaker_3p';

    // 5. Contactos auxiliares de mando
    if (code === 7000 || code === 8016) return 'contact_no';
    if (code === 7001 || code === 8017) return 'contact_nc';
    if (code === 7004 || code === 7006) return 'timer_on_delay';

    // 6. Pulsadores y setas de emergencia
    if (code === 8000) return 'button_no';
    if (code === 8001) return 'button_nc';
    if (code === 8002) return 'emergency_stop';
    if (code === 8023) return 'limit_switch_no';

    // 7. Bobinas y señalizadores luminosos
    if (code === 9000 || code === 9003) return 'coil_contactor';
    if (code === 9001 || code === 9004) return 'timer_on_delay';
    if (code === 9008) return 'pilot_light_green';
    if (code === 9009) return 'pilot_light_red';

    // 8. Lógica Ladder & GRAFCET
    if (code === 10050 || code === 10103) return 'contact_no';
    if (code === 10051) return 'contact_nc';
    if (code === 10060 || code === 10102) return 'coil_contactor';
    if (code === 10066) return 'timer_on_delay';
    if (code === 10100 || code === 10101) return 'contact_no';

    // 9. Electroneumática (Cilindros)
    if (code >= 10500 && code <= 10520) return 'motor_3phase';

    return 'contact_no';
  }

  public static export(doc: CircuitDocument): string {
    let output = 'CADe_SIMU*0*';
    doc.components.forEach((comp, idx) => {
      const typeCode = this.mapTypeToCode(comp.type);
      output += `${idx}*${typeCode}#${comp.tag}#########*0*0*0*0*0*0*0*0*${comp.x * 3}*${comp.y * 3}*0*0*-6*-3*12*15*0*0*0*1*0*0*0#`;
    });

    doc.wires.forEach((wire, idx) => {
      const wCode = wire.wireType === 'neutral' ? 4002 : wire.wireType === 'pe' ? 4010 : 4000;
      output += `${doc.components.length + idx}*${wCode}##########*0*0*0*0*0*0*0*0*${wire.fromX * 3}*${wire.fromY * 3}*${wire.toX * 3}*${wire.toY * 3}*0*0*0*0*0*0*0*0*0*1*0#`;
    });

    output += `$$$*2*1*1*2*4*0*1*0*0*279*210&&&*           *           *           *           *                         *                         *${doc.titleBlock?.date || '2026'}**1         **1         *${doc.titleBlock?.title || 'esquema'}.cad*0*1*0*0*0*0*0*0*0*0*0*0*0*0***$$$&&&***$$$&&&`;
    return output;
  }

  private static mapTypeToCode(type: string): number {
    switch (type) {
      case 'button_no': return 8000;
      case 'button_nc': return 8001;
      case 'emergency_stop': return 8002;
      case 'coil_contactor': return 9000;
      case 'timer_on_delay': return 9001;
      case 'contact_no': return 7000;
      case 'contact_nc': return 7001;
      case 'motor_3phase': return 1000;
      case 'breaker_3p': return 6009;
      case 'thermal_relay': return 6007;
      case 'pilot_light_green':
      case 'pilot_light_red': return 9008;
      default: return 7000;
    }
  }
}
