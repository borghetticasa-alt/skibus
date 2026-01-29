'use client';

import React, { useMemo, useState, use as usePromise } from 'react';
import { TripLayout, TripStatus, SlaLevel } from '@/components/admin/TripLayout';
import {
  ShieldCheck,
  Search,
  Download,
  Info,
  ShieldAlert,
  Terminal,
  X,
  History,
  Calendar,
  Activity,
  Users,
  Euro,
} from 'lucide-react';

type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
type AuditArea = 'WAITLIST' | 'FLEET' | 'PRICING' | 'PAYMENTS' | 'SYSTEM';

interface AuditEvent {
  id: string;
  createdAt: string;
  action: string;
  area: AuditArea;
  severity: AuditSeverity;
  targetRef: string;
  actor: {
    emailMasked: string;
    isAdmin: boolean;
  };
  note: string;
  meta: Record<string, any>;
}

const MOCK_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'LOG-001',
    createdAt: new Date().toISOString(),
    action: 'BUS_CAPACITY_OVERRIDE',
    area: 'FLEET',
    severity: 'CRITICAL',
    targetRef: 'BUS-MR-01',
    actor: { emailMasked: 'g.v***@mrbus.it', isAdmin: true },
    note: 'Forzata capacità a 54 per cambio coach fornitore (modello Volvo v2)',
    meta: { previous_capacity: 52, new_capacity: 54, vendor_ref: 'VOLVO-G7' },
  },
  {
    id: 'LOG-002',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    action: 'WAITLIST_INVITE_SENT',
    area: 'WAITLIST',
    severity: 'INFO',
    targetRef: 'WL-008',
    actor: { emailMasked: 'SYSTEM', isAdmin: false },
    note: 'Invito automatico inviato a Cl*** Du*** (4 pax)',
    meta: { expires_at: '2026-01-19T07:00:00Z', batch_id: 'B-12' },
  },
  {
    id: 'LOG-003',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    action: 'PRICING_UPDATED',
    area: 'PRICING',
    severity: 'CRITICAL',
    targetRef: 'TRIP-CONFIG',
    actor: { emailMasked: 'admin@mrbus.it', isAdmin: true },
    note: 'Adeguamento prezzo carburante stagionale (+€2/biglietto)',
    meta: { old_price: 45, new_price: 47, season: 'PEAK_WINTER' },
  },
  {
    id: 'LOG-004',
    createdAt: new Date(Date.now() - 15000000).toISOString(),
    action: 'VEHICLE_ACTIVATED_MIDIBUS',
    area: 'FLEET',
    severity: 'WARNING',
    targetRef: 'BUS-MR-02',
    actor: { emailMasked: 'm.b***@mrbus.it', isAdmin: true },
    note: 'Sblocco logistico Midibus 20 posti su suggerimento Decision Engine',
    meta: { trigger_reason: 'WL_THRESHOLD_MET', pax_in_queue: 14 },
  },
];

const severityColors: Record<AuditSeverity, string> = {
  INFO: 'bg-white/5/5 text-slate-200/80',
  WARNING: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-rose-100 text-rose-700',
};

const areaIcons: Record<AuditArea, React.ReactNode> = {
  WAITLIST: <Users size={14} />,
  FLEET: <Activity size={14} />,
  PRICING: <Euro size={14} />,
  PAYMENTS: <Euro size={14} />,
  SYSTEM: <Terminal size={14} />,
};

// Utility locale per tempo relativo senza librerie
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'poco fa';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min fa`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h fa`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'ieri';
  if (diffInDays < 7) return `${diffInDays} giorni fa`;

  return date.toLocaleDateString('it-IT');
}

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default function AuditPage({ params }: PageProps) {
  // ✅ Next 16: params può essere Promise -> unwrap con React.use()
  const { id } = (params && typeof (params as any).then === 'function'
    ? usePromise(params as Promise<{ id: string }>)
    : (params as { id: string }));

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'ALL'>('ALL');
  const [areaFilter, setAreaFilter] = useState<AuditArea | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<'TODAY' | '7DAYS' | '30DAYS'>('7DAYS');
  const [onlyAdmin, setOnlyAdmin] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const tripSummary = {
    destinationName: 'Gressoney-La-Trinité',
    departureLabel: '18 Gen 2026 • Milano Lampugnano',
    status: 'SOFT_HOLD' as TripStatus,
    sla: { level: 'YELLOW' as SlaLevel, label: 'Rischio SLA', deadlineLabel: 'Check Agenzia' },
  };

  const filteredEvents = useMemo(() => {
    return MOCK_AUDIT_EVENTS.filter((event) => {
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        event.note.toLowerCase().includes(q) ||
        event.action.toLowerCase().includes(q) ||
        event.targetRef.toLowerCase().includes(q) ||
        event.actor.emailMasked.toLowerCase().includes(q);

      const matchesSeverity = severityFilter === 'ALL' || event.severity === severityFilter;
      const matchesArea = areaFilter === 'ALL' || event.area === areaFilter;
      const matchesAdmin = !onlyAdmin || event.actor.isAdmin;

      const eventDate = new Date(event.createdAt);
      const now = new Date();
      let matchesDate = true;

      if (dateRange === 'TODAY') matchesDate = eventDate.toDateString() === now.toDateString();
      else if (dateRange === '7DAYS') matchesDate = eventDate.getTime() > now.getTime() - 7 * 86400000;
      else if (dateRange === '30DAYS') matchesDate = eventDate.getTime() > now.getTime() - 30 * 86400000;

      return matchesSearch && matchesSeverity && matchesArea && matchesAdmin && matchesDate;
    });
  }, [searchQuery, severityFilter, areaFilter, dateRange, onlyAdmin]);

  const kpis = useMemo(() => {
    const todayStr = new Date().toDateString();
    const twentyFourHoursAgo = Date.now() - 86400000;

    return {
      total: filteredEvents.length,
      todayInFiltered: filteredEvents.filter((e) => new Date(e.createdAt).toDateString() === todayStr).length,
      criticalInFiltered: filteredEvents.filter(
        (e) => e.severity === 'CRITICAL' && new Date(e.createdAt).getTime() > twentyFourHoursAgo
      ).length,
    };
  }, [filteredEvents]);

  return (
    <TripLayout id={id} activeTab="audit" tripSummary={tripSummary}>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black text-white tracking-tighter">Audit Log Immutabile</h1>
              <span className="bg-white/5/50 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest flex items-center gap-2 shadow-lg">
                <ShieldCheck size={12} className="text-indigo-400" /> Append-Only
              </span>
            </div>
            <p className="text-slate-400 font-medium max-w-xl leading-relaxed">
              Registro crittografico di tutte le operazioni logistiche e finanziarie.
            </p>
          </div>

          <button
            onClick={() => console.log(filteredEvents)}
            className="flex items-center gap-2 bg-slate-950/30 border border-white/10 text-slate-100 px-6 py-3 rounded-2xl font-black text-xs hover:bg-slate-950/30 transition-all "
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-950/30 p-8 rounded-[32px] border border-white/10  flex items-center gap-6">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
              <History size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Filtrati</span>
              <span className="text-3xl font-black text-white">{kpis.total}</span>
            </div>
          </div>

          <div className="bg-slate-950/30 p-8 rounded-[32px] border border-white/10  flex items-center gap-6">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Calendar size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Oggi (nel filtro)</span>
              <span className="text-3xl font-black text-white">{kpis.todayInFiltered}</span>
            </div>
          </div>

          <div className="bg-slate-950/30 p-8 rounded-[32px] border border-white/10  flex items-center gap-6">
            <div
              className={`p-4 rounded-2xl ${
                kpis.criticalInFiltered > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-950/30 text-slate-400'
              }`}
            >
              <ShieldAlert size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Critici Filtrati (24h)</span>
              <span
                className={`text-3xl font-black ${
                  kpis.criticalInFiltered > 0 ? 'text-rose-600' : 'text-white'
                }`}
              >
                {kpis.criticalInFiltered}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950/30 p-6 rounded-[32px] border border-white/10  space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cerca per nota, azione, target..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-950/30 border border-white/10 rounded-2xl text-sm font-medium outline-none"
              />
            </div>

            <div className="flex items-center gap-2 p-1 bg-slate-950/30 rounded-2xl border border-white/10">
              {(['TODAY', '7DAYS', '30DAYS'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    dateRange === range ? 'bg-slate-950/30 text-indigo-600 ' : 'text-slate-400'
                  }`}
                >
                  {range === 'TODAY' ? 'Oggi' : range === '7DAYS' ? '7G' : '30G'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 border-t border-slate-50 pt-6">
            <div className="flex items-center gap-2 font-bold text-xs">
              <span className="text-slate-400 uppercase text-[10px]">Area:</span>
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value as any)}
                className="bg-transparent outline-none"
              >
                <option value="ALL">Tutte</option>
                <option value="WAITLIST">Waitlist</option>
                <option value="FLEET">Flotta</option>
                <option value="PRICING">Pricing</option>
                <option value="PAYMENTS">Pagamenti</option>
                <option value="SYSTEM">Sistema</option>
              </select>
            </div>

            <div className="flex items-center gap-2 font-bold text-xs">
              <span className="text-slate-400 uppercase text-[10px]">Gravità:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="bg-transparent outline-none"
              >
                <option value="ALL">Tutte</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer ml-auto">
              <span className="text-[10px] font-black text-slate-400 uppercase">Solo Admin</span>
              <div
                onClick={() => setOnlyAdmin(!onlyAdmin)}
                className={`w-10 h-5 rounded-full relative transition-all ${onlyAdmin ? 'bg-indigo-600' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-slate-950/30 rounded-full transition-all ${onlyAdmin ? 'left-6' : 'left-1'}`} />
              </div>
            </label>
          </div>
        </div>

        <div className="bg-slate-950/30 rounded-[40px] border border-white/10  overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/30 border-b border-white/10 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-6">Tempo</th>
                <th className="px-8 py-6">Area & Action</th>
                <th className="px-8 py-6">Target / Note</th>
                <th className="px-8 py-6">Severity</th>
                <th className="px-8 py-6">Attore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEvents.map((event) => (
                <tr
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="hover:bg-slate-950/30 cursor-pointer transition-colors group"
                >
                  <td className="px-8 py-6">
                    <div className="text-sm font-black text-white whitespace-nowrap">
                      {formatRelativeTime(event.createdAt)}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">{event.id}</div>
                  </td>

                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-400">{areaIcons[event.area]}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase">{event.area}</span>
                    </div>
                    <div className="text-[11px] font-black text-indigo-600 uppercase truncate max-w-[180px]">
                      {event.action.replace(/_/g, ' ')}
                    </div>
                  </td>

                  <td className="px-8 py-6">
                    <div className="mb-1">
                      <span className="px-2 py-0.5 bg-white/5/5 rounded text-[10px] font-bold text-slate-300/70">
                        {event.targetRef}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-200/80 line-clamp-1">{event.note}</p>
                  </td>

                  <td className="px-8 py-6">
                    <span className={`px-2.5 py-1 text-[9px] font-black rounded-full uppercase ${severityColors[event.severity]}`}>
                      {event.severity}
                    </span>
                  </td>

                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-100">{event.actor.emailMasked}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-white/5/50/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          <div className="relative w-full max-w-xl bg-slate-950/30 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            <div className="p-10 border-b border-white/10 flex justify-between items-start">
              <div>
                <div className={`p-4 rounded-3xl mb-6 inline-block ${severityColors[selectedEvent.severity]}`}>
                  {selectedEvent.severity === 'CRITICAL' ? <ShieldAlert size={32} /> : <Info size={32} />}
                </div>

                <h2 className="text-4xl font-black text-white tracking-tighter mb-4">
                  {selectedEvent.action.replace(/_/g, ' ')}
                </h2>

                <div className="flex gap-4 text-xs font-bold text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />{' '}
                    {new Date(selectedEvent.createdAt).toLocaleString('it-IT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Terminal size={14} /> {selectedEvent.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="p-3 text-slate-300 hover:text-white bg-slate-950/30 rounded-2xl"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              <div className="bg-slate-950/30 p-8 rounded-[32px] border border-white/10">
                <p className="text-lg font-medium text-slate-100 italic">"{selectedEvent.note}"</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Responsabile</h4>
                  <div className="text-sm font-black">{selectedEvent.actor.emailMasked}</div>
                  <div className="text-[10px] font-bold text-indigo-500 uppercase">
                    {selectedEvent.actor.isAdmin ? 'Admin' : 'System'}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Target</h4>
                  <div className="text-sm font-black">{selectedEvent.targetRef}</div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Metadati Operativi</h4>
                <pre className="bg-white/5/50 text-indigo-300 p-8 rounded-[32px] text-xs font-mono overflow-x-auto">
{JSON.stringify(selectedEvent.meta, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </TripLayout>
  );
}

