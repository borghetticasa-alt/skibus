import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ✅ Next.js 16: proxy entrypoint
export function proxy(req: NextRequest) {
  // Se avevi logica nel vecchio middleware, incollala qui dentro.
  return NextResponse.next();
}

// (opzionale ma consigliato) mantiene la stessa config di prima
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
