"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  role?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  age?: number | null;
  phone?: string | null;
};

function isComplete(p: Profile | null) {
  if (!p) return false;
  const ok =
    (p.first_name || "").trim().length > 0 &&
    (p.last_name || "").trim().length > 0 &&
    typeof p.age === "number" &&
    p.age >= 1 &&
    (p.phone || "").trim().length >= 6;
  return ok;
}

export default function AccountPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextUrl = useMemo(() => sp.get("next") || "/trips", [sp]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<number>(18);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErr(null);
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      const session = sess.session;

      if (!session) {
        router.replace(`/login?next=${encodeURIComponent(`/account?next=${encodeURIComponent(nextUrl)}`)}`);
        return;
      }

      const uid = session.user.id;

      // Leggi profilo
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, first_name, last_name, age, phone")
        .eq("id", uid)
        .maybeSingle();

      if (error) {
        if (!cancelled) setErr(error.message);
        setLoading(false);
        return;
      }

      // Se non esiste, crealo (default client)
      let p = data as Profile | null;
      if (!p) {
        const ins = await supabase.from("profiles").insert({ id: uid, role: "client" }).select().single();
        if (ins.error) {
          if (!cancelled) setErr(ins.error.message);
          setLoading(false);
          return;
        }
        p = ins.data as Profile;
      }

      if (cancelled) return;

      setProfile(p);
      setFirstName(p.first_name || "");
      setLastName(p.last_name || "");
      setAge(typeof p.age === "number" ? p.age : 18);
      setPhone(p.phone || "");
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router, nextUrl]);

  async function save() {
    setErr(null);

    const fn = firstName.trim();
    const ln = lastName.trim();
    const ph = phone.trim();

    if (!fn || !ln) {
      setErr("Inserisci nome e cognome.");
      return;
    }
    if (!age || age < 1) {
      setErr("Inserisci un’età valida.");
      return;
    }
    if (ph.length < 6) {
      setErr("Inserisci un numero di cellulare valido.");
      return;
    }

    setSaving(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const session = sess.session;
      if (!session) {
        router.replace(`/login?next=${encodeURIComponent(`/account?next=${encodeURIComponent(nextUrl)}`)}`);
        return;
      }

      const uid = session.user.id;

      const { error } = await supabase.from("profiles").update({
        first_name: fn,
        last_name: ln,
        age,
        phone: ph,
      }).eq("id", uid);

      if (error) throw error;

      const updated: Profile = { id: uid, first_name: fn, last_name: ln, age, phone: ph, role: profile?.role || "client" };
      setProfile(updated);

      router.push(nextUrl);
    } catch (e: any) {
      setErr(e?.message || "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 space-y-6 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-3xl font-black">Il tuo profilo</div>
          <div className="text-sm text-white/70 mt-1">
            Prima di prenotare devi completare i dati.
          </div>
        </div>

        <Link className="text-sm underline text-white/70 hover:text-white" href="/trips">
          Vai alle gite
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Caricamento profilo…
        </div>
      ) : (
        <>
          {err && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm">
              {err}
            </div>
          )}

          {profile && isComplete(profile) ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm">
              Profilo completo ✅
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
              Completa i dati per continuare.
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nome"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Cognome"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              />
              <input
                value={age}
                onChange={(e) => setAge(Number(e.target.value) || 0)}
                placeholder="Età"
                type="number"
                min={1}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Cellulare"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
              />
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-2xl bg-indigo-600 px-4 py-3 font-black disabled:opacity-60"
            >
              {saving ? "Salvataggio..." : "Salva e continua"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
