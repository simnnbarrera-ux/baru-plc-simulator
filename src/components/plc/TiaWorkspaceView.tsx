import React, { useMemo, useState } from 'react';
import {
  Cpu,
  Eye,
  Plus,
  Trash2,
  ArrowRightLeft,
  Code2,
  GitBranch,
  Workflow,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Tag,
  ShieldAlert,
  RotateCcw,
  Play,
  SkipForward,
  Search,
  Filter,
  Activity,
  X
} from 'lucide-react';
import {
  TiaProgramDocument,
  TiaRuntimeState,
  TiaLadderRung,
  TiaLadderContact,
  TiaLadderCoil,
  TiaTag,
  TiaLanguage,
  GemmaMode,
  transpileLadderToScl,
  resolveAddress
} from '../../core/plc/tiaEngine';
import { SimulationMode } from '../../types/simulation';

type LadCategory = 'all' | 'prod' | 'gemma' | 'safety' | 'io';

const GEMMA_STATE_META: Record<string, { label: string; badgeCls: string }> = {
  A1: { label: 'A1 REPOSO', badgeCls: 'bg-slate-100 text-slate-700 border-slate-300' },
  F1: { label: 'F1 PRODUCCIÓN', badgeCls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  A2: { label: 'A2 CICLO A CICLO', badgeCls: 'bg-sky-100 text-sky-800 border-sky-300' },
  F5: { label: 'F5 ETAPA A ETAPA', badgeCls: 'bg-violet-100 text-violet-800 border-violet-300' },
  F4: { label: 'F4 MANUAL', badgeCls: 'bg-amber-100 text-amber-800 border-amber-300' },
  A6: { label: 'A6 REARME', badgeCls: 'bg-orange-100 text-orange-800 border-orange-300' },
  D1: { label: 'D1 EMERGENCIA', badgeCls: 'bg-rose-600 text-white border-rose-700 animate-pulse' }
};

const SAFETY_RE = /PE|emerg|falla|rearme|seguridad|D1|A6|E3[0-2]|FG/i;
const GEMMA_RE = /GEMMA|MAN|CL|ET|conducc|E2[0-7]|A1|F1|F4|F5/i;
const IO_RE = /salida|bobina|valvul|cilindro|TON|temporiz|torreta|Q0|Q1|Q8/i;

function getRungSearchCorpus(rung: TiaLadderRung, tags: TiaTag[]): string {
  const resolveName = (addr: string) => {
    const norm = resolveAddress(addr, tags);
    return tags.find(t => t.address.toUpperCase() === norm)?.name ?? '';
  };
  const parts: string[] = [`nw ${rung.number}`, `segmento ${rung.number}`, rung.comment];
  for (const br of rung.branches) {
    for (const c of br.contacts) {
      parts.push(c.address, resolveName(c.address));
    }
  }
  for (const sc of rung.seriesContacts) {
    parts.push(sc.address, resolveName(sc.address));
  }
  for (const co of rung.coils) {
    parts.push(co.address, resolveName(co.address));
  }
  if (rung.timer) parts.push(rung.timer.name, rung.timer.type);
  if (rung.counter) parts.push(rung.counter.name);
  return parts.join(' ');
}

function matchesLadCategory(rung: TiaLadderRung, category: LadCategory, tags: TiaTag[]): boolean {
  if (category === 'all') return true;
  const corpus = getRungSearchCorpus(rung, tags);
  if (category === 'safety') return SAFETY_RE.test(corpus);
  if (category === 'gemma') return GEMMA_RE.test(corpus);
  if (category === 'io') return Boolean(rung.timer) || IO_RE.test(corpus);
  // 'prod': etapas de producción o segmentos no clasificados exclusivamente en seguridad/gemma/io
  return (
    /producc|estaci|banda|botella|llenado|tapado|cabezal|\bE(?:[0-9]|1[0-8])\b/i.test(corpus) ||
    (!SAFETY_RE.test(corpus) && !GEMMA_RE.test(corpus) && !IO_RE.test(corpus) && !rung.timer)
  );
}

interface Props {
  program: TiaProgramDocument;
  runtime: TiaRuntimeState;
  simulationMode: SimulationMode;
  onChangeProgram: (next: TiaProgramDocument) => void;
  onToggleForceInput: (address: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSetGemmaMode?: (mode: GemmaMode) => void;
  onToggleEmergencyStop?: () => void;
  onTriggerRearm?: () => void;
  onTriggerCyclePulse?: () => void;
  onTriggerStepPulse?: () => void;
}

export const TiaWorkspaceView: React.FC<Props> = ({
  program,
  runtime,
  simulationMode,
  onChangeProgram,
  onToggleForceInput,
  onShowToast,
  onSetGemmaMode,
  onToggleEmergencyStop,
  onTriggerRearm,
  onTriggerCyclePulse,
  onTriggerStepPulse
}) => {
  const [onlineGlasses, setOnlineGlasses] = useState<boolean>(true);
  const [editingTagIdx, setEditingTagIdx] = useState<number | null>(null);
  const [ladSearch, setLadSearch] = useState<string>('');
  const [ladCategory, setLadCategory] = useState<LadCategory>('all');

  const isOnlineActive = onlineGlasses && simulationMode === 'running';
  const gemmaMode: GemmaMode = runtime.gemmaMode || 'AU';
  const gemmaStateMeta =
    GEMMA_STATE_META[runtime.gemmaStateCode || 'A1'] || GEMMA_STATE_META.A1;

  // Entradas DI y Salidas DQ dinámicas desde PLC Tags (máx. 12 compactas)
  const displayedDiTags = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ address: string; name: string }> = [];
    for (const t of program.tags) {
      const addr = t.address.toUpperCase();
      if (addr.startsWith('%I') && !seen.has(addr)) {
        seen.add(addr);
        list.push({ address: addr, name: t.name });
      }
    }
    if (list.length === 0) {
      return ['%I0.0', '%I0.1', '%I0.2', '%I0.3', '%I0.4'].map(a => ({
        address: a,
        name: a
      }));
    }
    return list.slice(0, 12);
  }, [program.tags]);

  const displayedDqTags = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ address: string; name: string }> = [];
    for (const t of program.tags) {
      const addr = t.address.toUpperCase();
      if (addr.startsWith('%Q') && !seen.has(addr)) {
        seen.add(addr);
        list.push({ address: addr, name: t.name });
      }
    }
    if (list.length === 0) {
      return ['%Q0.0', '%Q0.1', '%Q0.2', '%Q0.3'].map(a => ({
        address: a,
        name: a
      }));
    }
    return list.slice(0, 12);
  }, [program.tags]);

  const filteredRungs = useMemo(() => {
    const q = ladSearch.trim().toLowerCase();
    return program.rungs.filter(rung => {
      if (!matchesLadCategory(rung, ladCategory, program.tags)) return false;
      if (!q) return true;
      return getRungSearchCorpus(rung, program.tags).toLowerCase().includes(q);
    });
  }, [program.rungs, program.tags, ladCategory, ladSearch]);

  const setLanguage = (lang: TiaLanguage) => {
    onChangeProgram({ ...program, activeLanguage: lang });
  };

  const getTagLabel = (addr: string): string => {
    const norm = resolveAddress(addr, program.tags);
    const found = program.tags.find(t => t.address.toUpperCase() === norm);
    return found ? found.name : addr;
  };

  // ---------------- Operaciones Tabla de Tags ----------------
  const handleAddTag = () => {
    const nextIdx = program.tags.length;
    const newTag: TiaTag = {
      address: `%M0.${nextIdx % 8}`,
      name: `Variable_${nextIdx + 1}`,
      dataType: 'Bool',
      comment: 'Nueva marca'
    };
    onChangeProgram({ ...program, tags: [...program.tags, newTag] });
  };

  const handleUpdateTag = (idx: number, patch: Partial<TiaTag>) => {
    const nextTags = program.tags.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    onChangeProgram({ ...program, tags: nextTags });
  };

  const handleDeleteTag = (idx: number) => {
    onChangeProgram({ ...program, tags: program.tags.filter((_, i) => i !== idx) });
  };

  // ---------------- Operaciones Editor LAD ----------------
  const updateRung = (rungId: string, updater: (r: TiaLadderRung) => TiaLadderRung) => {
    onChangeProgram({
      ...program,
      rungs: program.rungs.map(r => (r.id === rungId ? updater(r) : r))
    });
  };

  const handleAddRung = () => {
    const n = program.rungs.length + 1;
    const newRung: TiaLadderRung = {
      id: `net_${Date.now()}`,
      number: n,
      comment: `Segmento ${n}`,
      branches: [
        {
          id: `br_${Date.now()}`,
          contacts: [{ id: `c_${Date.now()}`, type: 'NO', address: '%I0.0' }]
        }
      ],
      seriesContacts: [],
      coils: [{ id: `q_${Date.now()}`, type: 'OUT', address: '%Q0.0' }]
    };
    onChangeProgram({ ...program, rungs: [...program.rungs, newRung] });
  };

  const handleDeleteRung = (rungId: string) => {
    const filtered = program.rungs
      .filter(r => r.id !== rungId)
      .map((r, i) => ({ ...r, number: i + 1 }));
    onChangeProgram({ ...program, rungs: filtered });
  };

  const handleCycleContact = (rungId: string, branchId: string | null, contactId: string) => {
    const addrList = program.tags.map(t => t.address);
    const updateContact = (c: TiaLadderContact): TiaLadderContact => {
      if (c.id !== contactId) return c;
      const curIdx = addrList.findIndex(a => a.toUpperCase() === c.address.toUpperCase());
      const nextAddr = addrList[(curIdx + 1) % addrList.length] || '%I0.0';
      return { ...c, address: nextAddr };
    };

    updateRung(rungId, r => ({
      ...r,
      branches: branchId
        ? r.branches.map(b =>
            b.id === branchId ? { ...b, contacts: b.contacts.map(updateContact) } : b
          )
        : r.branches,
      seriesContacts: branchId === null ? r.seriesContacts.map(updateContact) : r.seriesContacts
    }));
  };

  const handleToggleContactType = (rungId: string, branchId: string | null, contactId: string) => {
    const toggle = (c: TiaLadderContact): TiaLadderContact =>
      c.id === contactId ? { ...c, type: c.type === 'NO' ? 'NC' : 'NO' } : c;

    updateRung(rungId, r => ({
      ...r,
      branches: branchId
        ? r.branches.map(b => (b.id === branchId ? { ...b, contacts: b.contacts.map(toggle) } : b))
        : r.branches,
      seriesContacts: branchId === null ? r.seriesContacts.map(toggle) : r.seriesContacts
    }));
  };

  const handleAddBranch = (rungId: string) => {
    updateRung(rungId, r => ({
      ...r,
      branches: [
        ...r.branches,
        {
          id: `br_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          contacts: [{ id: `c_${Date.now()}`, type: 'NO', address: '%Q0.0' }]
        }
      ]
    }));
  };

  const handleAddSeriesContact = (rungId: string) => {
    updateRung(rungId, r => ({
      ...r,
      seriesContacts: [
        ...r.seriesContacts,
        { id: `sc_${Date.now()}`, type: 'NC', address: '%I0.1' }
      ]
    }));
  };

  const handleToggleTimerOnRung = (rungId: string) => {
    updateRung(rungId, r =>
      r.timer
        ? { ...r, timer: undefined }
        : {
            ...r,
            timer: {
              id: `tm_${Date.now()}`,
              name: `TON_${r.number}`,
              type: 'TON',
              presetSeconds: 3
            }
          }
    );
  };

  const handleCycleCoilType = (rungId: string, coilId: string) => {
    const order: Array<TiaLadderCoil['type']> = ['OUT', 'SET', 'RESET'];
    updateRung(rungId, r => ({
      ...r,
      coils: r.coils.map(co => {
        if (co.id !== coilId) return co;
        const nextType = order[(order.indexOf(co.type) + 1) % order.length];
        return { ...co, type: nextType };
      })
    }));
  };

  const handleChangeCoilAddr = (rungId: string, coilId: string, newAddr: string) => {
    updateRung(rungId, r => ({
      ...r,
      coils: r.coils.map(co => (co.id === coilId ? { ...co, address: newAddr } : co))
    }));
  };

  const handleTranspile = () => {
    const generated = transpileLadderToScl(program.rungs, program.tags);
    onChangeProgram({ ...program, sclCode: generated, activeLanguage: 'SCL' });
    onShowToast?.('Diagrama LAD transpilado a SCL IEC 61131-3', 'success');
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-100 select-none">
      {/* BARRA LATERAL IZQUIERDA: CPU S7-1200 + TABLA DE VARIABLES PLC */}
      <aside className="w-80 lg:w-96 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        {/* Tarjeta Hardware S7-1200 en Vivo */}
        <div className="p-3.5 bg-slate-900 text-white border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <div className="text-xs font-bold tracking-wide">SIMATIC S7-1200</div>
                <div className="text-[10px] font-mono text-slate-400">CPU 1214C DC/DC/DC</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold">
              <span
                className={`w-2 h-2 rounded-full ${
                  simulationMode === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={simulationMode === 'running' ? 'text-emerald-300' : 'text-amber-300'}>
                {simulationMode === 'running' ? `RUN (${runtime.scanCount})` : 'STOP'}
              </span>
            </div>
          </div>

          {/* Entradas DI (Clickables para probar sin cablear o forzar señal) */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between">
              <span>Entradas DI ({displayedDiTags.length})</span>
              <span className="text-sky-400">24V DC</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {displayedDiTags.map((tag) => {
                const isHigh = Boolean(runtime.inputs[tag.address]);
                const isForced = Boolean(runtime.forcedInputs[tag.address]);
                return (
                  <button
                    key={tag.address}
                    onClick={() => onToggleForceInput(tag.address)}
                    title={`${tag.name} (${tag.address}) — Clic para forzar`}
                    className={`py-1 px-1 rounded-lg border font-mono text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                      isHigh
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isHigh ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'}`} />
                    <span className="truncate max-w-full">{tag.address.replace('%', '')}</span>
                    {isForced && <span className="text-[8px] text-amber-300">FORZ</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Salidas DQ en vivo */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between">
              <span>Salidas DQ ({displayedDqTags.length})</span>
              <span className="text-emerald-400">PIQ</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {displayedDqTags.map((tag) => {
                const isHigh = Boolean(runtime.outputs[tag.address]);
                return (
                  <div
                    key={tag.address}
                    title={`${tag.name} (${tag.address})`}
                    className={`py-1 px-1 rounded-lg border font-mono text-[10px] font-bold flex flex-col items-center gap-0.5 ${
                      isHigh
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isHigh ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-slate-600'}`} />
                    <span className="truncate max-w-full">{tag.address.replace('%', '')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabla de Variables PLC (PLC Tags) */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-sky-600" />
            <span className="text-xs font-extrabold text-slate-800">Tabla de Variables (PLC Tags)</span>
          </div>
          <button
            onClick={handleAddTag}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Tag</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
          {program.tags.map((tag, idx) => {
            const addr = tag.address.toUpperCase();
            const isActive = addr.startsWith('%I')
              ? runtime.inputs[addr]
              : addr.startsWith('%Q')
                ? runtime.outputs[addr]
                : runtime.memory[addr];

            return (
              <div
                key={`${tag.address}_${idx}`}
                className="px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  {editingTagIdx === idx ? (
                    <div className="flex gap-1">
                      <input
                        value={tag.name}
                        onChange={(e) => handleUpdateTag(idx, { name: e.target.value })}
                        className="w-full px-1.5 py-0.5 text-xs font-semibold border border-sky-400 rounded bg-white"
                      />
                      <input
                        value={tag.address}
                        onChange={(e) => handleUpdateTag(idx, { address: e.target.value.toUpperCase() })}
                        className="w-16 px-1.5 py-0.5 text-xs font-mono border border-sky-400 rounded bg-white"
                      />
                      <button
                        onClick={() => setEditingTagIdx(null)}
                        className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditingTagIdx(idx)}
                      className="cursor-pointer group"
                      title="Clic para editar nombre o dirección"
                    >
                      <div className="font-bold text-slate-800 group-hover:text-sky-700 truncate">
                        {tag.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                        <span className="font-bold text-sky-700">{tag.address}</span>
                        <span>• {tag.dataType}</span>
                        {tag.schematicTag && (
                          <span className="px-1 rounded bg-slate-200/80 text-slate-700">
                            {tag.schematicTag}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isActive ? 'TRUE' : 'FALSE'}
                  </span>
                  <button
                    onClick={() => handleDeleteTag(idx)}
                    className="p-1 text-slate-300 hover:text-rose-500 cursor-pointer"
                    title="Eliminar variable"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ZONA CENTRAL: EDITOR TIA PORTAL (LAD / SCL / GRAFCET) */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Sub-barra del editor TIA */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-800 mr-1">
              OB1 [{program.blockName}]
            </span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setLanguage('LAD')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  program.activeLanguage === 'LAD'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>LAD (Escalera)</span>
              </button>
              <button
                onClick={() => setLanguage('SCL')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  program.activeLanguage === 'SCL'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>SCL (Texto)</span>
              </button>
              <button
                onClick={() => setLanguage('GRAFCET')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  program.activeLanguage === 'GRAFCET'
                    ? 'bg-white text-violet-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>GRAFCET</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {program.activeLanguage === 'LAD' && (
              <button
                onClick={handleTranspile}
                title="Convierte tu diagrama Ladder actual a código SCL profesional"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transpilar LAD → SCL</span>
              </button>
            )}

            <button
              onClick={() => setOnlineGlasses(!onlineGlasses)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                onlineGlasses
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Gafas Online {onlineGlasses ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* CONSOLA OPERADOR GEMMA (AU / CL / ET / MAN / PE / Rearme / Pulsos) */}
        <div className="px-4 py-2 bg-slate-900 text-slate-100 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-extrabold ${gemmaStateMeta.badgeCls}`}
              title="Estado GEMMA activo en el PLC"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{gemmaStateMeta.label}</span>
            </span>

            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              {(
                [
                  { id: 'AU', label: 'AU' },
                  { id: 'CL', label: 'CL (Ciclo)' },
                  { id: 'ET', label: 'ET (Etapa)' },
                  { id: 'MAN', label: 'MAN (Manual)' }
                ] as const
              ).map((m) => {
                const active = gemmaMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSetGemmaMode?.(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-sky-500 text-white shadow-2xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/70'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTriggerCyclePulse?.()}
              title="Enviar pulso de +1 Ciclo (I_Dcy / %I8.1)"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>+1 Ciclo (Dcy)</span>
            </button>

            <button
              type="button"
              onClick={() => onTriggerStepPulse?.()}
              title="Avanzar +1 Etapa en modo ET (I_Bp / %I8.2)"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-400/40 transition-colors cursor-pointer"
            >
              <SkipForward className="w-3 h-3" />
              <span>+1 Etapa (Bp)</span>
            </button>

            <button
              type="button"
              onClick={() => onTriggerRearm?.()}
              title="Rearme de seguridades y retorno a reposo inicial (GEMMA A6)"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-400/50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Rearme (A6)</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleEmergencyStop?.()}
              title="Parada de Emergencia con enclavamiento (GEMMA D1)"
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer ${
                runtime.emergencyStop
                  ? 'bg-rose-600 text-white border-rose-300 shadow-[0_0_12px_rgba(225,29,72,0.7)] animate-pulse'
                  : 'bg-rose-950/70 hover:bg-rose-700 text-rose-200 border-rose-500/60'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>PE — Emergencia (D1)</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO SEGÚN LENGUAJE */}
        {program.activeLanguage === 'LAD' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {program.rungs.length > 6 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-extrabold">
                    {program.rungs.length} Networks
                  </span>
                  {(ladSearch.trim() !== '' || ladCategory !== 'all') && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Mostrando {filteredRungs.length} de {program.rungs.length}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                  {(
                    [
                      { id: 'all', label: `Todos (${program.rungs.length})` },
                      { id: 'prod', label: 'Producción' },
                      { id: 'gemma', label: 'GEMMA / Modos' },
                      { id: 'safety', label: 'Seguridad / PE' },
                      { id: 'io', label: 'Salidas / TON' }
                    ] as const
                  ).map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setLadCategory(pill.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        ladCategory === pill.id
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={ladSearch}
                    onChange={(e) => setLadSearch(e.target.value)}
                    placeholder="Buscar NW, variable o dirección..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:border-sky-400"
                  />
                  {ladSearch && (
                    <button
                      type="button"
                      onClick={() => setLadSearch('')}
                      title="Limpiar búsqueda"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {program.rungs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
                <div className="text-sm font-bold text-slate-700">
                  Proyecto Ladder vacío — haz clic en «Añadir Nuevo Segmento (Network LAD)» o abre un ejemplo.
                </div>
                <div className="text-xs text-slate-500">
                  Crea redes de contactos, ramas OR en paralelo y temporizadores IEC TON/TOF.
                </div>
              </div>
            ) : filteredRungs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                <div className="text-sm font-bold text-slate-700">
                  No se encontraron segmentos para el filtro actual
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLadSearch('');
                    setLadCategory('all');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold border border-sky-200 cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              filteredRungs.map((rung) => {
              const rungActive = isOnlineActive && Boolean(runtime.rungPowerFlow[rung.id]);
              const hasMultiBranch = rung.branches.length > 1;
              const anyBranchActive =
                isOnlineActive &&
                (rung.branches.length === 0 ||
                  rung.branches.some(
                    (br) =>
                      br.contacts.length > 0 &&
                      br.contacts.every((ct) => Boolean(runtime.elementPowerFlow[ct.id]))
                  ));
              return (
                <div
                  key={rung.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
                >
                  {/* Encabezado de Network */}
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 font-mono text-[11px] font-extrabold">
                        Segmento {rung.number}
                      </span>
                      <input
                        type="text"
                        value={rung.comment}
                        onChange={(e) => updateRung(rung.id, r => ({ ...r, comment: e.target.value }))}
                        className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-700 focus:bg-white focus:px-2 rounded focus:outline-none border border-transparent focus:border-sky-300"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleAddBranch(rung.id)}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 cursor-pointer"
                      >
                        + Rama OR
                      </button>
                      <button
                        onClick={() => handleAddSeriesContact(rung.id)}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 cursor-pointer"
                      >
                        + Contacto
                      </button>
                      <button
                        onClick={() => handleToggleTimerOnRung(rung.id)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          rung.timer
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {rung.timer ? 'Quitar TON' : '+ Timer TON'}
                      </button>
                      <button
                        onClick={() => handleDeleteRung(rung.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Eliminar segmento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Lienzo Visual LAD con Gafas Online */}
                  <div className="p-4 overflow-x-auto">
                    <div className="flex items-center min-w-[600px]">
                      {/* Power Rail Izquierdo */}
                      <div
                        className={`w-1.5 self-stretch rounded-full shrink-0 mr-0 ${
                          isOnlineActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-800'
                        }`}
                      />

                      {/* Ramas paralelas OR con barra colectora derecha continua */}
                      {rung.branches.length > 0 ? (
                        <div className="flex flex-col shrink-0">
                          {rung.branches.map((br, idx) => {
                            const lastContact = br.contacts[br.contacts.length - 1];
                            const lastCtOn =
                              lastContact && isOnlineActive && Boolean(runtime.elementPowerFlow[lastContact.id]);
                            return (
                              <div key={br.id} className="relative flex items-center py-1.5">
                                {/* Cable horizontal desde el Power Rail izquierdo */}
                                <div
                                  className={`h-0.5 w-5 shrink-0 ${
                                    isOnlineActive ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`}
                                />
                                {br.contacts.map((ct, cIdx) => {
                                  const ctOn = isOnlineActive && Boolean(runtime.elementPowerFlow[ct.id]);
                                  const lineCls = isOnlineActive
                                    ? ctOn
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                      : 'border-sky-400 border-dashed bg-sky-50/40 text-sky-800'
                                    : 'border-slate-300 bg-white text-slate-800';
                                  const isLastInBranch = cIdx === br.contacts.length - 1;
                                  return (
                                    <React.Fragment key={ct.id}>
                                      <div
                                        className={`px-3 py-1.5 rounded-xl border-2 text-center shadow-2xs transition-all shrink-0 ${lineCls}`}
                                      >
                                        <div className="text-[10px] font-bold truncate max-w-[110px]">
                                          {getTagLabel(ct.address)}
                                        </div>
                                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                                          <button
                                            onClick={() => handleToggleContactType(rung.id, br.id, ct.id)}
                                            className="font-mono text-xs font-extrabold px-1.5 py-0.2 rounded bg-slate-900/5 hover:bg-slate-900/10 cursor-pointer"
                                            title="Clic para alternar NO / NC"
                                          >
                                            {ct.type === 'NC' ? '--|/|-' : '--| |--'}
                                          </button>
                                          <button
                                            onClick={() => handleCycleContact(rung.id, br.id, ct.id)}
                                            className="font-mono text-[10px] font-bold text-sky-700 hover:underline cursor-pointer"
                                            title="Clic para cambiar variable"
                                          >
                                            {ct.address}
                                          </button>
                                        </div>
                                      </div>
                                      {!isLastInBranch && (
                                        <div
                                          className={`h-0.5 w-5 shrink-0 ${
                                            isOnlineActive
                                              ? ctOn
                                                ? 'bg-emerald-500'
                                                : 'bg-sky-400'
                                              : 'bg-slate-400'
                                          }`}
                                        />
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                                {/* Cable extensible hasta la barra colectora derecha */}
                                <div
                                  className={`flex-1 min-w-[20px] h-0.5 ${
                                    isOnlineActive
                                      ? br.contacts.length === 0 || lastCtOn
                                        ? 'bg-emerald-500'
                                        : 'bg-sky-400'
                                      : 'bg-slate-400'
                                  }`}
                                />
                                {/* Barra colectora vertical OR derecha continua sin huecos */}
                                {hasMultiBranch && (
                                  <div className="relative w-0.5 self-stretch shrink-0">
                                    <div
                                      className={`absolute left-0 right-0 ${
                                        idx === 0
                                          ? 'top-[calc(50%-1px)] -bottom-1.5'
                                          : idx === rung.branches.length - 1
                                            ? '-top-1.5 bottom-[calc(50%-1px)]'
                                            : '-inset-y-1.5'
                                      } ${anyBranchActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {/* Cable colector de salida hacia contactos en serie / bobinas */}
                      <div
                        className={`h-0.5 w-5 shrink-0 ${
                          isOnlineActive
                            ? anyBranchActive
                              ? 'bg-emerald-500'
                              : 'bg-sky-400'
                            : 'bg-slate-400'
                        }`}
                      />

                      {/* Contactos en serie */}
                      {rung.seriesContacts.map((sc) => {
                        const scOn = isOnlineActive && Boolean(runtime.elementPowerFlow[sc.id]);
                        const lineCls = isOnlineActive
                          ? scOn
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'border-sky-400 border-dashed bg-sky-50/40 text-sky-800'
                          : 'border-slate-300 bg-white text-slate-800';
                        return (
                          <div key={sc.id} className="flex items-center shrink-0">
                            <div className={`px-3 py-1.5 rounded-xl border-2 text-center shadow-2xs ${lineCls}`}>
                              <div className="text-[10px] font-bold truncate max-w-[110px]">
                                {getTagLabel(sc.address)}
                              </div>
                              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                                <button
                                  onClick={() => handleToggleContactType(rung.id, null, sc.id)}
                                  className="font-mono text-xs font-extrabold px-1.5 rounded bg-slate-900/5 hover:bg-slate-900/10 cursor-pointer"
                                >
                                  {sc.type === 'NC' ? '--|/|-' : '--| |--'}
                                </button>
                                <button
                                  onClick={() => handleCycleContact(rung.id, null, sc.id)}
                                  className="font-mono text-[10px] font-bold text-sky-700 hover:underline cursor-pointer"
                                >
                                  {sc.address}
                                </button>
                              </div>
                            </div>
                            <div
                              className={`h-0.5 w-5 shrink-0 ${
                                isOnlineActive
                                  ? scOn
                                    ? 'bg-emerald-500'
                                    : 'bg-sky-400'
                                  : 'bg-slate-400'
                              }`}
                            />
                          </div>
                        );
                      })}

                      {/* Bloque Temporizador IEC TON/TOF */}
                      {rung.timer && (() => {
                        const tmRt = runtime.timers[rung.timer.name];
                        const tmOn = isOnlineActive && Boolean(tmRt?.q);
                        return (
                          <div className="flex items-center">
                            <div
                              className={`px-3 py-2 rounded-xl border-2 text-center min-w-[115px] ${
                                tmOn
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-blue-400 bg-blue-50/50'
                              }`}
                            >
                              <div className="text-[10px] font-extrabold text-blue-800">
                                {rung.timer.type} [{rung.timer.name}]
                              </div>
                              <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-mono">
                                <span>PT:</span>
                                <input
                                  type="number"
                                  min={0.5}
                                  step={0.5}
                                  value={rung.timer.presetSeconds}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 1;
                                    updateRung(rung.id, r => ({
                                      ...r,
                                      timer: r.timer ? { ...r.timer, presetSeconds: val } : undefined
                                    }));
                                  }}
                                  className="w-12 px-1 py-0.2 bg-white border border-blue-200 rounded text-center font-bold"
                                />
                                <span>s</span>
                              </div>
                              {isOnlineActive && tmRt && (
                                <div className="text-[10px] font-mono font-bold text-emerald-700 mt-0.5">
                                  ET: {tmRt.et.toFixed(1)}s
                                </div>
                              )}
                            </div>
                            <div className={`h-0.5 w-6 ${tmOn ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          </div>
                        );
                      })()}

                      {/* Línea flexible hasta bobinas */}
                      <div
                        className={`flex-1 h-0.5 min-w-[24px] ${
                          rungActive ? 'bg-emerald-500' : isOnlineActive ? 'bg-sky-400' : 'bg-slate-300'
                        }`}
                      />

                      {/* Bobinas finales */}
                      <div className="flex flex-col gap-2">
                        {rung.coils.map((coil) => {
                          const coilOn = isOnlineActive && Boolean(runtime.elementPowerFlow[coil.id]);
                          return (
                            <div
                              key={coil.id}
                              className={`px-3 py-1.5 rounded-xl border-2 text-center min-w-[130px] ${
                                coilOn
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                                  : 'border-slate-300 bg-white text-slate-800'
                              }`}
                            >
                              <div className="text-[10px] font-bold truncate">{getTagLabel(coil.address)}</div>
                              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                                <button
                                  onClick={() => handleCycleCoilType(rung.id, coil.id)}
                                  className="font-mono text-xs font-extrabold px-1.5 rounded bg-slate-900/5 hover:bg-slate-900/10 cursor-pointer"
                                  title="Clic para cambiar OUT / SET / RESET"
                                >
                                  {coil.type === 'SET' ? '( S )' : coil.type === 'RESET' ? '( R )' : '(   )'}
                                </button>
                                <select
                                  value={coil.address}
                                  onChange={(e) => handleChangeCoilAddr(rung.id, coil.id, e.target.value)}
                                  className="font-mono text-[10px] font-bold text-sky-700 bg-transparent focus:outline-none cursor-pointer"
                                >
                                  {program.tags
                                    .filter(t => t.address.startsWith('%Q') || t.address.startsWith('%M'))
                                    .map(t => (
                                      <option key={t.address} value={t.address}>
                                        {t.address}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }))}

            <button
              onClick={handleAddRung}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-sky-400 bg-white/60 hover:bg-sky-50/50 text-xs font-bold text-slate-600 hover:text-sky-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Nuevo Segmento (Network LAD)</span>
            </button>
          </div>
        )}

        {program.activeLanguage === 'SCL' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Editor SCL */}
            <div className="flex-1 flex flex-col bg-[#0f172a] text-slate-100 overflow-hidden">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                    Plantillas rápidas:
                  </span>
                  <button
                    onClick={() =>
                      onChangeProgram({
                        ...program,
                        sclCode: `${program.sclCode}\nIF "Boton_Marcha" THEN\n    "Contactor_KM1" := TRUE;\nEND_IF;\n`
                      })
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-sky-300 cursor-pointer"
                  >
                    + IF / THEN
                  </button>
                  <button
                    onClick={() =>
                      onChangeProgram({
                        ...program,
                        sclCode: `${program.sclCode}\n"TON_1"(IN := "Contactor_KM1", PT := T#3s);\n"Ciclo_Activo" := "TON_1".Q;\n`
                      })
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-emerald-300 cursor-pointer"
                  >
                    + TON Timer
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono">
                  {runtime.sclErrors.length === 0 ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Compilación OK (0 errores)</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{runtime.sclErrors.length} error(es) de sintaxis</span>
                    </span>
                  )}
                </div>
              </div>

              <textarea
                value={program.sclCode}
                onChange={(e) => onChangeProgram({ ...program, sclCode: e.target.value })}
                spellCheck={false}
                className="flex-1 w-full p-4 bg-[#0b1120] text-slate-100 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none resize-none select-text"
              />

              {runtime.sclErrors.length > 0 && (
                <div className="px-4 py-2 bg-rose-950/90 border-t border-rose-800 text-rose-200 text-xs font-mono space-y-0.5 max-h-24 overflow-y-auto">
                  {runtime.sclErrors.map((err, i) => (
                    <div key={i}>
                      Línea {err.line}: {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Columna Online Watch (Gafas Online en SCL) */}
            {onlineGlasses && (
              <div className="w-64 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-extrabold text-slate-800">Monitor Watch SCL</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono">
                  {Object.keys(runtime.sclWatch).length === 0 ? (
                    <div className="text-slate-400 text-[11px] font-sans">
                      Pulsa <strong>Iniciar simulación</strong> para observar valores SCL en tiempo real.
                    </div>
                  ) : (
                    Object.entries(runtime.sclWatch).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <span className="truncate font-semibold text-slate-700">{k}</span>
                        <span
                          className={`font-bold ${
                            v.startsWith('TRUE') ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {v}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {program.activeLanguage === 'GRAFCET' && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-4">
            {program.grafcetSteps.length > 10 ? (
              <div className="w-full max-w-6xl space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Control Secuencial GRAFCET GEMMA ({program.grafcetSteps.length} Etapas)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Vista estructurada por jerarquía GEMMA: Producción, Conducción y Seguridad.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Activas: {runtime.activeSteps.map(id => `E${id}`).join(', ') || 'Ninguna'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                  {[
                    {
                      key: 'prod',
                      title: 'Producción (E0–E18)',
                      accent: 'border-sky-200 bg-sky-50/70 text-sky-900',
                      steps: program.grafcetSteps.filter(s => s.id <= 19)
                    },
                    {
                      key: 'gemma',
                      title: 'GEMMA / Conducción (E20–E29)',
                      accent: 'border-violet-200 bg-violet-50/70 text-violet-900',
                      steps: program.grafcetSteps.filter(s => s.id >= 20 && s.id <= 29)
                    },
                    {
                      key: 'safety',
                      title: 'Seguridad / Emergencia (E30+)',
                      accent: 'border-rose-200 bg-rose-50/70 text-rose-900',
                      steps: program.grafcetSteps.filter(s => s.id >= 30)
                    }
                  ].map((group) => (
                    <div
                      key={group.key}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
                    >
                      <div className={`px-4 py-2.5 border-b font-extrabold text-xs flex items-center justify-between ${group.accent}`}>
                        <span>{group.title}</span>
                        <span className="font-mono text-[11px] opacity-80">{group.steps.length}</span>
                      </div>

                      <div className="p-3 space-y-2.5">
                        {group.steps.map((step) => {
                          const isActive = simulationMode === 'running' && runtime.activeSteps.includes(step.id);
                          const isEmergencyStep = step.id === 32 && runtime.emergencyStop;
                          const outTransitions = program.grafcetTransitions.filter(
                            tr => tr.fromStep === step.id
                          );
                          return (
                            <div
                              key={step.id}
                              className={`p-2.5 rounded-xl border transition-all space-y-2 ${
                                isEmergencyStep
                                  ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-sm'
                                  : isActive
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                                    : 'border-slate-200 bg-slate-50/70 text-slate-700'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={`w-12 h-12 shrink-0 rounded-xl border-2 flex flex-col items-center justify-center font-mono font-extrabold ${
                                    isEmergencyStep
                                      ? 'border-rose-600 bg-rose-600 text-white'
                                      : isActive
                                        ? 'border-emerald-500 bg-white text-emerald-700'
                                        : 'border-slate-700 bg-white text-slate-800'
                                  } ${step.isInitial ? 'ring-2 ring-offset-1 ring-slate-700' : ''}`}
                                >
                                  <span className="text-sm leading-none">{step.id}</span>
                                  <span className="text-[8px] uppercase truncate max-w-[44px] mt-0.5">
                                    {step.name}
                                  </span>
                                </div>

                                <div className="min-w-0 flex-1 text-xs">
                                  <div className="font-bold leading-snug">{step.actionLabel}</div>
                                  {step.actionTag && (
                                    <div className="font-mono text-[10px] text-sky-700 font-bold mt-0.5">
                                      Salida: {step.actionTag}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {outTransitions.length > 0 && (
                                <div className="pt-1.5 border-t border-slate-200/80 space-y-1">
                                  {outTransitions.map((tr) => (
                                    <div
                                      key={tr.id}
                                      className="px-2 py-0.5 rounded-md bg-white/90 border border-slate-200 font-mono text-[10px] text-slate-600 flex items-center justify-between gap-2"
                                    >
                                      <span className="truncate font-semibold">{tr.label} ({tr.condition})</span>
                                      <span className="shrink-0 font-extrabold text-sky-700">→ E{tr.toStep}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : program.grafcetSteps.length <= 1 && program.grafcetTransitions.length === 0 ? (
              <div className="max-w-xl w-full bg-white rounded-2xl border border-dashed border-slate-300 p-8 shadow-2xs text-center space-y-3">
                <div className="text-sm font-extrabold text-slate-800">
                  Secuencia GRAFCET vacía (IEC 60848)
                </div>
                <p className="text-xs text-slate-500">
                  Importa un esquema <span className="font-mono font-bold">.cad</span> con GRAFCET o abre un ejemplo para visualizar etapas, acciones y transiciones en tiempo real.
                </p>
                {program.grafcetSteps[0] && (
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="px-2 py-0.5 rounded-lg border-2 border-slate-700 bg-white font-mono font-extrabold text-slate-800">
                      {program.grafcetSteps[0].name}
                    </span>
                    <span className="font-semibold text-slate-600">
                      {program.grafcetSteps[0].actionLabel || 'Etapa inicial lista'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Control Secuencial GRAFCET (IEC 60848)</h4>
                    <p className="text-xs text-slate-500">
                      Las etapas activas ejecutan automáticamente sus acciones sobre el PLC S7-1200.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                  {program.grafcetSteps.map((step, i) => {
                    const isActive = simulationMode === 'running' && runtime.activeSteps.includes(step.id);
                    const tr = program.grafcetTransitions[i];
                    return (
                      <React.Fragment key={step.id}>
                        <div className="flex items-center gap-4 w-full justify-center">
                          <div
                            className={`w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center font-mono font-extrabold transition-all ${
                              isActive
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md scale-105'
                                : 'border-slate-700 bg-white text-slate-800'
                            } ${step.isInitial ? 'ring-2 ring-offset-2 ring-slate-700' : ''}`}
                          >
                            <span className="text-base">{step.id}</span>
                            <span className="text-[9px] uppercase">{step.name}</span>
                          </div>

                          <div className="w-6 h-0.5 bg-slate-400" />

                          <div
                            className={`flex-1 max-w-xs px-3 py-2 rounded-xl border text-xs ${
                              isActive ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="font-bold">{step.actionLabel}</div>
                            {step.actionTag && (
                              <div className="font-mono text-[10px] text-sky-700 font-bold">
                                Salida: {step.actionTag}
                              </div>
                            )}
                          </div>
                        </div>

                        {tr && (
                          <div className="flex flex-col items-center my-1">
                            <div className="w-0.5 h-3 bg-slate-400" />
                            <div className="px-3 py-1 rounded-full bg-slate-100 border border-slate-300 font-mono text-[11px] font-bold text-slate-700">
                              ── {tr.label} ({tr.condition})
                            </div>
                            <div className="w-0.5 h-3 bg-slate-400" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
