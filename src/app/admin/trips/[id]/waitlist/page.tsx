'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { TripLayout, TripStatus, SlaLevel } from '../../../../../components/admin/TripLayout';
import { 
  Users, 
  Clock, 
  UserCheck, 
  ArrowUpRight, 
  Download, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Timer,
  ChevronRight,
  Send,
  Info,
  CalendarDays,
  ShieldAlert
} from 'lucide-react';

interface WaitlistEntryDTO {
  id: string;
  createdAt: string;
  nameMasked: string;
  phoneMasked?: string;
  requestedSeats: number;
  status: 'IN_QUEUE' | 'INVITED' | 'CONFIRMED' | 'EXPIRED';
  inviteExpiresAt?: string;
}

interface WaitlistPageDTO {
  summary: {
    destinationName: string;
    departureLabel: string;
    departureAtISO: string;
    status: TripStatus;
    sla: { level: SlaLevel; label: string; deadlineLabel?: string };
  };
  thresholds: {
    midibusCapacity: number;
    coachCapacity: number;
    notifyAgencyHoursBefore: number;
  };
  waitlist: WaitlistEntryDTO[];
}

const MOCK_WAITLIST_DATA: WaitlistPageDTO = {
  summary: {
    destinationName: 'Gressoney-La-Trinité',
    departureLabel: '18 Gen 2026 • Milano Lampugnano',
    departureAtISO: '2026-01-18T07:00:00Z',
    status: 'SOFT_HOLD',
    sla: { level: 'YELLOW', label: 'Rischio SLA', deadlineLabel: 'Check Agenzia' }
  },
  thresholds: {
    midibusCapacity: 20,
    coachCapacity: 52,
    notifyAgencyHoursBefore: 48
  },
  waitlist: [
    { id: 'WL-001', createdAt: '2025-10-25T10:30:00Z', nameMasked: 'Ma*** Va***', phoneMasked: '+39 *** 4421', requestedSeats: 4, status: 'IN_QUEUE' },
    { id: 'WL-002', createdAt: '2025-10-25T11:15:00Z', nameMasked: 'Sa*** Bi***', phoneMasked: '+39 *** 8892', requestedSeats: 2, status: 'IN_QUEUE' },
    { id: 'WL-003', createdAt: '2025-10-25T09:00:00Z', nameMasked: 'Lu*** Ro***', phoneMasked: '+39 *** 1102', requestedSeats: 1, status: 'INVITED', inviteExpiresAt: '2025-01-01T12:00:00Z' },
    { id: 'WL-004', createdAt: '2025-10-24T18:45:00Z', nameMasked: 'Gi*** Ve***', phoneMasked: '+39 *** 5543', requestedSeats: 5, status: 'IN_QUEUE' },
    { id: 'WL-005', createdAt: '2025-10-24T15:20:00Z', nameMasked: 'Fr*** Ne***', phoneMasked: '+39 *** 3321', requestedSeats: 2, status: 'EXPIRED' },
    { id: 'WL-006', createdAt: '2025-10-25T14:10:00Z', nameMasked: 'Al*** Mo***', phoneMasked: '+39 *** 9900', requestedSeats: 3, status: 'IN_QUEUE' },
    { id: 'WL-007', createdAt: '2025-10-25T14:30:00Z', nameMasked: 'Pa*** Lo***', phoneMasked: '+39 *** 7766', requestedSeats: 2, status: 'IN_QUEUE' },
    { id: 'WL-008', createdAt: '2025-10-25T15:00:00Z', nameMasked: 'Cl*** Du***', phoneMasked: '+39 *** 2211', requestedSeats: 4, status: 'IN_QUEUE' },
  ]
};

const statusStyles: Record<string, string> = {
  IN_QUEUE: 'bg-slate-100 text-slate-600',
  INVITED: 'bg-indigo-100 text-indigo-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-rose-100 text-rose-700',
};

export default function WaitlistPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<WaitlistPageDTO>(MOCK_WAITLIST_DATA);
  const [hasMidibusOpen, setHasMidibusOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<{ type: 'INVITE' | 'EXPIRE' | 'BATCH_INVITE' | 'ACTIVATE_VEHICLE'; entries: WaitlistEntryDTO[]; suggestedVehicle?: string } | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // SLA Countdown Engine
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const slaCountdown = useMemo(() => {
    const departure = new Date(data.summary.departureAtISO);
    const deadline = new Date(departure.getTime() - data.thresholds.notifyAgencyHoursBefore * 3600000);
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) return 'SCADUTO';

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  }, [data.summary.departureAtISO, data.thresholds.notifyAgencyHoursBefore, now]);

  // Step-based Decision Engine
  const decisionStats = useMemo(() => {
    const inQueue = data.waitlist.filter(e => e.status === 'IN_QUEUE');
    const totalPax = inQueue.reduce((acc, curr) => acc + curr.requestedSeats, 0);

    let suggestion: { label: string; color: string; icon: React.ReactNode; vehicle?: string } = { 
      label: 'Attendi', color: 'bg-slate-900', icon: <Clock size={20} /> 
    };

    if (!hasMidibusOpen && totalPax >= data.thresholds.midibusCapacity) {
      suggestion = { label: 'Apri Midibus', color: 'bg-emerald-600', icon: <ArrowUpRight size={20} />, vehicle: 'MIDIBUS' };
    } else if (hasMidibusOpen && totalPax >= data.thresholds.coachCapacity) {
      suggestion = { label: 'Apri Coach', color: 'bg-indigo-600', icon: <ArrowUpRight size={20} />, vehicle: 'COACH' };
    }

    return { totalPax, userCount: inQueue.length, suggestion };
  }, [data.waitlist, data.thresholds, hasMidibusOpen]);

  const handleAction = () => {
    if (note.trim().length < 10) {
      setError('La nota operativa deve avere almeno 10 caratteri.');
      return;
    }

    const type = activeModal?.type;
    const entryIds = activeModal?.entries.map(e => e.id) || [];

    if (type === 'ACTIVATE_VEHICLE') {
      if (activeModal?.suggestedVehicle === 'MIDIBUS') setHasMidibusOpen(true);
      console.log(`[OPS AUDIT] Attivazione ${activeModal?.suggestedVehicle}. Nota: ${note}`);
    } else {
      setData(prev => ({
        ...prev,
        waitlist: prev.waitlist.map(e => {
          if (entryIds.includes(e.id)) {
            const isExpiring = type === 'EXPIRE';
            return { 
              ...e, 
              status: isExpiring ? 'EXPIRED' : 'INVITED',
              inviteExpiresAt: !isExpiring ? new Date(Date.now() + 24 * 3600000).toISOString() : undefined
            };
          }
          return e;
        })
      }));
    }

    setActiveModal(null);
    setNote('');
    setError(null);
  };

  const handleBatchInvite = (n: number) => {
    const targets = data.waitlist.filter(e => e.status === 'IN_QUEUE').slice(0, n);
    if (targets.length > 0) setActiveModal({ type: 'BATCH_INVITE', entries: targets });
  };

  const forceCleanExpired = () => {
    const nowISO = new Date().toISOString();
    setData(prev => ({
      ...prev,
      waitlist: prev.waitlist.map(e => 
        e.status === 'INVITED' && e.inviteExpiresAt && e.inviteExpiresAt < nowISO 
        ? { ...e, status: 'EXPIRED' } 
        : e
      )
    }));
  };

  return (
    <TripLayout id={params.id} activeTab="waitlist" tripSummary={data.summary}>
      <div className="space-y-8">

        {/* Step-based Decision & SLA Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${decisionStats.suggestion.color} col-span-2 rounded-[40px] p-10 text-white shadow-xl relative overflow-hidden group transition-all duration-500`}>
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-500">
               <Users size={180} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2 block">Coda Attesa Intelligente</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-6xl font-black tracking-tighter">{decisionStats.totalPax}</span>
                  <span className="text-lg font-bold opacity-80">pax richiesti</span>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/10">
                    <Users size={12} /> {decisionStats.userCount} Utenti in IN_QUEUE
                  </div>
                  <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${hasMidibusOpen ? 'bg-emerald-500 border-emerald-400' : 'bg-white/10 border-white/10'}`}>
                    {hasMidibusOpen ? 'Midibus Già Attivo' : 'Cercando Midibus (20 pax)'}
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-[32px] border border-white/10 min-w-[260px]">
                 <span className="text-[9px] font-black uppercase tracking-widest block mb-4 opacity-60">Monte Rosa Engine</span>
                 <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white text-slate-900 rounded-2xl">{decisionStats.suggestion.icon}</div>
                    <span className="text-2xl font-black tracking-tight">{decisionStats.suggestion.label}</span>
                 </div>
                 <button 
                  onClick={() => decisionStats.suggestion.vehicle && setActiveModal({ type: 'ACTIVATE_VEHICLE', entries: [], suggestedVehicle: decisionStats.suggestion.vehicle })}
                  disabled={!decisionStats.suggestion.vehicle}
                  className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
                 >
                    Attiva Mezzo <ChevronRight size={14} className="inline ml-1" />
                 </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[40px] p-10 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-6">
                <Timer size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">SLA Agenzia Partner</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Notifica entro <br/> <span className={`${slaCountdown === 'SCADUTO' ? 'text-rose-600' : 'text-indigo-600'}`}>{slaCountdown}</span>
              </h3>
              <p className="mt-4 text-xs font-medium text-slate-400 leading-relaxed">
                Check-in con agenzia richiesto {data.thresholds.notifyAgencyHoursBefore}h prima del viaggio ({new Date(data.summary.departureAtISO).toLocaleDateString()}).
              </p>
            </div>
            <div className="pt-8 border-t border-slate-50 flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase">
              <CalendarDays size={14} /> Partenza: {new Date(data.summary.departureAtISO).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="px-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Gestione Anagrafica Coda</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{data.waitlist.length} record in sistema</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative group">
               <button className="flex items-center gap-2 bg-slate-100 text-slate-600 px-5 py-2.5 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all">
                  <Send size={14} /> Invita Batch...
               </button>
               <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-2xl hidden group-hover:block z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                 {[5, 10, 20].map(n => (
                   <button 
                    key={n}
                    onClick={() => handleBatchInvite(n)}
                    className="w-full text-left px-5 py-3 text-[10px] font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 uppercase border-b last:border-0 border-slate-50"
                   >
                     Primi {n} utenti
                   </button>
                 ))}
               </div>
            </div>
            <button 
              onClick={forceCleanExpired}
              className="flex items-center gap-2 bg-slate-50 text-slate-400 px-5 py-2.5 rounded-2xl font-black text-xs hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"
            >
              <Trash2 size={14} /> Pulisci Scaduti
            </button>
            <button className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-black text-xs hover:bg-slate-800 transition-all">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Table */}
          <div className="lg:col-span-3 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-6">Utente</th>
                  <th className="px-8 py-6 text-center">Posti</th>
                  <th className="px-8 py-6">Stato</th>
                  <th className="px-8 py-6 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.waitlist.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-900 text-sm tracking-tight">{entry.nameMasked}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Iscritto il {new Date(entry.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-8 py-6 text-center text-lg font-black text-slate-700">{entry.requestedSeats}</td>
                    <td className="px-8 py-6">
                      <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-widest ${statusStyles[entry.status]}`}>
                        {entry.status.replace('_', ' ')}
                      </span>
                      {entry.inviteExpiresAt && entry.status === 'INVITED' && (
                        <div className={`text-[8px] font-black uppercase mt-1 flex items-center gap-1 ${new Date(entry.inviteExpiresAt) < new Date() ? 'text-rose-500' : 'text-slate-400'}`}>
                          <Timer size={10}/> Scade: {new Date(entry.inviteExpiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right space-x-2">
                      {entry.status === 'IN_QUEUE' && (
                        <button 
                          onClick={() => setActiveModal({ type: 'INVITE', entries: [entry] })}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          <UserCheck size={14} /> Invita
                        </button>
                      )}
                      {(entry.status === 'IN_QUEUE' || entry.status === 'INVITED') && (
                        <button 
                          onClick={() => setActiveModal({ type: 'EXPIRE', entries: [entry] })}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase hover:bg-rose-50 hover:text-rose-600 transition-all"
                        >
                          <Trash2 size={14} /> Expira
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sidebar: Legend */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-lg">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-6 flex items-center gap-2">
                <Info size={16} /> Legenda Operativa
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-500 mb-3 tracking-widest">Flusso Stati</div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                      <p className="text-[11px] text-slate-400 leading-relaxed"><b className="text-white uppercase tracking-tighter">IN_QUEUE:</b> Domanda grezza. L'utente attende lo sblocco logistico del mezzo.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                      <p className="text-[11px] text-slate-400 leading-relaxed"><b className="text-white uppercase tracking-tighter">INVITED:</b> Finestra di acquisto 24h aperta. Posto pre-riservato logicamente.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <p className="text-[11px] text-slate-400 leading-relaxed"><b className="text-white uppercase tracking-tighter">EXPIRED:</b> Mancato acquisto o rimozione manuale. Pax liberato dal BEP.</p>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-white/5">
                  <div className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">SLA Agenzia</div>
                  <p className="text-[11px] text-slate-400 italic leading-relaxed">
                    Il partner logistico richiede {data.thresholds.notifyAgencyHoursBefore}h per bloccare il fornitore. Oltre tale soglia, il prezzo del bus non è più garantito.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-8">
              <div className="flex items-center gap-2 text-amber-600 mb-4">
                <ShieldAlert size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Compliance Audit</span>
              </div>
              <p className="text-[11px] text-amber-900/60 font-medium leading-relaxed">
                Ogni azione su un record della waitlist (Invito o Scadenza) genera un audit log immutabile. Assicurati che le note riflettano la reale esigenza operativa.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operations Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[48px] shadow-2xl max-w-lg w-full p-12 animate-in slide-in-from-bottom-8 duration-500 relative">
            <button onClick={() => { setActiveModal(null); setNote(''); setError(null); }} className="absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors p-2 hover:bg-slate-50 rounded-full">
              <X size={24} />
            </button>

            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 ${activeModal.type === 'EXPIRE' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
              {activeModal.type === 'ACTIVATE_VEHICLE' ? <ArrowUpRight size={40} /> : activeModal.type === 'EXPIRE' ? <AlertCircle size={40} /> : <CheckCircle2 size={40} />}
            </div>

            <div className="mb-8">
              <h3 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter">
                {activeModal.type === 'ACTIVATE_VEHICLE' ? `Attiva ${activeModal.suggestedVehicle}` : 
                 activeModal.type === 'INVITE' ? 'Invia Invito' : 
                 activeModal.type === 'BATCH_INVITE' ? 'Invito Batch' : 'Segna Scaduto'}
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                {activeModal.type === 'ACTIVATE_VEHICLE' 
                  ? "Questa operazione sblocca la capacità logistica sul trip. Gli utenti in coda potranno essere invitati."
                  : `Azione su ${activeModal.entries.length} record. Gli utenti riceveranno una notifica automatica via email.`}
              </p>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Giustificativo Audit (Min 10 char)</label>
                <textarea 
                  value={note}
                  onChange={(e) => { setNote(e.target.value); if(e.target.value.length >= 10) setError(null); }}
                  className={`w-full bg-slate-50 border rounded-3xl p-6 text-sm font-medium outline-none h-32 resize-none transition-all focus:ring-4 ${error ? 'border-rose-300 ring-rose-50' : 'border-slate-200 focus:ring-indigo-50'}`}
                  placeholder="Es. Sblocco inviti per incremento flotta approvato..."
                />
                {error && <p className="mt-2 text-[10px] font-bold text-rose-600 uppercase tracking-tighter">{error}</p>}
              </div>

              <div className="flex gap-4">
                <button onClick={() => { setActiveModal(null); setNote(''); }} className="flex-1 py-5 text-slate-400 font-black text-sm hover:bg-slate-50 rounded-2xl transition-all">Annulla</button>
                <button 
                  disabled={note.trim().length < 10}
                  onClick={handleAction}
                  className={`flex-1 py-5 text-white rounded-2xl font-black text-sm shadow-2xl transition-all disabled:opacity-40 disabled:shadow-none ${
                    activeModal.type === 'EXPIRE' ? 'bg-rose-600 shadow-rose-200' : 'bg-indigo-600 shadow-indigo-200'
                  }`}
                >
                  Conferma Comando
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TripLayout>
  );
}
