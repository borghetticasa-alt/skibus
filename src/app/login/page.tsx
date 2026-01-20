"use client";

import React, { use } from "react";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string }> | { redirect?: string };
}) {
  const resolved =
    searchParams instanceof Promise ? use(searchParams) : searchParams;

  const redirectTo = resolved?.redirect || "/admin/trips";
  const loginHref = `/api/dev-login?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Accesso
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
          Login Admin
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Verrai reindirizzato dopo l’accesso.
        </p>

        <a
          href={loginHref}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700 transition"
        >
          Entra
        </a>

        <div className="mt-4 text-xs font-semibold text-slate-400">
          Redirect: <span className="text-slate-600">{redirectTo}</span>
        </div>
      </div>
    </div>
  );
}