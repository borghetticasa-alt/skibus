import { Suspense } from 'react';
import AuthCallbackClient from './AuthCallbackClient';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Verifico accesso…</div>}>
      <AuthCallbackClient />
    </Suspense>
  );
}
