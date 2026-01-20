import React, { useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Bus,
  Users,
  Calculator,
  ShieldCheck,
} from "lucide-react";

interface NavProps {
  tripId: string;
  activeTab: string;
}

interface TabConfig {
  id: string;
  label: string;
  path: string;
  enabled: boolean;
  icon: React.ReactNode;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const TripNavigation: React.FC<NavProps> = ({ tripId, activeTab }) => {
  const tabs: TabConfig[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Riepilogo",
        path: `/admin/trips/${tripId}/overview`,
        enabled: true,
        icon: <LayoutDashboard size={16} />,
      },
      {
        id: "buses",
        label: "Mezzi",
        path: `/admin/trips/${tripId}/buses`,
        enabled: true,
        icon: <Bus size={16} />,
      },
      {
        id: "waitlist",
        label: "Waitlist",
        path: `/admin/trips/${tripId}/waitlist`,
        enabled: true,
        icon: <Users size={16} />,
      },
      {
        id: "numbers",
        label: "Economia",
        path: `/admin/trips/${tripId}/numbers`,
        enabled: true,
        icon: <Calculator size={16} />,
      },
      {
        id: "audit",
        label: "Audit",
        path: `/admin/trips/${tripId}/audit`,
        enabled: true,
        icon: <ShieldCheck size={16} />,
      },
    ],
    [tripId]
  );

  return (
    <div className="sticky top-[72px] z-20 -mx-2 px-2">
      {/* “glass strip” */}
      <div className="rounded-3xl border border-slate-200/70 bg-white/70 backdrop-blur-xl shadow-sm">
        <nav
          className="w-full overflow-x-auto no-scrollbar"
          aria-label="Trip Sub-navigation"
        >
          <div className="inline-flex items-center gap-1.5 p-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              if (!tab.enabled) {
                return (
                  <div
                    key={tab.id}
                    className="relative flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-400 cursor-not-allowed select-none"
                  >
                    <span className="opacity-70">{tab.icon}</span>
                    {tab.label}
                    <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={tab.id}
                  href={tab.path}
                  aria-current={isActive ? "page" : undefined}
                  className={cx(
                    "group relative inline-flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-xs font-black transition",
                    "ring-1 ring-transparent",
                    isActive
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 ring-slate-900/10"
                      : "text-slate-700 hover:bg-white hover:text-slate-900 hover:ring-slate-200"
                  )}
                >
                  <span
                    className={cx(
                      "transition",
                      isActive
                        ? "text-indigo-300"
                        : "text-slate-400 group-hover:text-indigo-600"
                    )}
                  >
                    {tab.icon}
                  </span>

                  <span className="tracking-tight">{tab.label}</span>

                  {/* micro highlight */}
                  {isActive ? (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-indigo-400" />
                  ) : null}

                  {/* hover glow */}
                  <span
                    className={cx(
                      "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition",
                      !isActive && "group-hover:opacity-100"
                    )}
                    style={{
                      background:
                        "radial-gradient(120px 50px at 20% 0%, rgba(99,102,241,0.18), transparent 60%)",
                    }}
                  />
                </Link>
              );
            })}
          </div>
        </nav>

        {/* tiny bottom accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-200/70 to-transparent" />
      </div>
    </div>
  );
};

export default TripNavigation;
