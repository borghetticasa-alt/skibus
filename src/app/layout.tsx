import React from "react";
import "./globals.css";

export const metadata = {
  title: "Monte Rosa Bus | Admin Console",
  description: "Gestione flotta e prenotazioni bus sciistici",
};

function TopBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-900" aria-hidden />
          <div className="leading-tight">
            <div className="text-sm font-semibold">Monte Rosa Bus</div>
            <div className="text-xs text-slate-500">Console</div>
          </div>
        </div>

        <nav className="flex items-center gap-4 text-sm">
          <a className="text-slate-600 hover:text-slate-900" href="/">
            Home
          </a>
          <a className="text-slate-600 hover:text-slate-900" href="/admin/trips">
            Admin
          </a>
          <a className="text-slate-600 hover:text-slate-900" href="/checkout">
            Checkout
          </a>
          <a className="text-slate-600 hover:text-slate-900" href="/login">
            Login
          </a>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="pb-10 text-center text-xs text-slate-500">
      <div className="mx-auto max-w-6xl px-6">
        © {new Date().getFullYear()} Monte Rosa Bus
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <TopBar />

        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            {children}
          </div>
        </main>

        <Footer />
      </body>
    </html>
  );
}
