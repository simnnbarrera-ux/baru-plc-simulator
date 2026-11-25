import React, { useState } from 'react';
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
  Tag
} from 'lucide-react';
import {
  TiaProgramDocument,
  TiaRuntimeState,
  TiaLadderRung,
  TiaLadderContact,
  TiaLadderCoil,
  TiaTag,
  TiaLanguage,
  transpileLadderToScl,
  resolveAddress
} from '../../core/plc/tiaEngine';
import { SimulationMode } from '../../types/simulation';

interface Props {
  program: TiaProgramDocument;
  runtime: TiaRuntimeState;
  simulationMode: SimulationMode;
  onChangeProgram: (next: TiaProgramDocument) => void;
  onToggleForceInput: (address: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TiaWorkspaceView: React.FC<Props> = ({
  program,
  runtime,
  simulationMode,
  onChangeProgram,
  onToggleForceInput,
  onShowToast
}) => {
  const [onlineGlasses, setOnlineGlasses] = useState<boolean>(true);
  const [editingTagIdx, setEditingTagIdx] = useState<number | null>(null);

  const isOnlineActive = onlineGlasses && simulationMode === 'running';

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
              <span>Entradas DI (Clic para simular/forzar)</span>
              <span className="text-sky-400">24V DC</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {['%I0.0', '%I0.1', '%I0.2', '%I0.3', '%I0.4'].map((addr, idx) => {
                const isHigh = Boolean(runtime.inputs[addr]);
                const isForced = Boolean(runtime.forcedInputs[addr]);
                return (
                  <button
                    key={addr}
                    onClick={() => onToggleForceInput(addr)}
                    title={`Forzar entrada ${addr} (${getTagLabel(addr)})`}
                    className={`py-1.5 rounded-lg border font-mono text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                      isHigh
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isHigh ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'}`} />
                    <span>{`I0.${idx}`}</span>
                    {isForced && <span className="text-[8px] text-amber-300">FORZ</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Salidas DQ en vivo */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex justify-between">
              <span>Salidas DQ (Relé en vivo)</span>
              <span className="text-emerald-400">PIQ</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {['%Q0.0', '%Q0.1', '%Q0.2', '%Q0.3'].map((addr, idx) => {
                const isHigh = Boolean(runtime.outputs[addr]);
                return (
                  <div
                    key={addr}
                    className={`py-1.5 rounded-lg border font-mono text-[10px] font-bold flex flex-col items-center gap-0.5 ${
                      isHigh
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isHigh ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-slate-600'}`} />
                    <span>{`Q0.${idx}`}</span>
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

        {/* CONTENIDO SEGÚN LENGUAJE */}
        {program.activeLanguage === 'LAD' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {program.rungs.map((rung) => {
              const rungActive = isOnlineActive && Boolean(runtime.rungPowerFlow[rung.id]);
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
                        className={`w-1.5 self-stretch rounded-full mr-3 ${
                          isOnlineActive ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-800'
                        }`}
                      />

                      {/* Ramas paralelas OR */}
                      <div className="flex flex-col gap-3 py-1">
                        {rung.branches.map((br) => (
                          <div key={br.id} className="flex items-center">
                            <div
                              className={`h-0.5 w-6 ${
                                isOnlineActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {br.contacts.map((ct) => {
                              const ctOn = isOnlineActive && Boolean(runtime.elementPowerFlow[ct.id]);
                              const lineCls = isOnlineActive
                                ? ctOn
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                  : 'border-sky-400 border-dashed bg-sky-50/40 text-sky-800'
                                : 'border-slate-300 bg-white text-slate-800';
                              return (
                                <div key={ct.id} className="flex items-center">
                                  <div
                                    className={`px-3 py-1.5 rounded-xl border-2 text-center shadow-2xs transition-all ${lineCls}`}
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
                                  <div
                                    className={`h-0.5 w-6 ${
                                      isOnlineActive
                                        ? ctOn
                                          ? 'bg-emerald-500'
                                          : 'bg-sky-400'
                                        : 'bg-slate-400'
                                    }`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      {/* Contactos en serie */}
                      {rung.seriesContacts.map((sc) => {
                        const scOn = isOnlineActive && Boolean(runtime.elementPowerFlow[sc.id]);
                        const lineCls = isOnlineActive
                          ? scOn
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                            : 'border-sky-400 border-dashed bg-sky-50/40 text-sky-800'
                          : 'border-slate-300 bg-white text-slate-800';
                        return (
                          <div key={sc.id} className="flex items-center">
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
                              className={`h-0.5 w-6 ${
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
            })}

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
          </div>
        )}
      </main>
    </div>
  );
};
