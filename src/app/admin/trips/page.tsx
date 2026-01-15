
import React from 'react';
import { Bus, Calendar, Users, ArrowRight, AlertCircle } from 'lucide-react';

const TRIPS_MOCK = [
  {
    id: 'mr-001',
    destination: 'Gressoney-La-Trinité',
    date: '2025-02-22',
    status: 'CONFIRMED',
    seats_sold: 48,
    capacity: 52,
    sla: 'GREEN',
    alerts: 0
  },
  {
    id: 'mr-002',
    destination: 'Champoluc',
    date: '2025-02-23',
    status: 'SOFT_HOLD',
    seats_sold: 12,
    capacity: 20,
    sla: 'YELLOW',
    alerts: 2
  }
];

export default function TripsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Monte Rosa Bus</h1>
          <p className="text-slate-500">Gestione flotta e partenze stagionali</p>
        </div>
        <button className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
          + Nuovo Viaggio
        </button>
      </div>

      <div className="grid gap-4">
        {TRIPS_MOCK.map((trip) => (
          <a 
            key={trip.id} 
            href={`/admin/trips/${trip.id}/overview`}
            className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-6">
              <div className={`w-3 h-12 rounded-full ${trip.sla === 'GREEN' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-800">{trip.destination}</h2>
                  <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-500">{trip.id}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1"><Calendar size={14}/> {trip.date}</span>
                  <span className="flex items-center gap-1"><Bus size={14}/> {trip.status}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-12">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Occupancy</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500" 
                      style={{ width: `${(trip.seats_sold / trip.capacity) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{trip.seats_sold}/{trip.capacity}</span>
                </div>
              </div>
              
              {trip.alerts > 0 && (
                <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  <AlertCircle size={16} />
                  <span className="text-xs font-bold">{trip.alerts} Alert</span>
                </div>
              )}

              <ArrowRight className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
