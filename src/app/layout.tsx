import "./globals.css";
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "SkiBus – Admin",
  description: "Gestione skibus – demo mode",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <span className="text-sm font-semibold tracking-wide">
              🚌 SkiBus <span className="text-slate-400">/ Admin</span>
            </span>

            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
              Demo mode
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-4">
          <div className="mx-auto max-w-7xl px-6 text-xs text-slate-400">
            © {new Date().getFullYear()} SkiBus – demo
          </div>
        </footer>
      </body>
    </html>
  );
}
