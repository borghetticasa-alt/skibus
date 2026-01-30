import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get('redirect') || '/admin/trips';

  const dest = new URL(redirectTo, url);
  const res = NextResponse.redirect(dest);

  // Cookie “stub” per far passare la middleware demo (che controlla la presenza di una cookie sb-*)
  res.cookies.set('sb-dev', '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
  });

  return res;
}
