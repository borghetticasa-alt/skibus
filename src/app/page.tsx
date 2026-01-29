import Link from 'next/link';
import { ArrowRight, Ticket, Shield, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 md:p-10">
      <div className="absolute inset-0 opacity-70" aria-hidden>
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute top-10 right-0 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl" />
      </div>

      <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full badge-tech px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-200">
            <Sparkles size={14} /> prenotazioni smart
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            SKI BUS, ma con il turbo.
          </h1>

          <p className="text-slate-200/80 leading-relaxed">
            Prenota la tua gita, inserisci i partecipanti, paga online e arriva al check-in con un QR.
            Meno telefonate, più neve.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/trips"
              className="btn-tech inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-black text-white shadow-xl shadow-cyan-500/10"
            >
              Vedi le gite
              <ArrowRight className="transition-transform group-hover:translate-x-1" size={18} />
            </Link>

            <Link
              href="/admin/trips"
<<<<<<< HEAD
              className="inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-black text-white/90 border border-white/10 hover:bg-white/5/5"
=======
              className="inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-black text-white/90 border border-white/10 hover:bg-white/5"
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
            >
              <Shield size={18} />
              Console Admin
            </Link>
          </div>

          <div className="text-xs text-slate-300/70">
            Tecnologia utile, non complicata: disponibilità posti, pagamenti e conferme in un flusso unico.
          </div>
        </div>

        <div className="relative">
<<<<<<< HEAD
          <div className="rounded-3xl border border-white/10 bg-white/5/5 p-5 md:p-6 backdrop-blur">
=======
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6 backdrop-blur">
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-white">Anteprima flusso</div>
              <div className="text-xs text-slate-300">cliente → pagamento → QR</div>
            </div>

            <div className="mt-5 space-y-3">
              {['Scegli gita e posti disponibili', 'Inserisci partecipanti (anche 10+)', 'Paga con Stripe/PayPal', 'Ricevi QR e check-in rapido'].map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
                  <div className="h-8 w-8 rounded-xl bg-cyan-400/15 border border-cyan-300/20 flex items-center justify-center text-cyan-200 font-black">
                    {i + 1}
                  </div>
                  <div className="text-sm text-slate-100">{t}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div className="text-xs text-slate-300">Pro tip</div>
              <div className="text-sm text-white font-semibold">
                Il sistema blocca i posti per pochi minuti mentre paghi, così non te li soffia nessuno.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
