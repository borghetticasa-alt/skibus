
import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Monte Rosa Bus | Admin Console',
  description: 'Gestione flotta e prenotazioni bus sciistici',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
