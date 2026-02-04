import Link from "next/link";
import { headers } from "next/headers";

type PublicTrip = {
  id: string;
  title?: string | null;
  destination?: string | null;
  tripDate?: string | null;
  status?: string | null;
  price?: number | string | null;
};

type TripDetailResponse =
  | { status: "success"; data: PublicTrip }
  | { status: "error"; error: string }
  | any;

async function getBaseUrlFromHeaders() {
  const h = await headers(); // Next 16: headers() è async
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}

async function fetchTripDetail(id: string): Promise<PublicTrip> {
  const baseUrl = await getBaseUrlFromHeaders();

  // standard unico: ?id=
  const url = `${baseUrl}/api/public-api/get-trip-detail?id=${encodeURIComponent(id)}`;

  const res = await fetch(url, { cache: "no-store" });
  const json: TripDetailResponse = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (json?.status === "success") return json.data as PublicTrip;
  if (json?.data) return json.data as PublicTrip; // fallback
  return json as PublicTrip;
}

function formatDate(itIso: string | null | undefined) {
  if (!itIso) return "";
  const d = new Date(itIso); // accetta sia "2026-02-04" che ISO completo
  if (Number.isNaN(d.getTime())) return String(itIso);
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "full" }).format(d);
}

export default async function TripDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const tripId = String(resolvedParams?.id || "").trim();

  if (!tripId) {
    return (
      <div className="p-6 text-white">
        <div className="text-xl font-black">Gita non valida</div>
        <div className="text-sm text-slate-300/70 mt-2">Manca l’ID nella route.</div>
        <div className="mt-4">
          <Link className="underline" href="/trips">
            Torna alle gite
          </Link>
        </div>
      </div>
    );
  }

  try {
    const trip = await fetchTripDetail(tripId);

    const title = trip?.destination || trip?.title || "Gita";
    const dateLabel = formatDate(trip?.tripDate || "");
    const priceLabel =
      trip?.price === null || trip?.price === undefined || trip?.price === ""
        ? ""
        : `€ ${trip.price}`;
    const statusLabel = trip?.status ? String(trip.status) : "";

    return (
      <div className="p-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-300/70">Dettagli gita</div>
            <div className="text-2xl font-black mt-1">{title}</div>

            <div className="mt-4 space-y-2 text-sm text-slate-200/80">
              {dateLabel ? (
                <div className="flex gap-2">
                  <span className="text-slate-300/70 w-20">Data</span>
                  <span className="font-bold">{dateLabel}</span>
                </div>
              ) : null}

              {priceLabel ? (
                <div className="flex gap-2">
                  <span className="text-slate-300/70 w-20">Prezzo</span>
                  <span className="font-bold">{priceLabel}</span>
                </div>
              ) : null}

              {statusLabel ? (
                <div className="flex gap-2">
                  <span className="text-slate-300/70 w-20">Stato</span>
                  <span className="font-bold">{statusLabel}</span>
                </div>
              ) : null}
            </div>
          </div>

          <Link
            href="/trips"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black hover:bg-white/10"
          >
            Torna
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <div className="text-sm font-black">Prenotazione</div>
          <div className="text-sm text-slate-300/80 mt-2">
            Prenota la gita dal checkout. Qui manterremo solo le informazioni essenziali lato cliente.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/checkout?tripId=${encodeURIComponent(tripId)}&busRunId=${encodeURIComponent(tripId)}`}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/15 border border-white/10"
            >
              Prenota
            </Link>

            <Link
              href="/trips"
              className="rounded-xl px-4 py-2 text-sm font-black border border-white/10 hover:bg-white/5"
            >
              Vedi altre gite
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (e: any) {
    return (
      <div className="p-6 text-white">
        <div className="text-xl font-black">Errore caricamento gita</div>
        <div className="text-sm text-rose-300/80 mt-2">{e?.message ?? "Errore"}</div>
        <div className="mt-4">
          <Link className="underline" href="/trips">
            Torna alle gite
          </Link>
        </div>
      </div>
    );
  }
}
