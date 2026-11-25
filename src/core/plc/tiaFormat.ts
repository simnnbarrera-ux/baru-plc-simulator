// ============================================================================
// TIA Portal V21 Openness XML, SCL Source & Pure-TS ZIP Bundle Generator/Parser
// Author: Simón Barrera Ruíz
// ============================================================================

import {
  DEFAULT_TIA_PROGRAM,
  TiaLadderRung,
  TiaProgramDocument,
  TiaTag
} from './tiaEngine';

// ----------------------------------------------------------------------------
// Utilidad ZIP Cero-Dependencias (Store + CRC32 IEEE 802.3, compatible Windows/macOS/Linux)
// ----------------------------------------------------------------------------
export interface ZipEntryInput {
  name: string;
  content: string | Uint8Array;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZipBytes(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes =
      typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
    const crc = crc32(dataBytes);

    // Local File Header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true);         // Version needed (2.0)
    lv.setUint16(6, 0x0800, true);     // UTF-8 filename flag
    lv.setUint16(8, 0, true);          // Compression method 0 = Store
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    // Central Directory File Header (46 bytes + name)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central directory signature
    cv.setUint16(4, 20, true);         // Version made by
    cv.setUint16(6, 20, true);         // Version needed
    cv.setUint16(8, 0x0800, true);     // UTF-8 flag
    cv.setUint16(10, 0, true);         // Store
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((acc, p) => acc + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // End of central directory signature
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalSize);
  let cursor = 0;
  for (const part of localParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    out.set(part, cursor);
    cursor += part.length;
  }
  out.set(eocd, cursor);
  return out;
}

export function createZipBlob(entries: ZipEntryInput[]): Blob {
  const bytes = createZipBytes(entries);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: 'application/zip' });
}

// ----------------------------------------------------------------------------
// Utilidades XML
// ----------------------------------------------------------------------------
function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function getTagSymbolName(addrOrName: string, tags: TiaTag[]): string {
  const clean = addrOrName.trim().replace(/^["']|["']$/g, '');
  const byAddr = tags.find(t => t.address.toUpperCase() === clean.toUpperCase());
  if (byAddr) return byAddr.name;
  return clean.replace(/^%/, '').replace(/\./g, '_');
}

// ----------------------------------------------------------------------------
// 1. Exportador Tabla de Variables PLC Tags (PLCTags.xml - Openness V21)
// ----------------------------------------------------------------------------
export function exportTiaPlcTagsXml(program: TiaProgramDocument): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<Document>',
    '  <Engineering version="V21" />',
    '  <SW.Tags.PlcTagTable ID="0">',
    '    <AttributeList>',
    '      <Name>Default tag table</Name>',
    '    </AttributeList>',
    '    <ObjectList>'
  ];

  let uid = 1;
  program.tags.forEach((tag) => {
    const tagId = uid++;
    lines.push(`      <SW.Tags.PlcTag ID="${tagId}" CompositionName="Tags">`);
    lines.push('        <AttributeList>');
    lines.push(`          <DataTypeName>${escapeXml(tag.dataType)}</DataTypeName>`);
    lines.push('          <ExternalAccessible>true</ExternalAccessible>');
    lines.push('          <ExternalVisible>true</ExternalVisible>');
    lines.push('          <ExternalWritable>true</ExternalWritable>');
    lines.push(`          <LogicalAddress>${escapeXml(tag.address.toUpperCase())}</LogicalAddress>`);
    lines.push(`          <Name>${escapeXml(tag.name)}</Name>`);
    lines.push('        </AttributeList>');
    if (tag.comment || tag.schematicTag) {
      const commentId = uid++;
      const itemId = uid++;
      const text = [tag.comment, tag.schematicTag ? `[CAD: ${tag.schematicTag}]` : '']
        .filter(Boolean)
        .join(' ');
      lines.push('        <ObjectList>');
      lines.push(`          <MultilingualText ID="${commentId}" CompositionName="Comment">`);
      lines.push('            <ObjectList>');
      lines.push(`              <MultilingualTextItem ID="${itemId}" CompositionName="Items">`);
      lines.push('                <AttributeList>');
      lines.push('                  <Culture>es-ES</Culture>');
      lines.push(`                  <Text>${escapeXml(text)}</Text>`);
      lines.push('                </AttributeList>');
      lines.push('              </MultilingualTextItem>');
      lines.push('            </ObjectList>');
      lines.push('          </MultilingualText>');
      lines.push('        </ObjectList>');
    }
    lines.push('      </SW.Tags.PlcTag>');
  });

  lines.push('    </ObjectList>');
  lines.push('  </SW.Tags.PlcTagTable>');
  lines.push('</Document>');
  return lines.join('\n');
}

// ----------------------------------------------------------------------------
// 2. Exportador Fuente SCL Pura (.scl) - IEC 61131-3 TIA Portal
// ----------------------------------------------------------------------------
export function exportTiaSclSource(program: TiaProgramDocument): string {
  const blockName = program.blockName || 'Main';
  const body = program.sclCode.trim();
  const hasBlockWrapper = /^ORGANIZATION_BLOCK\b|^FUNCTION_BLOCK\b|^FUNCTION\b/im.test(body);
  if (hasBlockWrapper) {
    return body;
  }

  return [
    `ORGANIZATION_BLOCK "${blockName}"`,
    `TITLE = ${blockName} (OB1) - Generado por Baru PLC Simulator`,
    `// Autor: Simón Barrera Ruíz | CPU: ${program.cpuModel}`,
    `{ S7_Optimized_Access := 'TRUE' }`,
    `VERSION : 0.1`,
    `VAR_TEMP`,
    `    Temp_Scan : Bool;`,
    `END_VAR`,
    ``,
    `BEGIN`,
    body,
    ``,
    `END_ORGANIZATION_BLOCK`
  ].join('\n');
}

// ----------------------------------------------------------------------------
// 3. Exportador Openness XML para Bloque SCL (SW.Blocks.OB + StructuredText/v4)
// ----------------------------------------------------------------------------
export function exportTiaOpennessSclXml(program: TiaProgramDocument): string {
  const blockName = program.blockName || 'Main';
  const sclBody = program.sclCode.trim();

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<Document>',
    '  <Engineering version="V21" />',
    '  <SW.Blocks.OB ID="0">',
    '    <AttributeList>',
    '      <AutoNumber>true</AutoNumber>',
    '      <HeaderAuthor>Simon Barrera Ruiz</HeaderAuthor>',
    '      <HeaderVersion>0.1</HeaderVersion>',
    '      <Interface>',
    '        <Sections xmlns="http://www.siemens.com/automation/Openness/SW/InterfaceSections/v5">',
    '          <Section Name="Input" />',
    '          <Section Name="Output" />',
    '          <Section Name="InOut" />',
    '          <Section Name="Static" />',
    '          <Section Name="Temp" />',
    '          <Section Name="Constant" />',
    '        </Sections>',
    '      </Interface>',
    '      <MemoryLayout>Optimized</MemoryLayout>',
    `      <Name>${escapeXml(blockName)}</Name>`,
    '      <Number>1</Number>',
    '      <ProgrammingLanguage>SCL</ProgrammingLanguage>',
    '      <SecondaryType>ProgramCycle</SecondaryType>',
    '    </AttributeList>',
    '    <ObjectList>',
    '      <MultilingualText ID="1" CompositionName="Title">',
    '        <ObjectList>',
    '          <MultilingualTextItem ID="2" CompositionName="Items">',
    '            <AttributeList>',
    '              <Culture>es-ES</Culture>',
    `              <Text>${escapeXml(blockName)} (SCL OB1)</Text>`,
    '            </AttributeList>',
    '          </MultilingualTextItem>',
    '        </ObjectList>',
    '      </MultilingualText>',
    '      <SW.Blocks.CompileUnit ID="3" CompositionName="CompileUnits">',
    '        <AttributeList>',
    '          <NetworkSource>',
    '            <StructuredText xmlns="http://www.siemens.com/automation/Openness/SW/NetworkSource/StructuredText/v4">',
    `              <Text>${escapeXml(sclBody)}</Text>`,
    '            </StructuredText>',
    '          </NetworkSource>',
    '          <ProgrammingLanguage>SCL</ProgrammingLanguage>',
    '        </AttributeList>',
    '      </SW.Blocks.CompileUnit>',
    '    </ObjectList>',
    '  </SW.Blocks.OB>',
    '</Document>'
  ].join('\n');
}

// ----------------------------------------------------------------------------
// 4. Exportador Openness XML para Diagrama Ladder LAD (FlgNet/v4)
// ----------------------------------------------------------------------------
export function exportTiaOpennessLadderXml(program: TiaProgramDocument): string {
  const blockName = program.blockName || 'Main';
  let cuId = 3;

  const compileUnitsXml = program.rungs.map((rung) => {
    const currentCuId = cuId++;
    let uidCounter = 20;
    const nextUid = () => ++uidCounter;

    const partLines: string[] = [];
    const wireLines: string[] = [];

    const addAccess = (symbolName: string): number => {
      const u = nextUid();
      partLines.push(
        `              <Access Scope="GlobalVariable" UId="${u}">`,
        '                <Symbol>',
        `                  <Component Name="${escapeXml(symbolName)}" />`,
        '                </Symbol>',
        '              </Access>'
      );
      return u;
    };

    const addContact = (negated: boolean): number => {
      const u = nextUid();
      if (negated) {
        partLines.push(
          `              <Part Name="Contact" UId="${u}">`,
          '                <Negated Name="operand" />',
          '              </Part>'
        );
      } else {
        partLines.push(`              <Part Name="Contact" UId="${u}" />`);
      }
      return u;
    };

    const addWire = (conns: string[]) => {
      const u = nextUid();
      wireLines.push(`              <Wire UId="${u}">`);
      conns.forEach(c => wireLines.push(`                ${c}`));
      wireLines.push('              </Wire>');
    };

    const branchEnds: number[] = [];
    const branchStarts: number[] = [];

    const activeBranches = rung.branches.filter(b => b.contacts.length > 0);
    for (const br of activeBranches) {
      let prevContactUid: number | null = null;
      for (const ct of br.contacts) {
        const sym = getTagSymbolName(ct.address, program.tags);
        const accUid = addAccess(sym);
        const ctUid = addContact(ct.type === 'NC');
        addWire([`<IdentCon UId="${accUid}" />`, `<NameCon UId="${ctUid}" Name="operand" />`]);
        if (prevContactUid === null) {
          branchStarts.push(ctUid);
        } else {
          addWire([`<NameCon UId="${prevContactUid}" Name="out" />`, `<NameCon UId="${ctUid}" Name="in" />`]);
        }
        prevContactUid = ctUid;
      }
      if (prevContactUid !== null) {
        branchEnds.push(prevContactUid);
      }
    }

    if (branchStarts.length > 0) {
      addWire([
        '<Powerrail />',
        ...branchStarts.map(u => `<NameCon UId="${u}" Name="in" />`)
      ]);
    }

    let lastNodeUid: number | null = null;
    if (branchEnds.length === 1) {
      lastNodeUid = branchEnds[0];
    } else if (branchEnds.length > 1) {
      const orUid = nextUid();
      partLines.push(
        `              <Part Name="O" UId="${orUid}">`,
        `                <TemplateValue Name="Card" Type="Cardinality">${branchEnds.length}</TemplateValue>`,
        '              </Part>'
      );
      branchEnds.forEach((bUid, i) => {
        addWire([`<NameCon UId="${bUid}" Name="out" />`, `<NameCon UId="${orUid}" Name="in${i + 1}" />`]);
      });
      lastNodeUid = orUid;
    }

    // Contactos en serie
    for (const sCt of rung.seriesContacts) {
      const sym = getTagSymbolName(sCt.address, program.tags);
      const accUid = addAccess(sym);
      const ctUid = addContact(sCt.type === 'NC');
      addWire([`<IdentCon UId="${accUid}" />`, `<NameCon UId="${ctUid}" Name="operand" />`]);
      if (lastNodeUid === null) {
        addWire(['<Powerrail />', `<NameCon UId="${ctUid}" Name="in" />`]);
      } else {
        addWire([`<NameCon UId="${lastNodeUid}" Name="out" />`, `<NameCon UId="${ctUid}" Name="in" />`]);
      }
      lastNodeUid = ctUid;
    }

    // Temporizador TON/TOF si existe
    if (rung.timer) {
      const tmUid = nextUid();
      partLines.push(
        `              <Part Name="${rung.timer.type}" Version="1.0" UId="${tmUid}">`,
        `                <Instance Scope="GlobalVariable" UId="${nextUid()}">`,
        `                  <Component Name="${escapeXml(rung.timer.name)}" />`,
        '                </Instance>',
        '              </Part>'
      );
      if (lastNodeUid === null) {
        addWire(['<Powerrail />', `<NameCon UId="${tmUid}" Name="IN" />`]);
      } else {
        addWire([`<NameCon UId="${lastNodeUid}" Name="out" />`, `<NameCon UId="${tmUid}" Name="IN" />`]);
      }
      lastNodeUid = tmUid;
    }

    // Bobinas de salida
    const fromPinName = rung.timer ? 'Q' : 'out';
    for (const coil of rung.coils) {
      const sym = getTagSymbolName(coil.address, program.tags);
      const accUid = addAccess(sym);
      const coilPartName = coil.type === 'SET' ? 'SCoil' : coil.type === 'RESET' ? 'RCoil' : 'Coil';
      const coilUid = nextUid();
      partLines.push(`              <Part Name="${coilPartName}" UId="${coilUid}" />`);
      addWire([`<IdentCon UId="${accUid}" />`, `<NameCon UId="${coilUid}" Name="operand" />`]);
      if (lastNodeUid === null) {
        addWire(['<Powerrail />', `<NameCon UId="${coilUid}" Name="in" />`]);
      } else {
        addWire([`<NameCon UId="${lastNodeUid}" Name="${fromPinName}" />`, `<NameCon UId="${coilUid}" Name="in" />`]);
      }
    }

    const commentId = cuId++;
    const commentItemId = cuId++;
    const titleId = cuId++;
    const titleItemId = cuId++;

    return [
      `      <SW.Blocks.CompileUnit ID="${currentCuId}" CompositionName="CompileUnits">`,
      '        <AttributeList>',
      '          <NetworkSource>',
      '            <FlgNet xmlns="http://www.siemens.com/automation/Openness/SW/NetworkSource/FlgNet/v4">',
      '              <Parts>',
      ...partLines,
      '              </Parts>',
      '              <Wires>',
      ...wireLines,
      '              </Wires>',
      '            </FlgNet>',
      '          </NetworkSource>',
      '          <ProgrammingLanguage>LAD</ProgrammingLanguage>',
      '        </AttributeList>',
      '        <ObjectList>',
      `          <MultilingualText ID="${commentId}" CompositionName="Comment">`,
      '            <ObjectList>',
      `              <MultilingualTextItem ID="${commentItemId}" CompositionName="Items">`,
      '                <AttributeList>',
      '                  <Culture>es-ES</Culture>',
      `                  <Text>${escapeXml(rung.comment || `Network ${rung.number}`)}</Text>`,
      '                </AttributeList>',
      '              </MultilingualTextItem>',
      '            </ObjectList>',
      '          </MultilingualText>',
      `          <MultilingualText ID="${titleId}" CompositionName="Title">`,
      '            <ObjectList>',
      `              <MultilingualTextItem ID="${titleItemId}" CompositionName="Items">`,
      '                <AttributeList>',
      '                  <Culture>es-ES</Culture>',
      `                  <Text>Network ${rung.number}</Text>`,
      '                </AttributeList>',
      '              </MultilingualTextItem>',
      '            </ObjectList>',
      '          </MultilingualText>',
      '        </ObjectList>',
      '      </SW.Blocks.CompileUnit>'
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<Document>',
    '  <Engineering version="V21" />',
    '  <SW.Blocks.OB ID="0">',
    '    <AttributeList>',
    '      <AutoNumber>true</AutoNumber>',
    '      <HeaderAuthor>Simon Barrera Ruiz</HeaderAuthor>',
    '      <HeaderVersion>0.1</HeaderVersion>',
    '      <Interface>',
    '        <Sections xmlns="http://www.siemens.com/automation/Openness/SW/Interface/v5">',
    '          <Section Name="Input" />',
    '          <Section Name="Output" />',
    '          <Section Name="InOut" />',
    '          <Section Name="Temp" />',
    '          <Section Name="Constant" />',
    '        </Sections>',
    '      </Interface>',
    '      <IsIECCheckEnabled>false</IsIECCheckEnabled>',
    '      <MemoryLayout>Optimized</MemoryLayout>',
    `      <Name>${escapeXml(blockName)}</Name>`,
    '      <Number>1</Number>',
    '      <ProgrammingLanguage>LAD</ProgrammingLanguage>',
    '      <SetENOAutomatically>false</SetENOAutomatically>',
    '      <SecondaryType>ProgramCycle</SecondaryType>',
    '    </AttributeList>',
    '    <ObjectList>',
    '      <MultilingualText ID="1" CompositionName="Title">',
    '        <ObjectList>',
    '          <MultilingualTextItem ID="2" CompositionName="Items">',
    '            <AttributeList>',
    '              <Culture>es-ES</Culture>',
    `              <Text>${escapeXml(blockName)} (LAD OB1)</Text>`,
    '            </AttributeList>',
    '          </MultilingualTextItem>',
    '        </ObjectList>',
    '      </MultilingualText>',
    ...compileUnitsXml,
    '    </ObjectList>',
    '  </SW.Blocks.OB>',
    '</Document>'
  ].join('\n');
}

// ----------------------------------------------------------------------------
// 5. Exportador Paquete ZIP Completo para Siemens TIA Portal V16 - V21
// ----------------------------------------------------------------------------
export function exportTiaZipBundle(program: TiaProgramDocument): Blob {
  const readme = [
    '======================================================================',
    'PAQUETE DE PROYECTO SIEMENS TIA PORTAL (V16 - V21)',
    'Generado por: Baru PLC Simulator | Autor: Simón Barrera Ruíz',
    '======================================================================',
    '',
    `CPU Objetivo : ${program.cpuModel}`,
    `Bloque OB1   : ${program.blockName || 'Main'}`,
    `Lenguaje     : ${program.activeLanguage}`,
    '',
    'ARCHIVOS INCLUIDOS:',
    '  1. PLCTags.xml          -> Tabla de Variables PLC (Importar en Variables PLC -> Importar)',
    '  2. Main_OB1_LAD.xml     -> Bloque OB1 en Escalera / KOP (Siemens Openness XML)',
    '  3. Main_OB1_SCL.xml     -> Bloque OB1 en Texto Estructurado SCL (Siemens Openness XML)',
    '  4. Main.scl             -> Fuente Externa IEC 61131-3 SCL (Importar en Fuentes externas -> Generar bloque)',
    '  5. proyecto_tia.json    -> Respaldo completo editable para reabrir en Baru PLC Simulator',
    '',
    'PASOS RÁPIDOS EN TIA PORTAL:',
    '  Opción A (Sin Openness - Fuente Externa SCL):',
    '    1. Crea un proyecto con CPU 1214C DC/DC/DC.',
    '    2. En Variables PLC -> Importar "PLCTags.xml".',
    '    3. En Fuentes externas -> Agregar nuevo archivo externo "Main.scl".',
    '    4. Clic derecho sobre Main.scl -> "Generar bloques desde fuente".',
    '',
    '  Opción B (Openness API / MCP Local):',
    '    Ejecuta ImportXml sobre "Main_OB1_LAD.xml" o "Main_OB1_SCL.xml".',
    ''
  ].join('\r\n');

  return createZipBlob([
    { name: 'PLCTags.xml', content: exportTiaPlcTagsXml(program) },
    { name: `${program.blockName || 'Main'}_OB1_LAD.xml`, content: exportTiaOpennessLadderXml(program) },
    { name: `${program.blockName || 'Main'}_OB1_SCL.xml`, content: exportTiaOpennessSclXml(program) },
    { name: `${program.blockName || 'Main'}.scl`, content: exportTiaSclSource(program) },
    { name: 'proyecto_tia.json', content: JSON.stringify(program, null, 2) },
    { name: 'README_Importar_TIA_Portal.txt', content: readme }
  ]);
}

// ----------------------------------------------------------------------------
// 6. Importadores (.scl y Openness .xml) -> TiaProgramDocument
// ----------------------------------------------------------------------------
function ensureTagsFromSymbols(text: string, existingTags: TiaTag[]): TiaTag[] {
  const tags = [...existingTags];
  const quotedMatches = text.match(/"([A-Za-z_][A-Za-z0-9_]*)"/g) || [];
  let nextI = tags.filter(t => t.address.startsWith('%I')).length;
  let nextQ = tags.filter(t => t.address.startsWith('%Q')).length;
  let nextM = tags.filter(t => t.address.startsWith('%M')).length;

  for (const raw of quotedMatches) {
    const sym = raw.slice(1, -1);
    if (/^(TON|TOF|CTU|Main|OB1|Timer)/i.test(sym)) continue;
    if (tags.some(t => t.name.toLowerCase() === sym.toLowerCase())) continue;

    let addr = `%M0.${nextM++}`;
    if (/boton|pulsador|start|stop|marcha|paro|sensor|fc|a0|a1|b0|b1|in|di/i.test(sym)) {
      addr = `%I0.${nextI++}`;
    } else if (/motor|km|piloto|luz|valvula|y1|y2|coil|out|dq|lamp/i.test(sym)) {
      addr = `%Q0.${nextQ++}`;
    }
    tags.push({ address: addr, name: sym, dataType: 'Bool', comment: 'Importado automáticamente' });
  }
  return tags;
}

export function parseTiaSclSource(content: string, baseTags: TiaTag[] = DEFAULT_TIA_PROGRAM.tags): TiaProgramDocument {
  const nameMatch = content.match(/(?:ORGANIZATION_BLOCK|FUNCTION_BLOCK|FUNCTION)\s+"?([A-Za-z0-9_]+)"?/i);
  const blockName = nameMatch ? nameMatch[1] : 'Main';

  const beginMatch = content.match(/\bBEGIN\b([\s\S]*?)\bEND_(?:ORGANIZATION_BLOCK|FUNCTION_BLOCK|FUNCTION)\b/i);
  const sclBody = (beginMatch ? beginMatch[1] : content).trim();
  const tags = ensureTagsFromSymbols(sclBody, baseTags);

  return {
    ...DEFAULT_TIA_PROGRAM,
    blockName,
    activeLanguage: 'SCL',
    tags,
    sclCode: sclBody
  };
}

export function parseTiaOpennessXml(xmlText: string, baseTags: TiaTag[] = DEFAULT_TIA_PROGRAM.tags): TiaProgramDocument {
  // 1. Detectar si es tabla de variables PLCTags.xml
  if (xmlText.includes('SW.Tags.PlcTag')) {
    const importedTags: TiaTag[] = [];
    const tagBlocks = xmlText.match(/<SW\.Tags\.PlcTag\b[\s\S]*?<\/SW\.Tags\.PlcTag>/g) || [];
    for (const blk of tagBlocks) {
      const addr = blk.match(/<LogicalAddress>(.*?)<\/LogicalAddress>/)?.[1]?.trim();
      const name = blk.match(/<Name>(.*?)<\/Name>/)?.[1]?.trim();
      const dt = blk.match(/<DataTypeName>(.*?)<\/DataTypeName>/)?.[1]?.trim() as 'Bool' | 'Time' | 'Int' | undefined;
      if (addr && name) {
        importedTags.push({
          address: addr.toUpperCase(),
          name: unescapeXml(name),
          dataType: dt === 'Time' || dt === 'Int' ? dt : 'Bool'
        });
      }
    }
    if (importedTags.length > 0) {
      return {
        ...DEFAULT_TIA_PROGRAM,
        tags: importedTags
      };
    }
  }

  // 2. Detectar si es bloque SCL (StructuredText)
  const stMatch = xmlText.match(/<StructuredText[\s\S]*?<Text>([\s\S]*?)<\/Text>/i);
  const blockNameMatch = xmlText.match(/<AttributeList>[\s\S]*?<Name>([^<]+)<\/Name>/i);
  const blockName = blockNameMatch ? unescapeXml(blockNameMatch[1].trim()) : 'Main';

  if (stMatch) {
    const sclCode = unescapeXml(stMatch[1]).trim();
    return {
      ...DEFAULT_TIA_PROGRAM,
      blockName,
      activeLanguage: 'SCL',
      tags: ensureTagsFromSymbols(sclCode, baseTags),
      sclCode
    };
  }

  // 3. Parsear bloque LAD (FlgNet)
  const cuMatches = xmlText.match(/<SW\.Blocks\.CompileUnit\b[\s\S]*?<\/SW\.Blocks\.CompileUnit>/g) || [];
  const parsedRungs: TiaLadderRung[] = [];
  let updatedTags = [...baseTags];

  cuMatches.forEach((cuXml, idx) => {
    const flgMatch = cuXml.match(/<FlgNet[\s\S]*?<\/FlgNet>/i);
    if (!flgMatch) return;
    const flg = flgMatch[0];

    const uidToSymbol = new Map<string, string>();
    const accessRegex = /<Access\b[^>]*UId="(\d+)"[^>]*>[\s\S]*?<Component\s+Name="([^"]+)"/g;
    let am: RegExpExecArray | null;
    while ((am = accessRegex.exec(flg)) !== null) {
      uidToSymbol.set(am[1], unescapeXml(am[2]));
      updatedTags = ensureTagsFromSymbols(`"${unescapeXml(am[2])}"`, updatedTags);
    }

    const parts: Array<{ uid: string; name: string; negated: boolean }> = [];
    const partRegex = /<Part\b([^>]*)(?:\/>|>([\s\S]*?)<\/Part>)/g;
    let pm: RegExpExecArray | null;
    while ((pm = partRegex.exec(flg)) !== null) {
      const attrs = pm[1];
      const body = pm[2] || '';
      const name = attrs.match(/Name="([^"]+)"/)?.[1] || '';
      const uid = attrs.match(/UId="(\d+)"/)?.[1] || '';
      const negated = body.includes('<Negated');
      if (uid && name) {
        parts.push({ uid, name, negated });
      }
    }

    // Mapear operand wires IdentCon -> NameCon(uid)
    const partOperand = new Map<string, string>();
    const wireRegex = /<Wire\b[^>]*>([\s\S]*?)<\/Wire>/g;
    let wm: RegExpExecArray | null;
    while ((wm = wireRegex.exec(flg)) !== null) {
      const wBody = wm[1];
      const ident = wBody.match(/<IdentCon\s+UId="(\d+)"/)?.[1];
      const opTarget = wBody.match(/<NameCon\s+UId="(\d+)"\s+Name="operand"/)?.[1];
      if (ident && opTarget && uidToSymbol.has(ident)) {
        partOperand.set(opTarget, uidToSymbol.get(ident)!);
      }
    }

    const contacts = parts
      .filter(p => p.name === 'Contact')
      .map((p, ci) => {
        const sym = partOperand.get(p.uid) || '%I0.0';
        const matchedTag = updatedTags.find(t => t.name.toLowerCase() === sym.toLowerCase());
        return {
          id: `imp_c_${idx}_${ci}`,
          type: (p.negated ? 'NC' : 'NO') as 'NO' | 'NC',
          address: matchedTag ? matchedTag.address : sym
        };
      });

    const coils = parts
      .filter(p => p.name === 'Coil' || p.name === 'SCoil' || p.name === 'RCoil')
      .map((p, qi) => {
        const sym = partOperand.get(p.uid) || '%Q0.0';
        const matchedTag = updatedTags.find(t => t.name.toLowerCase() === sym.toLowerCase());
        return {
          id: `imp_q_${idx}_${qi}`,
          type: (p.name === 'SCoil' ? 'SET' : p.name === 'RCoil' ? 'RESET' : 'OUT') as 'OUT' | 'SET' | 'RESET',
          address: matchedTag ? matchedTag.address : sym
        };
      });

    const commentMatch = cuXml.match(/CompositionName="Comment"[\s\S]*?<Text>([\s\S]*?)<\/Text>/i);
    parsedRungs.push({
      id: `net_imp_${idx + 1}`,
      number: idx + 1,
      comment: commentMatch ? unescapeXml(commentMatch[1].trim()) : `Network ${idx + 1} (Importado Openness)`,
      branches: contacts.length > 0 ? [{ id: `br_imp_${idx}`, contacts: [contacts[0]] }] : [],
      seriesContacts: contacts.slice(1),
      coils
    });
  });

  if (parsedRungs.length > 0) {
    return {
      ...DEFAULT_TIA_PROGRAM,
      blockName,
      activeLanguage: 'LAD',
      tags: updatedTags,
      rungs: parsedRungs
    };
  }

  throw new Error('El XML no contiene un bloque Openness LAD, SCL o Tabla de Tags reconocible.');
}

// ----------------------------------------------------------------------------
// 7. Puente Opcional hacia tia-portal-mcp Local (.ap21 nativo en Windows)
// ----------------------------------------------------------------------------
export interface LocalTiaBridgeResult {
  connected: boolean;
  message: string;
}

export async function triggerLocalTiaAp21Bridge(
  program: TiaProgramDocument,
  endpointUrl: string = 'http://127.0.0.1:8765/api/tia/export-ap21'
): Promise<LocalTiaBridgeResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        blockName: program.blockName,
        cpuType: '6ES7 214-1AG40-0XB0/V4.5',
        language: program.activeLanguage,
        sclSource: exportTiaSclSource(program),
        opennessSclXml: exportTiaOpennessSclXml(program),
        opennessLadXml: exportTiaOpennessLadderXml(program),
        plcTagsXml: exportTiaPlcTagsXml(program)
      })
    });
    clearTimeout(timer);
    if (!resp.ok) {
      return {
        connected: false,
        message: `El puente local respondió con estado HTTP ${resp.status}.`
      };
    }
    const json = await resp.json().catch(() => ({}));
    return {
      connected: true,
      message: json.message || 'Proyecto .ap21 generado y compilado vía tia-portal-mcp local.'
    };
  } catch {
    return {
      connected: false,
      message:
        'Modo Navegador (Vercel): el compilador .ap21 nativo requiere Windows + TIA Portal V21 Openness local. Descarga el paquete ZIP Openness/SCL e impórtalo directamente en TIA Portal.'
    };
  }
}
