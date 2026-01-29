'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function normalizeEmail(raw: string) {
  return (raw || '').trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
}

function isEmailLike(v: string) {
  const email = normalizeEmail(v);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}






export default function LoginPage() {
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/account';

  const [tab, setTab] = useState<'customer' | 'admin'>('customer');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adminRedirect = useMemo(() => params.get('adminRedirect') || '/admin/trips', [params]);
  const adminLoginHref = `/login?redirect=${encodeURIComponent(adminRedirect)}`;

  const sendLink = async () => {
    setError(null);
    const emailClean = normalizeEmail(email);
    if (!isEmailLike(emailClean)) {
      setError('Inserisci una email valida.');
      return;
    }
setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: emailClean,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setError(e?.message || 'Errore durante invio link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl glass glow p-6 md:p-8 border border-white/10">
        <div className="flex gap-2 rounded-2xl border border-white/10 bg-slate-950/30 p-1">
          <button
            type="button"
            onClick={() => setTab('customer')}
            className={
              tab === 'customer'
                ? 'flex-1 rounded-xl bg-white/5/10 px-4 py-2 text-sm font-black text-white'
                : 'flex-1 rounded-xl px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5/5'
            }
          >
            Cliente
          </button>
          <button
            type="button"
            onClick={() => setTab('admin')}
            className={
              tab === 'admin'
                ? 'flex-1 rounded-xl bg-white/5/10 px-4 py-2 text-sm font-black text-white'
                : 'flex-1 rounded-xl px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/5/5'
            }
          >
            Admin
          </button>
        </div>

        {tab === 'customer' && (
          <div className="mt-6 space-y-4">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-300/70">
              Accesso cliente
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Entra nell’Area Cliente
            </h1>
            <p className="text-sm text-slate-200/80">
              Ti inviamo un link magico via email. Niente password, niente drammi.
            </p>

            {!sent ? (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-300">Email</label>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
                  <Mail size={18} className="text-slate-300" />
                  <input
                    className="w-full bg-transparent outline-none text-white placeholder:text-slate-500"
                    placeholder="nome@dominio.it"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {error && <div className="text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3">{error}</div>}

                <button
                  onClick={sendLink}
                  disabled={loading}
                  className="btn-tech w-full rounded-2xl px-5 py-4 text-sm font-black text-white disabled:opacity-50"
                >
                  {loading ? 'Invio in corso…' : 'Invia link di accesso'}
                </button>

                <div className="text-xs text-slate-300/70">
                  Dopo il click sul link verrai reindirizzato su: <span className="text-white/80">{redirect}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-200" />
                  <div>
                    <div className="font-black text-white">Link inviato!</div>
                    <div className="text-sm text-slate-100/80">
                      Controlla la tua email e clicca sul link per entrare.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'admin' && (
          <div className="mt-6 space-y-4">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-300/70">
              Accesso amministrazione
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Login Admin (dev)
            </h2>
            <p className="text-sm text-slate-200/80">
              Questa è una scorciatoia di sviluppo. In produzione useremo un accesso admin dedicato.
            </p>

            <a
              href={adminLoginHref}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white/5/10 px-5 py-4 text-sm font-black text-white hover:bg-white/5/15 border border-white/10"
            >
              <Shield size={18} />
              Entra in Admin
              <ArrowRight size={18} />
            </a>

            <div className="text-xs text-slate-300/70">
              Redirect admin: <span className="text-white/80">{adminRedirect}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}