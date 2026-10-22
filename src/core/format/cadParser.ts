import { CircuitDocument, PlacedComponent, WireSegment, JunctionNode } from '../../types/circuit';

export class CadParser {
  public static parse(content: string): CircuitDocument {
    const doc: CircuitDocument = {
      version: '4.2',
      components: [],
      wires: [],
      junctions: [],
      titleBlock: {
        title: 'Esquema Eléctrico CADe_SIMU',
        project: 'Automatismos Industriales',
        author: 'Ingeniería',
        date: new Date().toISOString().split('T')[0],
        sheet: '1/1',
        scale: '1:1',
        revision: '1.0',
        company: 'REA Cadesimu Pro'
      },
      gridSize: 20
    };

    if (!content.startsWith('CADe_SIMU')) {
      throw new Error('El archivo no tiene la cabecera válida de CADe_SIMU (*.cad)');
    }

    // Dividir los bloques de elementos
    // CADe_SIMU almacena componentes delimitados por # y *
    const blocks = content.split('#');

    let compCounter = 1;
    let wireCounter = 1;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (!block) continue;

      // Buscar patrones de elementos
      // Formato: *index*code#param1#param2#...#*x*y...#
      if (block.startsWith('*') || block.includes('*')) {
        const parts = block.split('*').filter(p => p.length > 0);
        if (parts.length >= 3) {
          const typeCode = parseInt(parts[1], 10);
          
          // Mapeo básico de códigos numéricos de CADe_SIMU a tipos
          const compType = this.mapCodeToType(typeCode);
          if (compType) {
            // Extraer coordenadas si están presentes en la cola
            const coords = parts.slice(2).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
            let posX = 10;
            let posY = 10;
            if (coords.length >= 2) {
              posX = Math.abs(coords[coords.length - 2]) % 60 + 5;
              posY = Math.abs(coords[coords.length - 1]) % 40 + 5;
            }

            doc.components.push({
              id: `comp_${compCounter++}`,
              type: compType,
              tag: `-KM${compCounter}`,
              x: posX,
              y: posY,
              rotation: 0,
              state: { isOpen: false }
            });
          }
        }
      }
    }

    return doc;
  }

  private static mapCodeToType(code: number): string | null {
    switch (code) {
      case 10100: return 'button_no';
      case 10101: return 'button_nc';
      case 10102: return 'coil_contactor';
      case 10103: return 'contact_no';
      case 10104: return 'contact_nc';
      case 10105: return 'motor_3phase';
      case 10106: return 'breaker_3p';
      case 10107: return 'pilot_light_green';
      default: return 'contact_no';
    }
  }

  public static export(doc: CircuitDocument): string {
    let output = 'CADe_SIMU*0*';
    doc.components.forEach((comp, idx) => {
      const typeCode = this.mapTypeToCode(comp.type);
      output += `${idx}*${typeCode}#${comp.tag}#########*0*0*0*0*0*0*0*0*${comp.x}*${comp.y}*0*0*-6*-3*12*15*0*0*0*1*0*0*0#`;
    });
    return output;
  }

  private static mapTypeToCode(type: string): number {
    switch (type) {
      case 'button_no': return 10100;
      case 'button_nc': return 10101;
      case 'coil_contactor': return 10102;
      case 'contact_no': return 10103;
      case 'contact_nc': return 10104;
      case 'motor_3phase': return 10105;
      case 'breaker_3p': return 10106;
      case 'pilot_light_green': return 10107;
      default: return 10103;
    }
  }
}
