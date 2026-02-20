"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function SignupPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextUrl = useMemo(() => sp.get("next") || "/account", [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function signUp() {
    setError(null);

    const e = email.trim().toLowerCase();
    if (!e.includes("@")) {
      setError("Inserisci un’email valida.");
      setStatus("error");
      return;
    }
    if (password.length < 6) {
      setError("Password troppo corta (min 6 caratteri).");
      setStatus("error");
      return;
    }

    setStatus("loading");

    const { error: err } = await supabase.auth.signUp({
      email: e,
      password,
    });

    if (err) {
      setError(err.message);
      setStatus("error");
      return;
    }

    router.push(nextUrl);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="text-2xl font-black">Crea account</div>
        <div className="mt-2 text-sm text-white/70">
          Registrati per prenotare le gite.
        </div>

        <div className="mt-5 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@dominio.com"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6)"
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          />

          <button
            onClick={signUp}
            disabled={status === "loading"}
            className="w-full rounded-2xl bg-indigo-600 px-4 py-3 font-black disabled:opacity-60"
          >
            {status === "loading" ? "Creazione..." : "Crea account"}
          </button>

          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm">
              {error}
            </div>
          )}

          <div className="pt-2 text-sm">
            <Link className="text-white/80 hover:text-white underline" href={`/login?next=${encodeURIComponent(nextUrl)}`}>
              Hai già un account? Accedi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-white/70">Caricamento…</div>}>
      <SignupPageInner />
    </Suspense>
  );
}
