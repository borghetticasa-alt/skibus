"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function isSafeNext(nextUrl: string) {
  return nextUrl.startsWith("/") && !nextUrl.startsWith("//");
}

export default function AdminLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextUrl = useMemo(() => {
    const n = sp.get("next") || "/admin/trips";
    return isSafeNext(n) ? n : "/admin/trips";
  }, [sp]);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const sendMagicLink = async () => {
    setError(null);

    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setError("Inserisci un’email valida.");
      setStatus("error");
      return;
    }

    setStatus("sending");

    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    // ✅ callback admin-only
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

    const { error: err } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: redirectTo },
    });

    if (err) {
      setError(err.message);
      setStatus("error");
      return;
    }

    setStatus("sent");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="text-2xl font-black">Accesso Staff</div>
        <div className="mt-2 text-sm text-white/70">
          Area riservata. Inserisci l’email staff: riceverai un link per accedere.
        </div>

        <div className="mt-5 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@dominio.com"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
            autoComplete="email"
          />

          <button
            onClick={sendMagicLink}
            disabled={status === "sending"}
            className="w-full rounded-2xl bg-indigo-600 px-4 py-3 font-black disabled:opacity-60"
          >
            {status === "sending" ? "Invio..." : "Invia link"}
          </button>

          {status === "sent" && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm">
              Email inviata ✅ Apri la mail e clicca il link.
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={() => router.push("/")}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10"
          >
            Torna al sito
          </button>
        </div>
      </div>
    </div>
  );
}