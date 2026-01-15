import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// IMPORTANT (Netlify/Edge):
// Il middleware gira su Edge Runtime. Evitiamo dipendenze Node-only o pacchetti
// non presenti (es. '@supabase/ssr') che rompono la build su Netlify.
//
// Qui applichiamo un controllo "light" basato su cookie per proteggere /admin.
// In produzione, puoi sostituire questo controllo con una verifica robusta
// (es. JWT verification) in una Route Handler / API route (runtime Node).

/**
 * Middleware di protezione per /admin
 * Richiede una sessione Supabase valida (cookie).
 *
 * Nota: in Next 15+/16 potresti vedere un warning su "middleware" vs "proxy":
 * è un warning, non blocca la build.
 */
export async function middleware(req: NextRequest) {
  // Guardiamo solo /admin (keep it fast)
  if (!req.nextUrl.pathname.startsWith('/admin')) return NextResponse.next();

  // Heuristica: se esiste un cookie Supabase (tipicamente "sb-..."), consideriamo loggato.
  // Questo evita di importare SDK nel middleware Edge.
  const hasSupabaseCookie = req.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') || c.name.includes('supabase'));

  if (!hasSupabaseCookie) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
