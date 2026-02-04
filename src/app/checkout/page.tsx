import { Suspense } from 'react';
import CheckoutClient from './CheckoutClient';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Caricamento checkout…</div>}>
      <CheckoutClient />
    </Suspense>
  );
}
