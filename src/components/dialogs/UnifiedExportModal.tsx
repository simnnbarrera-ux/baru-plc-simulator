import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileArchive,
  FileCode2,
  CircuitBoard,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Server
} from 'lucide-react';
import { CircuitDocument } from '../../types/circuit';
import { CadParser } from '../../core/format/cadParser';
import { TiaProgramDocument } from '../../core/plc/tiaEngine';
import {
  exportTiaOpennessLadderXml,
  exportTiaOpennessSclXml,
  exportTiaPlcTagsXml,
  exportTiaSclSource,
  exportTiaZipBundle,
  parseTiaOpennessXml,
  parseTiaSclSource,
  triggerLocalTiaAp21Bridge
} from '../../core/plc/tiaFormat';

export type ExportModalTab = 'export' | 'import';

interface Props {
  isOpen: boolean;
  initialTab?: ExportModalTab;
  document: CircuitDocument;
  tiaProgram: TiaProgramDocument;
  onClose: () => void;
  onImportCircuit: (doc: CircuitDocument) => void;
  onImportTiaProgram: (prog: TiaProgramDocument) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UnifiedExportModal: React.FC<Props> = ({
  isOpen,
  initialTab = 'export',
  document: circuitDoc,
  tiaProgram,
  onClose,
  onImportCircuit,
  onImportTiaProgram,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<ExportModalTab>(initialTab);
  const [rawText, setRawText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isBridging, setIsBridging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setImportError(null);
      setBridgeStatus(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const safeProjectName = (circuitDoc.titleBlock?.title || tiaProgram.blockName || 'proyecto')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast?.(`Descargado "${filename}"`, 'success');
  };

  const triggerTextDownload = (content: string, filename: string, mime = 'text/plain;charset=utf-8') => {
    triggerBlobDownload(new Blob([content], { type: mime }), filename);
  };

  // --- Descargas CADe_SIMU ---
  const handleDownloadCad = () => {
    const cadContent = CadParser.export(circuitDoc);
    triggerTextDownload(cadContent, `${safeProjectName}.cad`);
  };

  const handleDownloadProjectJson = () => {
    const bundle = {
      format: 'baru-studio-project-v2',
      exportedAt: new Date().toISOString(),
      circuit: circuitDoc,
      tiaProgram
    };
    triggerTextDownload(JSON.stringify(bundle, null, 2), `${safeProjectName}.json`, 'application/json;charset=utf-8');
  };

  // --- Descargas Siemens TIA Portal ---
  const handleDownloadTiaZip = () => {
    const zipBlob = exportTiaZipBundle(tiaProgram);
    triggerBlobDownload(zipBlob, `${safeProjectName}_TIA_Portal.zip`);
  };

  const handleDownloadScl = () => {
    triggerTextDownload(exportTiaSclSource(tiaProgram), `${tiaProgram.blockName || 'Main'}.scl`);
  };

  const handleDownloadOpennessLad = () => {
    triggerTextDownload(
      exportTiaOpennessLadderXml(tiaProgram),
      `${tiaProgram.blockName || 'Main'}_OB1_LAD.xml`,
      'application/xml;charset=utf-8'
    );
  };

  const handleDownloadOpennessScl = () => {
    triggerTextDownload(
      exportTiaOpennessSclXml(tiaProgram),
      `${tiaProgram.blockName || 'Main'}_OB1_SCL.xml`,
      'application/xml;charset=utf-8'
    );
  };

  const handleDownloadPlcTags = () => {
    triggerTextDownload(
      exportTiaPlcTagsXml(tiaProgram),
      'PLCTags.xml',
      'application/xml;charset=utf-8'
    );
  };

  const handleLocalAp21Compile = async () => {
    setIsBridging(true);
    setBridgeStatus(null);
    const res = await triggerLocalTiaAp21Bridge(tiaProgram);
    setBridgeStatus({ ok: res.connected, msg: res.message });
    setIsBridging(false);
  };

  // --- Importación Universal (.cad, .scl, .xml, .json) ---
  const processImportedText = (text: string, filename = '') => {
    setImportError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setImportError('El contenido está vacío.');
      return;
    }

    try {
      const lowerName = filename.toLowerCase();

      // 1. JSON (CircuitDocument o Bundle Completo)
      if (lowerName.endsWith('.json') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (parsed.circuit && parsed.tiaProgram) {
          onImportCircuit(parsed.circuit);
          onImportTiaProgram(parsed.tiaProgram);
          onShowToast?.('Proyecto completo (CAD + TIA Portal) importado correctamente', 'success');
          onClose();
          return;
        }
        if (Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
          onImportCircuit(parsed);
          onShowToast?.('Esquema CAD importado desde JSON', 'success');
          onClose();
          return;
        }
        if (Array.isArray(parsed.rungs) || typeof parsed.sclCode === 'string') {
          onImportTiaProgram(parsed);
          onShowToast?.('Programa TIA Portal importado desde JSON', 'success');
          onClose();
          return;
        }
      }

      // 2. XML Openness TIA Portal
      if (lowerName.endsWith('.xml') || trimmed.startsWith('<?xml') || trimmed.includes('<Document>')) {
        const prog = parseTiaOpennessXml(trimmed, tiaProgram.tags);
        onImportTiaProgram(prog);
        onShowToast?.(`Bloque TIA Portal Openness importado (${prog.activeLanguage})`, 'success');
        onClose();
        return;
      }

      // 3. Fuente SCL IEC 61131-3
      if (
        lowerName.endsWith('.scl') ||
        /\bORGANIZATION_BLOCK\b|\bFUNCTION_BLOCK\b|\bEND_IF\b|:=/i.test(trimmed)
      ) {
        if (!trimmed.startsWith('CADe_SIMU')) {
          const prog = parseTiaSclSource(trimmed, tiaProgram.tags);
          onImportTiaProgram(prog);
          onShowToast?.(`Código fuente SCL importado en "${prog.blockName}"`, 'success');
          onClose();
          return;
        }
      }

      // 4. Archivo CADe_SIMU (.cad)
      const circuit = CadParser.parse(trimmed);
      onImportCircuit(circuit);
      onShowToast?.(`Esquema CADe_SIMU importado (${circuit.components.length} componentes)`, 'success');
      onClose();
    } catch (err: any) {
      setImportError(err?.message || 'Formato no reconocido. Usa archivos .cad, .scl, .xml o .json.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      setRawText(text);
      processImportedText(text, file.name);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Exportar e Importar Proyecto
            </h2>
            <p className="text-xs text-slate-500">
              Compatible con CADe_SIMU (.cad) y Siemens TIA Portal V16–V21 (.zip / Openness .xml / .scl)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de pestaña */}
        <div className="px-6 pt-4">
          <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'export' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>Descargar Proyecto</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'import' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Abrir / Importar Archivo</span>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'export' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tarjeta CADe_SIMU */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <CircuitBoard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Formato CADe_SIMU</h3>
                      <p className="text-[11px] text-slate-500">Esquema eléctrico, fuerza y neumática</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 bg-white rounded-xl p-2.5 border border-slate-200/80 space-y-1">
                    <div>Componentes: <b>{circuitDoc.components.length}</b></div>
                    <div>Cables: <b>{circuitDoc.wires.length}</b></div>
                    <div>Cajetín ISO 7200: <b>Simón Barrera Ruíz</b></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleDownloadCad}
                    className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Archivo .CAD (V4.2)</span>
                  </button>
                  <button
                    onClick={handleDownloadProjectJson}
                    className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Respaldo Completo .JSON (CAD + TIA)</span>
                  </button>
                </div>
              </div>

              {/* Tarjeta Siemens TIA Portal */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Siemens TIA Portal</h3>
                      <p className="text-[11px] text-slate-500">S7-1200 CPU 1214C (V16 – V21)</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 bg-white rounded-xl p-2.5 border border-emerald-200/70 space-y-1">
                    <div>Bloque OB1: <b>{tiaProgram.blockName}</b></div>
                    <div>Segmentos LAD: <b>{tiaProgram.rungs.length}</b> • Tags: <b>{tiaProgram.tags.length}</b></div>
                    <div>Incluye: <b>LAD XML, SCL, PLCTags.xml y Guía</b></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleDownloadTiaZip}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileArchive className="w-4 h-4" />
                    <span>Descargar Paquete TIA Portal (.ZIP)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={handleDownloadOpennessLad}
                      className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      OB1_LAD.xml
                    </button>
                    <button
                      onClick={handleDownloadOpennessScl}
                      className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      OB1_SCL.xml
                    </button>
                    <button
                      onClick={handleDownloadScl}
                      className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      Fuente .SCL
                    </button>
                    <button
                      onClick={handleDownloadPlcTags}
                      className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      PLCTags.xml
                    </button>
                  </div>

                  <button
                    onClick={handleLocalAp21Compile}
                    disabled={isBridging}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Server className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isBridging ? 'Conectando a MCP Local...' : 'Generar .ap21 vía Puente MCP Local'}</span>
                  </button>
                </div>
              </div>

              {bridgeStatus && (
                <div
                  className={`md:col-span-2 p-3 rounded-2xl border text-xs flex items-start gap-2 ${
                    bridgeStatus.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {bridgeStatus.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span>{bridgeStatus.msg}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-sky-400 bg-slate-50 hover:bg-sky-50/40 rounded-2xl p-6 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-8 h-8 text-sky-600 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-800">
                  Haz clic para elegir un archivo desde tu equipo
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Soporta <span className="font-mono font-bold">.cad</span> (CADe_SIMU V1–V4.2),{' '}
                  <span className="font-mono font-bold">.scl</span>, Openness{' '}
                  <span className="font-mono font-bold">.xml</span> (LAD/SCL/PLCTags) y{' '}
                  <span className="font-mono font-bold">.json</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".cad,.scl,.xml,.json,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  O pega el contenido del archivo (.cad, .scl, XML Openness o .json):
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={6}
                  placeholder="Pega aquí código SCL, XML de TIA Portal o texto CADe_SIMU..."
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-sky-400 font-mono text-xs text-slate-800 focus:outline-none select-text"
                />
              </div>

              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => processImportedText(rawText)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-sm cursor-pointer"
                >
                  Importar Texto
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
