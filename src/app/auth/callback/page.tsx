"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function isSafeNext(nextUrl: string) {
  return nextUrl.startsWith("/") && !nextUrl.startsWith("//");
}

function CallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextUrl = useMemo(() => {
    const n = sp.get("next") || "/admin/trips";
    return isSafeNext(n) ? n : "/admin/trips";
  }, [sp]);

  const [msg, setMsg] = useState("Sto completando il login admin...");

  useEffect(() => {
    const run = async () => {
      try {
        const code = sp.get("code");
        const error = sp.get("error");
        const errorDesc = sp.get("error_description");

        if (error) {
          setMsg(`Errore login: ${errorDesc || error}`);
          return;
        }

        // 1) Completa sessione se arriva "code"
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) {
            setMsg(`Errore sessione: ${exErr.message}`);
            return;
          }
        }

        // 2) Sessione presente?
        const { data: sess } = await supabase.auth.getSession();
        const session = sess.session;

        if (!session) {
          setMsg("Sessione non trovata. Riprova dal login admin.");
          router.replace("/admin/login");
          return;
        }

        setMsg("Login OK ✅ Verifico permessi admin...");

        // 3) Verifica admin su user_roles
        const { data: roleRow, error: rErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (rErr || roleRow?.role !== "admin") {
          setMsg("Non sei autorizzato ad accedere all’area admin.");
          // fail-closed: blocco admin e mando al login cliente (o home)
          router.replace("/login");
          return;
        }

        setMsg("Admin OK ✅ Redirect...");
        router.replace(nextUrl.startsWith("/admin") ? nextUrl : "/admin/trips");
      } catch (e: any) {
        setMsg(e?.message || "Errore imprevisto");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80">
        {msg}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center p-6 text-white">
          Caricamento...
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}