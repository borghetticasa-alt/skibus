
import React from 'react';
import Link from 'next/link';

interface NavProps {
  tripId: string;
  activeTab: string;
}

interface TabConfig {
  id: string;
  label: string;
  path: string;
  enabled: boolean;
}

const TripNavigation: React.FC<NavProps> = ({ tripId, activeTab }) => {
  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Riepilogo', path: `/admin/trips/${tripId}/overview`, enabled: true },
    { id: 'buses', label: 'Gestione Bus', path: `/admin/trips/${tripId}/buses`, enabled: true },
    { id: 'waitlist', label: 'Waitlist', path: `/admin/trips/${tripId}/waitlist`, enabled: true },
    { id: 'numbers', label: 'Economia', path: `/admin/trips/${tripId}/numbers`, enabled: true },
    { id: 'audit', label: 'Audit Log', path: `/admin/trips/${tripId}/audit`, enabled: true },
    // Esempio di tab futura disabilitata
    // { id: 'marketing', label: 'Marketing', path: '#', enabled: false },
  ];

  return (
    <nav className="flex items-center space-x-2 bg-slate-200/50 p-1.5 rounded-2xl mb-8 w-fit overflow-x-auto no-scrollbar border border-slate-200/60 shadow-inner" aria-label="Trip Sub-navigation">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        if (!tab.enabled) {
          return (
            <div
              key={tab.id}
              className="relative flex items-center px-6 py-2.5 text-sm font-bold text-slate-400 cursor-not-allowed"
            >
              {tab.label}
              <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-[8px] font-black uppercase tracking-tighter rounded">
                In arrivo
              </span>
            </div>
          );
        }

        return (
          <Link
            key={tab.id}
            href={tab.path}
            className={`
              relative flex items-center whitespace-nowrap px-6 py-2.5 text-sm font-black rounded-xl transition-all duration-200
              ${isActive 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/70 scale-[1.02]' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
              }
            `}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default TripNavigation;
