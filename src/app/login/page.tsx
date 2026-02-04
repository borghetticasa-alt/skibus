"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function isSafeNext(nextUrl: string) {
  return nextUrl.startsWith("/") && !nextUrl.startsWith("//");
}

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextUrl = useMemo(() => {
    const n = sp.get("next") || "/trips";
    return isSafeNext(n) ? n : "/trips";
  }, [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
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

    const { error: err } = await supabase.auth.signInWithPassword({
      email: e,
      password,
    });

    if (err) {
      setError(err.message);
      setStatus("error");
      return;
    }

    router.replace(nextUrl);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="text-2xl font-black">Login Cliente</div>
        <div className="mt-2 text-sm text-white/70">
          Accedi con email e password per prenotare.
        </div>

        <div className="mt-5 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@dominio.com"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
            autoComplete="email"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
            autoComplete="current-password"
          />

          <button
            onClick={signIn}
            disabled={status === "loading"}
            className="w-full rounded-2xl bg-indigo-600 px-4 py-3 font-black disabled:opacity-60"
          >
            {status === "loading" ? "Accesso..." : "Accedi"}
          </button>

          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 text-sm">
            <Link
              className="text-white/80 hover:text-white underline"
              href={`/signup?next=${encodeURIComponent(nextUrl)}`}
            >
              Crea account
            </Link>

            <Link className="text-white/60 hover:text-white underline" href="/">
              Torna al sito
            </Link>
          </div>

          {/* Link admin “nascosto” (opzionale): lo teniamo discreto */}
          <div className="pt-4 text-center">
            <Link className="text-white/30 hover:text-white/60 text-xs underline" href="/admin/login">
              Area staff
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}