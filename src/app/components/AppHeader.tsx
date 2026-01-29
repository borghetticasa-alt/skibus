'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Menu, X, Home, Shield, Ticket, UserCircle, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setIsAuthed(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const items: NavItem[] = useMemo(() => {
    const base: NavItem[] = [
      { href: '/', label: 'Home', icon: <Home size={16} /> },
      { href: '/trips', label: 'Gite', icon: <Ticket size={16} /> },
    ];

    const auth: NavItem[] = isAuthed
      ? [{ href: '/account', label: 'Area Cliente', icon: <UserCircle size={16} /> }]
      : [{ href: '/login', label: 'Login', icon: <LogIn size={16} /> }];

    const admin: NavItem[] = [{ href: '/admin/trips', label: 'Admin', icon: <Shield size={16} /> }];

    return [...base, ...auth, ...admin];
  }, [isAuthed]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10/20 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-xl bg-slate-900 overflow-hidden">
            <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'url(/dots.svg)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(56,189,248,.35), transparent 55%)' }} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Monte Rosa Bus</div>
            <div className="text-xs text-slate-300">SKI BUS</div>
          </div>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5/5 hover:text-white"
            >
              <span className="opacity-90">{it.icon}</span>
              {it.label}
            </Link>
          ))}
        </nav>

        {/* Mobile */}
        <button
          type="button"
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 text-slate-100 hover:bg-white/5/5"
          aria-label={open ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={cx('md:hidden overflow-hidden transition-[max-height] duration-300', open ? 'max-h-96' : 'max-h-0')}
      >
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur shadow-sm">
            <div className="flex flex-col p-2">
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-100 hover:bg-white/5/5"
                >
                  <span className="text-slate-200">{it.icon}</span>
                  {it.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Tip: su mobile puoi scorrere orizzontalmente i menu interni (es. Admin) se non entrano.
          </div>
        </div>
      </div>
    </header>
  );
}
