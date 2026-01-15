'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { TripLayout, TripStatus, SlaLevel } from '../../../../../components/admin/TripLayout';
import { 
  Calculator, 
  Euro, 
  Save, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  ShieldCheck,
  TrendingUp,
  Bus as BusIcon
} from 'lucide-react';

interface ExtraItem {
  id: string;
  name: string;
  unitCost: number;
  markupPercent: number;
}

const INITIAL_VALUES = {
  coachCost: 850,
  midibusCost: 450,
  fixedStaffCost: 150,
  fixedMarketingCost: 80,
  riskPercent: 5,
  paymentFeePercent: 1.4,
  paymentFeeFixed: 0.25,
  avgSeatsPerOrder: 2.1,
  baseSeatPrice: 45,
  coachCapacity: 52,
  midiCapacity: 20
};

function NumericInput({ 
  label, 
  value, 
  onChange, 
  suffix, 
  step = 1, 
  highlight = false 
}: { 
  label: string, 
  value: number, 
  onChange: (val: number) => void, 
  suffix?: string, 
  step?: number, 
  highlight?: boolean 
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
        {label}
      </label>
      <div className="relative">
        <input 
          type="number" 
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`w-full bg-slate-50 border rounded-xl py-3 px-4 text-sm font-bold outline-none transition-all focus:ring-2 
            ${highlight ? 'border-rose-300 ring-rose-100 text-rose-700' : 'border-slate-200 focus:ring-indigo-500 text-slate-900'}`}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function NumbersPage({ params }: { params: { id: string } }) {
  // Input States
  const [coachCost, setCoachCost] = useState(INITIAL_VALUES.coachCost);
  const [midibusCost, setMidibusCost] = useState(INITIAL_VALUES.midibusCost);
  const [fixedStaffCost, setFixedStaffCost] = useState(INITIAL_VALUES.fixedStaffCost);
  const [fixedMarketingCost, setFixedMarketingCost] = useState(INITIAL_VALUES.fixedMarketingCost);
  const [riskPercent, setRiskPercent] = useState(INITIAL_VALUES.riskPercent);
  const [paymentFeePercent] = useState(INITIAL_VALUES.paymentFeePercent);
  const [paymentFeeFixed] = useState(INITIAL_VALUES.paymentFeeFixed);
  const [avgSeatsPerOrder, setAvgSeatsPerOrder] = useState(INITIAL_VALUES.avgSeatsPerOrder);
  const [baseSeatPrice, setBaseSeatPrice] = useState(INITIAL_VALUES.baseSeatPrice);
  const [extras, setExtras] = useState<ExtraItem[]>([
    { id: '1', name: 'Assicurazione Neve', unitCost: 2.5, markupPercent: 100 },
    { id: '2', name: 'Noleggio Attrezzatura Conv.', unitCost: 15, markupPercent: 20 }
  ]);

  // UI States
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [auditNote, setAuditNote] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const isChanged = 
      coachCost !== INITIAL_VALUES.coachCost ||
      midibusCost !== INITIAL_VALUES.midibusCost ||
      fixedStaffCost !== INITIAL_VALUES.fixedStaffCost ||
      fixedMarketingCost !== INITIAL_VALUES.fixedMarketingCost ||
      riskPercent !== INITIAL_VALUES.riskPercent ||
      baseSeatPrice !== INITIAL_VALUES.baseSeatPrice ||
      avgSeatsPerOrder !== INITIAL_VALUES.avgSeatsPerOrder;
    setHasChanges(isChanged);
  }, [coachCost, midibusCost, fixedStaffCost, fixedMarketingCost, riskPercent, baseSeatPrice, avgSeatsPerOrder]);

  const tripSummary = {
    destinationName: 'Gressoney-La-Trinité',
    departureLabel: '18 Gen 2026 • Milano Lampugnano',
    status: 'SOFT_HOLD' as TripStatus,
    sla: { level: 'YELLOW' as SlaLevel, label: 'Rischio SLA', deadlineLabel: 'Scade tra 14h 20m' }
  };

  const calculatedData = useMemo(() => {
    const totalFixedCosts = fixedStaffCost + fixedMarketingCost;
    const riskFactor = 1 + (riskPercent / 100);
    
    const effectiveCoachCost = (coachCost + totalFixedCosts) * riskFactor;
    const effectiveMidiCost = (midibusCost + totalFixedCosts) * riskFactor;

    const feeFixedPerSeat = paymentFeeFixed / avgSeatsPerOrder;
    const netPerSeat = baseSeatPrice - (baseSeatPrice * (paymentFeePercent / 100)) - feeFixedPerSeat;
    
    const bepCoach = Math.ceil(effectiveCoachCost / netPerSeat);
    const bepMidi = Math.ceil(effectiveMidiCost / netPerSeat);

    const costPerSeatCoach = effectiveCoachCost / (INITIAL_VALUES.coachCapacity * 0.85);

    const getScenarios = (capacity: number, busEffectiveCost: number) => [
      { label: '60% Occ.', pax: Math.floor(capacity * 0.6), val: (Math.floor(capacity * 0.6) * netPerSeat) - busEffectiveCost },
      { label: '85% Target', pax: Math.floor(capacity * 0.85), val: (Math.floor(capacity * 0.85) * netPerSeat) - busEffectiveCost },
      { label: '100% Full', pax: capacity, val: (capacity * netPerSeat) - busEffectiveCost }
    ];

    return {
      costPerSeatCoach,
      bepCoach,
      bepMidi,
      coachScenarios: getScenarios(INITIAL_VALUES.coachCapacity, effectiveCoachCost),
      midiScenarios: getScenarios(INITIAL_VALUES.midiCapacity, effectiveMidiCost),
      isUnderpriced: baseSeatPrice < costPerSeatCoach
    };
  }, [coachCost, midibusCost, fixedStaffCost, fixedMarketingCost, riskPercent, baseSeatPrice, paymentFeePercent, paymentFeeFixed, avgSeatsPerOrder]);

  const handleSaveSettings = () => {
    console.log('Salvataggio parametri Monte Rosa Bus:', { coachCost, midibusCost, baseSeatPrice, auditNote });
    setIsSaveModalOpen(false);
    setAuditNote('');
    setHasChanges(false);
  };

  return (
    <TripLayout id={params.id} activeTab="numbers" tripSummary={tripSummary}>
      
      {/* Changes Indicator */}
      {hasChanges && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between border border-slate-700">
            <div className="flex items-center gap-3 px-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest">Modifiche non salvate</span>
            </div>
            <button 
              onClick={() => setIsSaveModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg"
            >
              Salva Configurazione
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-24">
        
        {/* Left: Input Form */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Calculator size={16} className="text-indigo-600" /> Parametri Logistici & Rischio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumericInput label="Costo Coach (€/mezzo)" value={coachCost} onChange={setCoachCost} />
              <NumericInput label="Costo Midibus (€/mezzo)" value={midibusCost} onChange={setMidibusCost} />
              <NumericInput label="Staff Fisso (€/trip)" value={fixedStaffCost} onChange={setFixedStaffCost} />
              <NumericInput label="Marketing (€/trip)" value={fixedMarketingCost} onChange={setFixedMarketingCost} />
              <NumericInput label="Rischio Operativo (%)" value={riskPercent} onChange={setRiskPercent} suffix="%" />
              <NumericInput label="Pax medi per ordine" value={avgSeatsPerOrder} onChange={setAvgSeatsPerOrder} step={0.1} suffix="pax" />
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Euro size={16} className="text-indigo-600" /> Pricing & Transazioni
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <NumericInput 
                label="Prezzo Base Posto (€)" 
                value={baseSeatPrice} 
                onChange={setBaseSeatPrice} 
                highlight={calculatedData.isUnderpriced} 
              />
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Stripe Fee</label>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center h-[52px]">
                   <span className="text-xs font-bold text-slate-500">{paymentFeePercent}% + €{paymentFeeFixed}</span>
                   <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Automatico</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Servizi Extra / Upsell</h3>
                <button 
                  onClick={() => setExtras([...extras, { id: Date.now().toString(), name: 'Nuovo Extra', unitCost: 0, markupPercent: 50 }])}
                  className="p-2 bg-slate-50 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="space-y-3">
                {extras.map((extra) => (
                  <div key={extra.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <input className="flex-1 bg-transparent font-bold text-sm outline-none" value={extra.name} readOnly />
                    <div className="w-24 text-right">
                      <span className="text-[10px] font-black text-slate-400 block uppercase">Vendita</span>
                      <span className="text-sm font-black">€{(extra.unitCost * (1 + extra.markupPercent/100)).toFixed(2)}</span>
                    </div>
                    <button onClick={() => setExtras(extras.filter(ex => ex.id !== extra.id))} className="text-slate-300 hover:text-rose-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right: Output & Decision Support */}
        <div className="space-y-6">
          <section className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Analisi Sostenibilità</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs text-slate-400 font-bold">BEP Coach</span>
                  <span className="text-xl font-black text-white">{calculatedData.bepCoach} pax</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-indigo-500 h-full" style={{ width: `${(calculatedData.bepCoach/52)*100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs text-slate-400 font-bold">BEP Midibus</span>
                  <span className="text-xl font-black text-white">{calculatedData.bepMidi} pax</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-emerald-500 h-full" style={{ width: `${(calculatedData.bepMidi/20)*100}%` }} />
                </div>
              </div>
              {calculatedData.isUnderpriced && (
                <div className="flex gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-300">
                  <AlertTriangle size={20} className="shrink-0" />
                  <p className="text-[10px] font-bold leading-tight uppercase">Pricing pericoloso: copre solo il {( (baseSeatPrice/calculatedData.costPerSeatCoach)*100 ).toFixed(0)}% dei costi stimati.</p>
                </div>
              )}
            </div>
          </section>

          {/* Scenari Coach */}
          <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <BusIcon size={14} className="text-indigo-600"/> Scenari Margine Coach
            </h2>
            <div className="space-y-4">
              {calculatedData.coachScenarios.map((scen, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-md hover:ring-1 hover:ring-slate-100 transition-all">
                  <div>
                    <span className="text-xs font-bold text-slate-600 block">{scen.label}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{scen.pax} pax totali</span>
                  </div>
                  <span className={`font-black ${scen.val >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {scen.val >= 0 ? '+' : ''}€{Math.round(scen.val)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Scenari Midibus */}
          <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-600"/> Scenari Margine Midibus
            </h2>
            <div className="space-y-4">
              {calculatedData.midiScenarios.map((scen, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-md hover:ring-1 hover:ring-slate-100 transition-all">
                  <div>
                    <span className="text-xs font-bold text-slate-600 block">{scen.label}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{scen.pax} pax totali</span>
                  </div>
                  <span className={`font-black ${scen.val >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {scen.val >= 0 ? '+' : ''}€{Math.round(scen.val)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-md w-full p-10 animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Audit Log Obbligatorio</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">Le modifiche ai parametri finanziari sono irreversibili e impattano i margini di contribuzione stimati.</p>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Giustificazione (Audit Note)</label>
                <textarea 
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
                  placeholder="es. Aumento costi carburante o adeguamento commissioni..."
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsSaveModalOpen(false)} className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Annulla</button>
                <button 
                  disabled={auditNote.length < 10}
                  onClick={handleSaveSettings}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 disabled:bg-slate-200 disabled:shadow-none transition-all"
                >
                  Conferma Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TripLayout>
  );
}
