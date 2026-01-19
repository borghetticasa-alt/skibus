'use client';

import React, { useMemo, useState, use as usePromise } from 'react';
import { TripLayout, TripStatus, SlaLevel } from '../../../../../components/admin/TripLayout';
import {
  Bus as BusIcon,
  Plus,
  ArrowUpCircle,
  Lock,
  CheckCircle2,
  Settings2,
  AlertCircle,
  ShieldAlert,
  Trash2,
  X,
  TrendingUp,
} from 'lucide-react';

type Params = { id: string };

function isThenable<T = unknown>(v: unknown): v is Promise<T> {
  return !!v && (typeof v === 'object' || typeof v === 'function') && typeof (v as any).then === 'function';
}

interface BusRunDTO {
  id: string;
  type: 'COACH' | 'MIDIBUS';
  status: TripStatus;
  capacity: number;
  sold: number;
  cost: number;
  breakEvenSeats: number;
  estMargin: number;
  slaDeadlineLabel?: string;
}

const BUSES_MOCK: BusRunDTO[] = [
  {
    id: 'BUS-MR-01',
    type: 'COACH',
    status: 'SOFT_HOLD',
    capacity: 52,
    sold: 42,
    cost: 850,
    breakEvenSeats: 45,
    estMargin: -120,
    slaDeadlineLabel: 'Scade tra 14h 20m',
  },
  {
    id: 'BUS-MR-02',
    type: 'MIDIBUS',
    status: 'CONFIRMED',
    capacity: 20,
    sold: 20,
    cost: 450,
    breakEvenSeats: 12,
    estMargin: 380,
  },
];

const statusStyles: Record<TripStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SOFT_HOLD: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  LOCKED: 'bg-violet-100 text-violet-700',
  FULL: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-slate-800 text-slate-200',
};

type ActionType = 'CONFIRM' | 'LOCK' | 'OVERRIDE' | 'REMOVE' | 'UPGRADE' | 'ADD_COACH' | 'ADD_MIDIBUS';

export default function BusesPage({ params }: { params: Params | Promise<Params> }) {
  // ✅ Next 16: params può arrivare come Promise -> unwrap sicuro
  const resolvedParams = isThenable<Params>(params) ? usePromise(params) : params;
  const tripId = resolvedParams.id;

  const [buses] = useState<BusRunDTO[]>(BUSES_MOCK);
  const [activeModal, setActiveModal] = useState<{ type: ActionType; bus?: BusRunDTO } | null>(null);
  const [note, setNote] = useState('');
  const [overrideValue, setOverrideValue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const tripSummary = {
    destinationName: 'Gressoney-La-Trinité',
    departureLabel: '18 Gen 2026 • Milano Lampugnano',
    status: 'SOFT_HOLD' as TripStatus,
    sla: { level: 'YELLOW' as SlaLevel, label: 'Rischio SLA', deadlineLabel: 'Scade tra 14h 20m' },
  };

  const hasMidibus = useMemo(() => buses.some((b) => b.type === 'MIDIBUS'), [buses]);

  const handleBusAction = async () => {
    if (note.trim().length < 10) return;

    if (activeModal?.type === 'OVERRIDE' && activeModal.bus) {
      if (overrideValue < activeModal.bus.sold) {
        setError(
          `Violazione Guardrail: La capacità (${overrideValue}) non può essere inferiore ai posti venduti (${activeModal.bus.sold}).`
        );
        return;
      }
    }

    // Stub log (poi qui attacchiamo API)
    console.log(`[OPERATIONS LOG] Executing ${activeModal?.type} on ${activeModal?.bus?.id || 'NEW_UNIT'}`);
    console.log(`[AUDIT NOTE] ${note}`);

    setActiveModal(null);
    setNote('');
    setError(null);
  };

  return (
    <TripLayout id={tripId} activeTab="buses" tripSummary={tripSummary}>
      <div className="space-y-6">
        {/* Fleet Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Gestione Flotta Operativa</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1">
              Configurazione Mezzi Monte Rosa Bus
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasMidibus && (
              <button
                onClick={() =>
                  setActiveModal({ type: 'UPGRADE', bus: buses.find((b) => b.type === 'MIDIBUS') })
                }
                className="flex items-center gap-2 bg-amber-50 text-amber-600 px-5 py-2.5 rounded-2xl font-black text-xs hover:bg-amber-100 transition-all border border-amber-200/50"
              >
                <ArrowUpCircle size={14} /> Upgrade Flotta
              </button>
            )}
            <button
              onClick={() => setActiveModal({ type: 'ADD_MIDIBUS' })}
              className="flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-2.5 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all border border-slate-200/50"
            >
              <Plus size={14} /> Midibus
            </button>
            <button
              onClick={() => setActiveModal({ type: 'ADD_COACH' })}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Plus size={14} /> Coach
            </button>
          </div>
        </div>

        {/* Bus Inventory */}
        <div className="grid gap-6">
          {buses.map((bus) => (
            <div
              key={bus.id}
              className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md relative group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                {/* Visual Identity */}
                <div className="flex items-center gap-6">
                  <div
                    className={`w-20 h-20 rounded-[28px] flex items-center justify-center transition-colors ${
                      bus.type === 'COACH' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <BusIcon size={36} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black tracking-tighter text-slate-900">{bus.id}</h3>
                      <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase tracking-widest ${statusStyles[bus.status]}`}>
                        {bus.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                        <ArrowUpCircle size={14} /> {bus.type}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                        <TrendingUp size={14} /> Costo: €{bus.cost}
                      </div>
                      {bus.slaDeadlineLabel && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 uppercase bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 animate-pulse">
                          <AlertCircle size={12} /> {bus.slaDeadlineLabel}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logistics Metrics */}
                <div className="flex items-center gap-12 flex-1 max-w-xl">
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Occupancy</span>
                      <span className="text-sm font-black text-slate-700">
                        {bus.sold} / {bus.capacity} pax
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                      <div
                        className={`h-full transition-all duration-1000 ease-out ${
                          bus.sold >= bus.capacity ? 'bg-rose-500' : bus.sold >= bus.breakEvenSeats ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min((bus.sold / bus.capacity) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        BEP: {bus.breakEvenSeats} pax
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${bus.sold >= bus.breakEvenSeats ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {bus.sold >= bus.breakEvenSeats ? 'Break-even raggiunto' : `-${bus.breakEvenSeats - bus.sold} al BEP`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <span className="text-[10px] font-black text-slate-300 uppercase block mb-1">Margine Est.</span>
                    <span className={`text-xl font-black tracking-tight ${bus.estMargin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {bus.estMargin >= 0 ? '+' : ''}€{bus.estMargin}
                    </span>
                  </div>
                </div>

                {/* Operations Actions */}
                <div className="grid grid-cols-2 sm:flex items-center gap-2 pt-6 lg:pt-0 border-t lg:border-t-0 border-slate-50">
                  {bus.status === 'SOFT_HOLD' && (
                    <ActionButton
                      icon={<CheckCircle2 size={14} />}
                      label="Conferma"
                      variant="success"
                      onClick={() => setActiveModal({ type: 'CONFIRM', bus })}
                    />
                  )}
                  {bus.status === 'CONFIRMED' && (
                    <ActionButton
                      icon={<Lock size={14} />}
                      label="Lock"
                      onClick={() => setActiveModal({ type: 'LOCK', bus })}
                    />
                  )}
                  <ActionButton
                    icon={<Settings2 size={14} />}
                    label="Override"
                    onClick={() => {
                      setActiveModal({ type: 'OVERRIDE', bus });
                      setOverrideValue(bus.capacity);
                    }}
                  />
                  {bus.sold === 0 && (
                    <ActionButton
                      icon={<Trash2 size={14} />}
                      label="Rimuovi"
                      variant="danger"
                      onClick={() => setActiveModal({ type: 'REMOVE', bus })}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operations Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] shadow-2xl max-w-lg w-full p-12 animate-in slide-in-from-bottom-8 duration-500 relative overflow-hidden">
            <button
              onClick={() => {
                setActiveModal(null);
                setError(null);
              }}
              className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors p-2 hover:bg-slate-50 rounded-full"
            >
              <X size={24} />
            </button>

            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 ${
                activeModal.type === 'OVERRIDE' || activeModal.type === 'REMOVE'
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {activeModal.type === 'OVERRIDE' ? (
                <Settings2 size={40} />
              ) : activeModal.type === 'REMOVE' ? (
                <Trash2 size={40} />
              ) : (
                <ShieldAlert size={40} />
              )}
            </div>

            <div className="mb-8">
              <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">
                {activeModal.type === 'CONFIRM'
                  ? 'Conferma Mezzo'
                  : activeModal.type === 'LOCK'
                  ? 'Lock Logistico'
                  : activeModal.type === 'OVERRIDE'
                  ? 'Override Capacità'
                  : activeModal.type === 'REMOVE'
                  ? 'Rimozione Mezzo'
                  : activeModal.type === 'UPGRADE'
                  ? 'Upgrade a Coach'
                  : 'Nuovo Mezzo'}
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                Stai operando su <span className="font-bold text-slate-900">{activeModal.bus?.id || 'Monte Rosa Fleet'}</span>.
                Questa azione verrà registrata nell&apos;audit log immutabile.
              </p>
            </div>

            {/* Impact Summary */}
            {activeModal.bus && (
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Costo Ind.</span>
                  <span className="text-sm font-black text-slate-800">€{activeModal.bus.cost}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">BEP</span>
                  <span className="text-sm font-black text-slate-800">{activeModal.bus.breakEvenSeats} pax</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Margine</span>
                  <span className={`text-sm font-black ${activeModal.bus.estMargin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    €{activeModal.bus.estMargin}
                  </span>
                </div>
              </div>
            )}

            {/* Specific Inputs */}
            {activeModal.type === 'OVERRIDE' && (
              <div className="mb-8">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Capacità Target
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={overrideValue}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setOverrideValue(Number.isFinite(n) ? n : 0);
                    }}
                    className={`w-full bg-slate-50 border rounded-2xl py-5 px-8 text-2xl font-black outline-none transition-all ${
                      error ? 'border-rose-500 ring-4 ring-rose-50' : 'border-slate-200 focus:ring-4 focus:ring-indigo-50'
                    }`}
                  />
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300">PAX</span>
                </div>
              </div>
            )}

            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Nota Operativa Obbligatoria (min 10 char)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 h-32 resize-none transition-all"
                  placeholder="Es. Richiesta fornitore per manutenzione mezzo o adeguamento occupazione..."
                />
              </div>

              {error && (
                <div className="flex gap-3 text-rose-600 bg-rose-50 p-5 rounded-2xl border border-rose-100">
                  <AlertCircle size={20} className="shrink-0" />
                  <p className="text-xs font-bold leading-relaxed">{error}</p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setError(null);
                  }}
                  className="flex-1 py-5 text-slate-400 font-black text-sm hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Annulla
                </button>
                <button
                  disabled={note.trim().length < 10}
                  onClick={handleBusAction}
                  className={`flex-1 py-5 text-white rounded-2xl font-black text-sm shadow-2xl transition-all disabled:opacity-40 disabled:shadow-none ${
                    activeModal.type === 'OVERRIDE' || activeModal.type === 'REMOVE'
                      ? 'bg-rose-600 shadow-rose-200'
                      : 'bg-indigo-600 shadow-indigo-200'
                  }`}
                >
                  Esegui Comando
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TripLayout>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger';
}) {
  const styles = {
    default: 'bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100',
    success: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100',
    danger: 'bg-rose-50 text-rose-500 hover:bg-rose-100 border-rose-100',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-transparent transition-all active:scale-95 ${styles[variant]}`}
    >
      {icon} {label}
    </button>
  );
}
