"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type GateState = "checking" | "ok" | "forbidden";

function buildSafeNext(pathname: string | null) {
  if (pathname && pathname.startsWith("/admin") && pathname !== "/admin/login") return pathname;
  return "/admin/trips";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // ✅ BYPASS: la pagina /admin/login deve essere sempre accessibile
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const safeNext = useMemo(() => buildSafeNext(pathname || null), [pathname]);
  const [state, setState] = useState<GateState>("checking");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session?.user?.id) {
          router.replace(`/admin/login?next=${encodeURIComponent(safeNext)}`);
          return;
        }

        const { data: roleRow, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error || roleRow?.role !== "admin") {
          if (!cancelled) setState("forbidden");
          return;
        }

        if (!cancelled) setState("ok");
      } catch {
        if (!cancelled) setState("forbidden");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router, safeNext]);

  if (state === "checking") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-white">
        Verifica accesso admin...
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6">
          <div className="text-lg font-black">Accesso negato</div>
          <div className="mt-2 text-sm text-white/70">
            Questo account non è autorizzato per l’area admin.
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/15 border border-white/10"
              onClick={() => router.replace("/")}
            >
              Home
            </button>

            <button
              className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black hover:bg-indigo-700"
              onClick={() =>
                router.replace(`/admin/login?next=${encodeURIComponent(safeNext)}`)
              }
            >
              Login staff
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}