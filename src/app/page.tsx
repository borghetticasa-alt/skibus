
import Link from 'next/link';
import { Bus, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
      <div className="text-center max-w-md">
        <div className="inline-flex p-4 bg-indigo-600 rounded-3xl mb-8 shadow-2xl shadow-indigo-500/20">
          <Bus size={48} />
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-4">Monte Rosa Bus</h1>
        <p className="text-slate-400 mb-10 leading-relaxed">
          Benvenuto nella piattaforma di gestione logistica per le tratte Milano &harr; Gressoney.
        </p>
        
        <Link 
          href="/admin/trips"
          className="group flex items-center justify-center gap-3 w-full bg-white text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-xl"
        >
          Accedi alla Console Admin
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </Link>
        
        <p className="mt-8 text-xs text-slate-500 font-medium uppercase tracking-widest">
          Proprietà di Monte Rosa Logistics S.r.l.
        </p>
      </div>
    </div>
  );
}
