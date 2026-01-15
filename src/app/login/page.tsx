import Link from 'next/link';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { redirect?: string };
}) {
  const redirectTo = searchParams?.redirect || '/admin/trips';
  const loginHref = `/api/dev-login?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Console Admin</div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Login</h1>
        <p className="mt-3 text-sm font-medium text-slate-500 leading-relaxed">
          Questa pagina è un accesso <span className="font-bold">demo</span> (per sbloccare la UI su Netlify).
          In produzione collegherai qui Supabase/Auth reale.
        </p>

        <div className="mt-8 space-y-3">
          <a
            href={loginHref}
            className="block w-full rounded-2xl bg-slate-900 py-4 text-center text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all"
          >
            Entra (demo)
          </a>

          <Link
            href="/"
            className="block w-full rounded-2xl border border-slate-200 bg-white py-4 text-center text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all"
          >
            Torna alla home
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Redirect previsto: <span className="font-mono">{redirectTo}</span>
        </p>
      </div>
    </main>
  );
}
