import React from "react";
import "./globals.css";
import AppHeader from "./components/AppHeader";

export const metadata = {
  title: "Monte Rosa Bus | SKI BUS",
  description: "Prenota e gestisci gite in bus verso le piste, con pagamenti online e check-in rapido.",
};

function Footer() {
  return (
    <footer className="pb-10 text-center text-xs text-slate-200/70">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
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
      <body
        className="min-h-screen text-slate-100 antialiased"
        style={{
          backgroundImage:
            "linear-gradient(rgba(2,6,23,0.70), rgba(2,6,23,0.70)), url('/bg-ski.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <AppHeader />

        <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
          <div className="rounded-3xl glass glow p-4 md:p-6">
            {children}
          </div>
        </main>

        <Footer />
      </body>
    </html>
  );
}
