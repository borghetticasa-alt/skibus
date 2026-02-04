"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type UiStatus = "loading" | "success" | "error";

function PayPalReturnInner() {
  const router = useRouter();
  const search = useSearchParams();

  const orderId = useMemo(() => {
    return search.get("token") || search.get("orderId") || "";
  }, [search]);

  const bookingId = useMemo(() => {
    return search.get("bookingId") || "";
  }, [search]);

  const [status, setStatus] = useState<UiStatus>("loading");
  const [message, setMessage] = useState<string>("Sto verificando l’autorizzazione PayPal…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!orderId) {
        setStatus("error");
        setMessage("Parametro PayPal mancante (orderId/token).");
        return;
      }
      if (!bookingId) {
        setStatus("error");
        setMessage("Parametro mancante: bookingId.");
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          setStatus("error");
          setMessage("Devi essere loggato per completare PayPal. Ti porto al login…");
          setTimeout(() => {
            if (!cancelled) {
              const next = `/paypal/return?bookingId=${encodeURIComponent(bookingId)}&token=${encodeURIComponent(orderId)}`;
              router.push(`/login?next=${encodeURIComponent(next)}`);
            }
          }, 900);
          return;
        }

        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId, bookingId }),
        });

        const json = await res.json().catch(() => ({} as any));
        if (cancelled) return;

        if (!res.ok || !json?.success) {
          setStatus("error");
          setMessage(json?.error || "Autorizzazione PayPal non completata. Riprova o contatta l’assistenza.");
          return;
        }

        setStatus("success");
        setMessage("Autorizzazione registrata ✅ (l’incasso avverrà quando la gita viene confermata)");

        setTimeout(() => {
          if (!cancelled) router.push(`/account?highlight=${encodeURIComponent(bookingId)}`);
        }, 1200);
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e?.message || "Errore di rete durante la conferma PayPal.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [orderId, bookingId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-slate-950/40 p-8 space-y-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">PayPal Return</div>

        <h1 className="text-2xl font-black text-white tracking-tight">
          {status === "loading" && "Sto verificando…"}
          {status === "success" && "Tutto ok"}
          {status === "error" && "Problema"}
        </h1>

        <p className={`text-sm font-semibold leading-relaxed ${status === "error" ? "text-rose-200" : "text-slate-200/80"}`}>
          {message}
        </p>

        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-xs font-mono text-slate-300/80 space-y-1">
          <div>
            <span className="text-slate-400">orderId:</span> {orderId || "—"}
          </div>
          <div>
            <span className="text-slate-400">bookingId:</span> {bookingId || "—"}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20"
          >
            Vai ad Account
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-700"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayPalReturnPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-200/70">Caricamento…</div>}>
      <PayPalReturnInner />
    </Suspense>
  );
}
