import React, { useState } from 'react';
import { CircuitDocument } from '../../types/circuit';
import { CadParser } from '../../core/format/cadParser';
import { X, Upload, Download, Copy, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  document: CircuitDocument;
  onClose: () => void;
  onImportDocument: (doc: CircuitDocument) => void;
}

export const ImportExportModal: React.FC<Props> = ({
  isOpen,
  document,
  onClose,
  onImportDocument
}) => {
  if (!isOpen) return null;

  const [rawText, setRawText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          onImportDocument(parsed);
          onClose();
        } else {
          // Archivo .cad original
          const parsed = CadParser.parse(text);
          onImportDocument(parsed);
          onClose();
        }
      } catch (err: any) {
        setError(`Error al procesar el archivo: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleTextImport = () => {
    try {
      setError(null);
      if (rawText.trim().startsWith('{')) {
        const parsed = JSON.parse(rawText);
        onImportDocument(parsed);
        onClose();
      } else {
        const parsed = CadParser.parse(rawText);
        onImportDocument(parsed);
        onClose();
      }
    } catch (err: any) {
      setError(`Error de formato: ${err.message}`);
    }
  };

  const handleExportCadFile = () => {
    const cadText = CadParser.export(document);
    const blob = new Blob([cadText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.titleBlock.title || 'esquema'}.cad`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJsonFile = () => {
    const jsonText = JSON.stringify(document, null, 2);
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.titleBlock.title || 'esquema'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-industrial-900 border border-industrial-700 rounded-lg shadow-2xl p-5 text-industrial-100">
        <div className="flex items-center justify-between pb-3 border-b border-industrial-800">
          <h3 className="text-sm font-bold text-cyan-400">Importar / Exportar Esquema</h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-industrial-400 hover:text-industrial-200 hover:bg-industrial-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Carga de archivo desde disco */}
          <div className="p-4 border-2 border-dashed border-industrial-700 rounded-lg bg-industrial-950/60 text-center">
            <Upload className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
            <p className="font-semibold text-industrial-200 mb-1">
              Cargar archivo de CADe_SIMU (*.cad) o JSON
            </p>
            <p className="text-[11px] text-industrial-500 mb-3">
              Arrastra o selecciona un archivo .cad creado con la versión original
            </p>
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-md transition-colors">
              <span>Seleccionar Archivo</span>
              <input
                type="file"
                accept=".cad,.json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* O pegar texto directo */}
          <div>
            <label className="block font-semibold mb-1 text-industrial-300">
              O pegar contenido de archivo (.cad o JSON):
            </label>
            <textarea
              rows={4}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="CADe_SIMU*0*10100#0#########*..."
              className="w-full p-2.5 bg-industrial-950 border border-industrial-700 rounded font-mono text-[11px] text-industrial-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px]">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-industrial-800">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportCadFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-industrial-800 hover:bg-industrial-700 text-industrial-200 border border-industrial-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Bajar .cad</span>
              </button>
              <button
                type="button"
                onClick={handleExportJsonFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-industrial-800 hover:bg-industrial-700 text-industrial-200 border border-industrial-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Bajar .json</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded bg-industrial-800 text-industrial-300 hover:bg-industrial-700"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleTextImport}
                disabled={!rawText.trim()}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-medium shadow-md"
              >
                Importar Texto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
