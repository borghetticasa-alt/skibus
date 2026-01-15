
'use client';

import React, { useState } from 'react';
import { TripLayout, TripStatus, SlaLevel } from '../../../../../components/admin/TripLayout';
import { 
  Users, 
  TrendingUp, 
  Wallet, 
  AlertCircle, 
  PlusCircle, 
  CheckCircle2,
  ChevronRight,
  Info
} from 'lucide-react';

// DTO Interfaces
interface BusStatusDTO {
  id: string;
  type: 'COACH' | 'MIDIBUS';
  status: TripStatus;
  capacity: number;
  sold: number;
  bep: number;
  margin: number;
}

interface TripOverviewDTO {
  summary: {
    destinationName: string;
    departureLabel: string;
    status: TripStatus;
    sla: { level: SlaLevel; label: string; deadlineLabel?: string };
  };
  kpis: {
    totalSold: number;
    waitlistCount: number;
    paidRevenue: number;
    estMargin: number;
    waitlistToPaidRate: number;
  };
  alerts: Array<{ id: string; code: string; severity: 'info' | 'warning' | 'critical'; message: string }>;
  buses: BusStatusDTO[];
  recommendations: Array<{
    id: string;
    type: 'OPEN_MIDIBUS' | 'UPGRADE_COACH' | 'CONFIRM_VEHICLE';
    title: string;
    description: string;
    impact: string;
  }>;
}

const MOCK_DATA: TripOverviewDTO = {
  summary: {
    destinationName: 'Gressoney-La-Trinité',
    departureLabel: '18 Gen 2026 • Milano Lampugnano',
    status: 'SOFT_HOLD',
    sla: { level: 'YELLOW', label: 'Rischio SLA', deadlineLabel: 'Scade tra 14h 20m' }
  },
  kpis: {
    totalSold: 42,
    waitlistCount: 14,
    paidRevenue: 1890,
    estMargin: 420,
    waitlistToPaidRate: 12.5
  },
  alerts: [
    { id: '1', code: 'SLA_RISK', severity: 'critical', message: 'Mancano 3 posti per il Break-even del Bus #1' },
    { id: '2', code: 'WL_DEMAND', severity: 'warning', message: 'Domanda in waitlist sufficiente per Midibus 20 posti' },
    { id: '3', code: 'PROMO_ACTIVE', severity: 'info', message: 'Campagna promozionale "Early Snow" attiva' }
  ],
  buses: [
    { id: 'BUS-01', type: 'COACH', status: 'SOFT_HOLD', capacity: 52, sold: 42, bep: 45, margin: -120 }
  ],
  recommendations: [
    {
      id: 'rec-1',
      type: 'OPEN_MIDIBUS',
      title: 'Attiva secondo mezzo (Midibus)',
      description: 'La waitlist ha raggiunto 14 persone. Aprendo un Midibus ora catturiamo la domanda del weekend.',
      impact: '+€310 Margine stimato'
    },
    {
      id: 'rec-2',
      type: 'UPGRADE_COACH',
      title: 'Upgrade a Coach 52 posti',
      description: 'Trasforma il Midibus attuale in un Coach per ottimizzare il costo per passeggero.',
      impact: '+12% Efficienza costi'
    },
    {
      id: 'rec-3',
      type: 'CONFIRM_VEHICLE',
      title: 'Conferma definitiva flotta',
      description: 'Blocca i prezzi attuali del fornitore confermando i mezzi assegnati.',
      impact: 'Zero Penali'
    }
  ]
};

const statusPillStyles: Record<TripStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SOFT_HOLD: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  LOCKED: 'bg-violet-100 text-violet-700',
  FULL: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-slate-800 text-slate-200',
};

export default function TripOverviewPage({ params }: { params: { id: string } }) {
  const [data] = useState<TripOverviewDTO>(MOCK_DATA);
  const [selectedAction, setSelectedAction] = useState<TripOverviewDTO['recommendations'][0] | null>(null);
  const [note, setNote] = useState('');

  const handleConfirmAction = () => {
    console.log(`Esecuzione azione ${selectedAction?.id} con nota: ${note}`);
    // fetch(`/api/admin/actions/execute`, { method: 'POST', body: JSON.stringify({ id: selectedAction?.id, note }) })
    setSelectedAction(null);
    setNote('');
  };

  const displayedRecommendations = data.recommendations.slice(0, 2);
  const hiddenCount = data.recommendations.length - 2;

  return (
    <TripLayout id={params.id} activeTab="overview" tripSummary={data.summary}>
      <div className="space-y-8">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Posti Venduti" value={data.kpis.totalSold} icon={<Users size={16}/>} subValue={`${data.kpis.waitlistToPaidRate}% waitlist conversion`} />
          <KpiCard label="Waitlist Attiva" value={data.kpis.waitlistCount} icon={<TrendingUp size={16}/>} trend="warning" />
          <KpiCard label="Ricavo Netto" value={`€${data.kpis.paidRevenue}`} icon={<Wallet size={16}/>} subValue="Pagamenti confermati" />
          <KpiCard label="Margine Est." value={`€${data.kpis.estMargin}`} icon={<PlusCircle size={16}/>} trend={data.kpis.estMargin > 0 ? 'success' : 'danger'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Actions & Alerts */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Recommendations Section */}
            <section>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-indigo-600" /> Azioni Consigliate
              </h2>
              <div className="grid gap-4">
                {displayedRecommendations.map(rec => (
                  <button 
                    key={rec.id}
                    onClick={() => { setSelectedAction(rec); setNote(''); }}
                    className="flex items-center justify-between p-6 bg-indigo-900 text-white rounded-3xl hover:bg-indigo-800 transition-all text-left shadow-xl shadow-indigo-100 group"
                  >
                    <div className="max-w-md">
                      <div className="flex items-center gap-2 mb-2">
                         <span className="px-2 py-0.5 bg-indigo-500 text-[10px] font-black rounded uppercase tracking-tighter">Strategico</span>
                         <span className="text-xs font-bold text-indigo-300">{rec.impact}</span>
                      </div>
                      <h3 className="text-lg font-bold mb-1">{rec.title}</h3>
                      <p className="text-sm text-indigo-200 leading-relaxed">{rec.description}</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl group-hover:translate-x-1 transition-transform">
                      <ChevronRight />
                    </div>
                  </button>
                ))}
                {hiddenCount > 0 && (
                  <div className="px-6 py-3 border border-dashed border-slate-200 rounded-2xl text-center">
                    <span className="text-xs font-bold text-slate-400">+ altre {hiddenCount} opzioni disponibili in gestione flotta</span>
                  </div>
                )}
              </div>
            </section>

            {/* Fleet Status Table */}
            <section>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Stato Mezzi Assegnati</h2>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Bus ID</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Stato</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Occupancy</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">B.E.P.</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Margine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.buses.map(bus => (
                      <tr key={bus.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{bus.id}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{bus.type}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-tighter ${statusPillStyles[bus.status]}`}>
                            {bus.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black">{bus.sold}/{bus.capacity}</span>
                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                              <div className="h-full bg-indigo-500" style={{ width: `${(bus.sold/bus.capacity)*100}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[10px] font-bold text-slate-600">{bus.bep} pax</span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-xs">
                          <span className={bus.margin >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                            {bus.margin >= 0 ? '+' : ''}€{bus.margin}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right Column: Alerts & Context */}
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Alert Attivi</h2>
              <div className="space-y-3">
                {data.alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`p-4 rounded-2xl border flex gap-3 ${
                      alert.severity === 'critical' ? 'bg-rose-50 border-rose-100 text-rose-800' : 
                      alert.severity === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' :
                      'bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                       <AlertCircle size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{alert.code}</div>
                      <p className="text-xs font-bold leading-relaxed">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="bg-slate-900 rounded-3xl p-6 text-white">
               <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase mb-4">
                 <Info size={14}/> Note Operative
               </div>
               <p className="text-xs text-slate-400 leading-relaxed italic">
                 "Monte Rosa Bus: Assicurarsi che l'upgrade coach venga confermato entro giovedì per evitare penali di cancellazione fornitore."
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
            <div className="text-indigo-600 mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">{selectedAction.title}</h3>
            <p className="text-slate-500 text-sm mb-6">{selectedAction.description}</p>
            
            <div className="bg-slate-50 p-4 rounded-2xl mb-6 space-y-2">
               <div className="flex justify-between text-xs font-bold">
                 <span className="text-slate-400 uppercase tracking-tighter">Impatto Finanziario</span>
                 <span className="text-emerald-600 font-black">{selectedAction.impact}</span>
               </div>
               <div className="flex justify-between text-xs font-bold">
                 <span className="text-slate-400 uppercase tracking-tighter">Target Operativo</span>
                 <span className="text-slate-900">~65% Waitlist</span>
               </div>
            </div>

            <div className="space-y-4 mb-8">
              <label className="block">
                <span className="text-[10px] font-black text-slate-400 uppercase block mb-2">Nota di Validazione (Min. 10 caratteri)</span>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`w-full bg-slate-50 border rounded-xl p-4 text-sm outline-none transition-all focus:ring-2 ${
                    note.trim().length > 0 && note.trim().length < 10 ? 'border-amber-300 ring-amber-100' : 'border-slate-200 focus:ring-indigo-500'
                  }`}
                  placeholder="Giustifica l'azione operativa..."
                />
                {note.trim().length > 0 && note.trim().length < 10 && (
                  <span className="text-[10px] text-amber-600 font-bold mt-1 block">La nota deve essere più dettagliata per l'audit.</span>
                )}
              </label>
            </div>

            <div className="flex gap-3">
               <button onClick={() => setSelectedAction(null)} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-colors">Annulla</button>
               <button 
                 disabled={note.trim().length < 10}
                 onClick={handleConfirmAction}
                 className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 disabled:bg-slate-200 disabled:shadow-none transition-all"
               >
                 Conferma Azione
               </button>
            </div>
          </div>
        </div>
      )}
    </TripLayout>
  );
}

function KpiCard({ label, value, icon, subValue, trend }: { label: string, value: string | number, icon: React.ReactNode, subValue?: string, trend?: 'success' | 'warning' | 'danger' }) {
  const trendColor = trend === 'success' ? 'text-emerald-500' : trend === 'warning' ? 'text-amber-500' : trend === 'danger' ? 'text-rose-500' : 'text-slate-400';
  
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="p-1.5 bg-slate-50 rounded-lg text-slate-500">{icon}</span>
        {label}
      </div>
      <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
      {subValue && (
        <div className={`text-[10px] font-bold mt-1 ${trendColor}`}>{subValue}</div>
      )}
    </div>
  );
}
