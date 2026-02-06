'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { TripLayout } from '@/components/admin/TripLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';

type PricingModel = 'per_person' | 'per_booking' | 'quantity' | 'options';
type InternalCostModel = 'fixed' | 'per_person';

type ServiceOption = {
  id: string;
  label: string;
  sale: number;
  cost: number;
};

type ServiceItem = {
  id: string;
  active: boolean;
  visibleToUser: boolean;
  required: boolean;
  name: string;
  description?: string;
  model: PricingModel;
  sale: number;
  cost: number;
  qty: number;
  options?: ServiceOption[];
  selectedOptionId?: string;
};

type InternalCostItem = {
  id: string;
  active: boolean;
  name: string;
  model: InternalCostModel;
  value: number;
};

type NumbersApiResponse = {
  tripId: string;
  numbers: any | null;
  services: any[];
  internalCosts: any[];
};

function euro(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function clamp0(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v;
}

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Fetch JSON con auth Supabase:
 * - prende access_token da localStorage (key: sb-access-token) oppure prova varie key comuni
 * - manda Authorization: Bearer <token>
 */
async function fetchJson<T>(url: string, init?: RequestInit & { withAuth?: boolean }) {
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');

  if (init?.withAuth) {
    // chiavi “possibili” (dipende da come hai salvato il token)
    const token =
      (typeof window !== 'undefined' && window.localStorage.getItem('sb-access-token')) ||
      (typeof window !== 'undefined' && window.localStorage.getItem('supabase.access_token')) ||
      (typeof window !== 'undefined' && window.localStorage.getItem('access_token')) ||
      '';

    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // se non è JSON, lo trasformo in errore leggibile
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    return {} as T;
  }

  if (!res.ok) {
    throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
  }
  return json as T;
}

export default function NumbersPage() {
  const BUS_OPTIONS = [
    { id: 'small', label: 'Bus Piccolo', capacity: 34 },
    { id: 'medium', label: 'Bus Medio', capacity: 49 },
    { id: 'large', label: 'Bus Grande', capacity: 59 },
  ] as const;

  const params = useParams();
  const tripId = String((params as any)?.id || '');

  // ===== UI: modalità prova =====
  const [testMode, setTestMode] = useState(true);

  // ===== Bus / capacity =====
  const [busId, setBusId] = useState<string>('small');
  const selectedBus = BUS_OPTIONS.find((b) => b.id === busId) || BUS_OPTIONS[0];

  const [capacity, setCapacity] = useState<number>(selectedBus.capacity);
  const [busCostTotal, setBusCostTotal] = useState<number>(0);

  // ===== Partecipanti =====
  const [holds, setHolds] = useState<number>(0);
  const [participants, setParticipants] = useState<number>(21);

  // ===== Base gita =====
  const [baseSalePP, setBaseSalePP] = useState<number>(35);
  const [baseCostPP, setBaseCostPP] = useState<number>(25);

  // ===== Servizi =====
  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 'svc_pranzo',
      active: true,
      visibleToUser: true,
      required: false,
      name: 'Pranzo convenzionato',
      description: 'Opzione extra (facoltativa)',
      model: 'per_person',
      sale: 12,
      cost: 8,
      qty: 0,
    },
    {
      id: 'svc_ass',
      active: true,
      visibleToUser: true,
      required: false,
      name: 'Assicurazione extra',
      description: 'Copertura aggiuntiva (facoltativa)',
      model: 'per_person',
      sale: 3,
      cost: 1.2,
      qty: 0,
    },
    {
      id: 'svc_noleggio',
      active: true,
      visibleToUser: true,
      required: false,
      name: 'Noleggio attrezzatura',
      description: 'Seleziona un’opzione',
      model: 'options',
      sale: 0,
      cost: 0,
      qty: 0,
      options: [
        { id: 'opt_none', label: 'Nessuno', sale: 0, cost: 0 },
        { id: 'opt_sci', label: 'Sci', sale: 15, cost: 11 },
        { id: 'opt_snow', label: 'Snowboard', sale: 18, cost: 13 },
      ],
      selectedOptionId: 'opt_none',
    },
  ]);

  // ===== Costi interni =====
  const [internalCosts, setInternalCosts] = useState<InternalCostItem[]>([
    { id: 'c_pedaggi', active: true, name: 'Pedaggi / ZTL', model: 'fixed', value: 120 },
    { id: 'c_parking', active: true, name: 'Parcheggi', model: 'fixed', value: 60 },
  ]);

  // ===== Fee pagamenti (stima) =====
  const [includePaypal, setIncludePaypal] = useState(true);
  const [includeStripe, setIncludeStripe] = useState(true);

  const [paypalPct, setPaypalPct] = useState<number>(3.4);
  const [paypalFixed, setPaypalFixed] = useState<number>(0.35);

  const [stripePct, setStripePct] = useState<number>(1.5);
  const [stripeFixed, setStripeFixed] = useState<number>(0.25);

  const [paypalShare, setPaypalShare] = useState<number>(60);
  const [stripeShare, setStripeShare] = useState<number>(40);

  const [targetMargin, setTargetMargin] = useState<number>(350);

  // ===== DB state =====
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbSavedAt, setDbSavedAt] = useState<string | null>(null);

  // ===== Helpers UI classes: sempre scuro =====
  const cardDark =
    'rounded-2xl border border-white/10 bg-slate-950/40 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03)]';
  const inputDark =
    'w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white placeholder:text-slate-400';
  const labelMuted = 'text-xs font-black text-slate-200/70 mb-1';

  // ===== Bus change -> capacity =====
  useEffect(() => {
    setCapacity(selectedBus.capacity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId]);

  // ===== Load/Save =====
  async function loadFromDb(id: string) {
    setDbLoading(true);
    setDbError(null);
    try {
      const data = await fetchJson<NumbersApiResponse>(`/api/admin/trips/${id}/numbers`, { withAuth: true });
      const n = data?.numbers;

      if (n) {
        const bid = String(n.bus_id || 'small');
        setBusId(bid);

        const bus = BUS_OPTIONS.find((b) => b.id === bid) || BUS_OPTIONS[0];
        setCapacity(Number(n.capacity || 0) || bus.capacity);

        setBusCostTotal(Number(n.bus_cost_total || 0));
        setBaseSalePP(Number(n.base_sale_price || 0));
        setBaseCostPP(Number(n.base_cost_price || 0));

        setPaypalPct(Number(n.paypal_fee_percent || 0));
        setPaypalFixed(Number(n.paypal_fee_fixed || 0));
        setStripePct(Number(n.stripe_fee_percent || 0));
        setStripeFixed(Number(n.stripe_fee_fixed || 0));
      }

      if (Array.isArray(data?.services)) {
        setServices(
          data.services.map((s: any) => ({
            id: String(s.id || uid('svc')),
            active: s.is_active !== false,
            visibleToUser: s.visible_to_user !== false,
            required: s.is_required === true,
            name: String(s.name || 'Servizio'),
            description: String(s.description || ''),
            model: (s.pricing_mode || 'per_person') as PricingModel,
            sale: Number(s.sale_price || 0),
            cost: Number(s.cost_price || 0),
            qty: Number(s.qty || 0),
            options: Array.isArray(s.options?.items) ? s.options.items : Array.isArray(s.options) ? s.options : undefined,
            selectedOptionId: s.selected_option_id ? String(s.selected_option_id) : undefined,
          }))
        );
      }

      if (Array.isArray(data?.internalCosts)) {
        setInternalCosts(
          data.internalCosts.map((c: any) => ({
            id: String(c.id || uid('cost')),
            active: c.is_active !== false,
            name: String(c.name || 'Costo'),
            model: (c.cost_mode || 'fixed') as InternalCostModel,
            value: Number(c.amount || 0),
          }))
        );
      }
    } catch (e: any) {
      setDbError(e?.message || 'Errore caricamento DB');
    } finally {
      setDbLoading(false);
    }
  }

  async function saveToDb(id: string) {
    setDbLoading(true);
    setDbError(null);
    try {
      const payload = {
        busId,
        capacity,
        busCostTotal,
        baseSalePrice: baseSalePP,
        baseCostPrice: baseCostPP,
        paypalFeePercent: paypalPct,
        paypalFeeFixed: paypalFixed,
        stripeFeePercent: stripePct,
        stripeFeeFixed: stripeFixed,
        services: services
          .filter((s) => s.active)
          .map((s, i) => ({
            name: s.name,
            description: s.description || '',
            pricing_mode: s.model,
            sale_price: s.sale,
            cost_price: s.cost,
            qty: s.qty,
            options: s.options ? { items: s.options } : null,
            selected_option_id: s.selectedOptionId || null,
            visible_to_user: s.visibleToUser,
            is_required: s.required,
            is_active: s.active,
            sort: (i + 1) * 10,
          })),
        internalCosts: internalCosts
          .filter((c) => c.active)
          .map((c, i) => ({
            name: c.name,
            cost_mode: c.model,
            amount: c.value,
            is_active: c.active,
            sort: (i + 1) * 10,
          })),
      };

      await fetchJson(`/api/admin/trips/${id}/numbers`, {
        method: 'POST',
        withAuth: true,
        body: JSON.stringify(payload),
      });

      setDbSavedAt(new Date().toLocaleString());
    } catch (e: any) {
      setDbError(e?.message || 'Errore salvataggio DB');
    } finally {
      setDbLoading(false);
    }
  }

  useEffect(() => {
    if (!tripId) return;
    if (testMode) return;
    loadFromDb(tripId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, testMode]);

  // ===== Calcoli =====
  const calc = useMemo(() => {
    const p = clamp0(participants);
    const cap = clamp0(capacity);
    const h = clamp0(holds);
    const available = Math.max(0, cap - p - h);

    const baseSales = clamp0(baseSalePP) * p;
    const baseCost = clamp0(baseCostPP) * p;

    let svcSales = 0;
    let svcCost = 0;

    const svcBreakdown = services.map((s) => {
      if (!s.active) return { id: s.id, name: s.name, sales: 0, cost: 0, margin: 0 };

      let sales = 0;
      let cost = 0;

      if (s.model === 'per_person') {
        sales = clamp0(s.sale) * p;
        cost = clamp0(s.cost) * p;
      } else if (s.model === 'per_booking') {
        sales = clamp0(s.sale);
        cost = clamp0(s.cost);
      } else if (s.model === 'quantity') {
        sales = clamp0(s.sale) * clamp0(s.qty);
        cost = clamp0(s.cost) * clamp0(s.qty);
      } else if (s.model === 'options') {
        const opt = (s.options || []).find((o) => o.id === s.selectedOptionId) || (s.options || [])[0];
        sales = clamp0(opt?.sale || 0) * p;
        cost = clamp0(opt?.cost || 0) * p;
      }

      svcSales += sales;
      svcCost += cost;
      return { id: s.id, name: s.name, sales, cost, margin: sales - cost };
    });

    let internalTotal = 0;
    const internalBreakdown = internalCosts.map((c) => {
      if (!c.active) return { id: c.id, name: c.name, total: 0 };
      const total = c.model === 'per_person' ? clamp0(c.value) * p : clamp0(c.value);
      internalTotal += total;
      return { id: c.id, name: c.name, total };
    });

    const salesTotal = baseSales + svcSales;
    const costBeforePay = baseCost + svcCost + internalTotal + clamp0(busCostTotal);

    const ppShare = Math.max(0, Math.min(100, paypalShare)) / 100;
    const stShare = Math.max(0, Math.min(100, stripeShare)) / 100;

    const paypalBase = includePaypal ? salesTotal * ppShare : 0;
    const stripeBase = includeStripe ? salesTotal * stShare : 0;

    const tx = 1;
    const paypalFees = includePaypal ? paypalBase * (clamp0(paypalPct) / 100) + clamp0(paypalFixed) * tx : 0;
    const stripeFees = includeStripe ? stripeBase * (clamp0(stripePct) / 100) + clamp0(stripeFixed) * tx : 0;

    const payFees = paypalFees + stripeFees;

    const totalCost = costBeforePay + payFees;
    const margin = salesTotal - totalCost;
    const marginPP = p > 0 ? margin / p : 0;

    const fixedCostsApprox =
      internalCosts.filter((c) => c.active && c.model === 'fixed').reduce((a, c) => a + clamp0(c.value), 0) +
      clamp0(busCostTotal) +
      (includePaypal ? clamp0(paypalFixed) * tx : 0) +
      (includeStripe ? clamp0(stripeFixed) * tx : 0);

    const contributionPP = clamp0(baseSalePP) - clamp0(baseCostPP) + (p > 0 ? (svcSales - svcCost) / p : 0);
    const breakEven = contributionPP > 0 ? Math.ceil(fixedCostsApprox / contributionPP) : 0;

    const status = margin >= targetMargin ? 'OK' : margin >= 0 ? 'QUASI' : 'KO';

    return {
      available,
      baseSales,
      baseCost,
      svcSales,
      svcCost,
      salesTotal,
      internalTotal,
      payFees,
      totalCost,
      margin,
      marginPP,
      breakEven,
      status,
      svcBreakdown,
      internalBreakdown,
    };
  }, [
    participants,
    capacity,
    holds,
    baseSalePP,
    baseCostPP,
    services,
    internalCosts,
    includePaypal,
    includeStripe,
    paypalPct,
    paypalFixed,
    stripePct,
    stripeFixed,
    paypalShare,
    stripeShare,
    targetMargin,
    busCostTotal,
  ]);

  const tripSummary = useMemo(() => {
    const status = (calc.status === 'OK' ? 'CONFIRMED' : calc.status === 'QUASI' ? 'SOFT_HOLD' : 'DRAFT') as any;
    const slaLevel = (calc.status === 'OK' ? 'GREEN' : calc.status === 'QUASI' ? 'YELLOW' : 'RED') as any;

    return {
      destinationName: 'Gita',
      departureLabel: tripId ? `Trip ${tripId}` : 'Trip (ID mancante)',
      status,
      sla: {
        level: slaLevel,
        label: calc.status === 'OK' ? 'Ok per conferma' : calc.status === 'QUASI' ? 'Quasi' : 'In perdita',
      },
    };
  }, [calc.status, tripId]);

  const addService = () => {
    setServices((prev) => [
      ...prev,
      {
        id: uid('svc'),
        active: true,
        visibleToUser: true,
        required: false,
        name: 'Nuovo servizio',
        description: '',
        model: 'per_person',
        sale: 0,
        cost: 0,
        qty: 0,
      },
    ]);
  };

  const addInternalCost = () => {
    setInternalCosts((prev) => [...prev, { id: uid('cost'), active: true, name: 'Nuovo costo', model: 'fixed', value: 0 }]);
  };

  // Se non c’è id: TripLayout mostrerà menu “bloccati” — qui almeno spieghiamo chiaramente.
  if (!tripId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6 text-white">
          <div className="text-xl font-black">Trip ID mancante</div>
          <div className="mt-2 text-sm text-slate-200/70">
            Sei finito su una route senza <span className="font-black">/admin/trips/[id]/numbers</span> valido.
            Torna alla lista gite e apri una gita esistente.
          </div>
        </div>
      </div>
    );
  }

  return (
    <TripLayout id={tripId} activeTab="numbers" tripSummary={tripSummary}>
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-2xl font-black text-white tracking-tight">Numeri</div>
            <div className="text-sm text-slate-200/70">Conti costi/ricavi, posti e break-even.</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-black text-slate-100 hover:bg-black/40"
              onClick={() => setTestMode((v) => !v)}
              title="In prova non salvi nulla: modifichi e vedi i risultati."
              type="button"
            >
              Modalità prova:{' '}
              <span className={testMode ? 'text-emerald-300' : 'text-slate-200'}>{testMode ? 'ON' : 'OFF'}</span>
            </button>

            <Button
              variant="secondary"
              disabled={dbLoading || !tripId || testMode}
              onClick={() => saveToDb(tripId)}
              title={testMode ? 'Spegni Modalità prova per salvare su DB.' : 'Salva su DB'}
              type="button"
            >
              {dbLoading ? 'Salvataggio…' : 'Salva'}
            </Button>
          </div>
        </div>

        {(dbError || dbSavedAt) && (
          <div className="text-sm">
            {dbError && <div className="text-red-300">{dbError}</div>}
            {dbSavedAt && <div className="text-emerald-300">Salvato: {dbSavedAt}</div>}
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Card className={`${cardDark} p-4`}>
            <div className="text-xs font-black text-slate-200/70">Posti</div>
            <div className="mt-1 text-2xl font-black text-white">{calc.available}</div>
            <div className="mt-1 text-xs text-slate-200/70">
              Capienza {capacity} · Partecipanti {participants} · Hold {holds}
            </div>
          </Card>

          <Card className={`${cardDark} p-4`}>
            <div className="text-xs font-black text-slate-200/70">Ricavi totali</div>
            <div className="mt-1 text-2xl font-black text-white">{euro(calc.salesTotal)}</div>
            <div className="mt-1 text-xs text-slate-200/70">
              Base {euro(calc.baseSales)} · Servizi {euro(calc.svcSales)}
            </div>
          </Card>

          <Card className={`${cardDark} p-4`}>
            <div className="text-xs font-black text-slate-200/70">Costi totali</div>
            <div className="mt-1 text-2xl font-black text-white">{euro(calc.totalCost)}</div>
            <div className="mt-1 text-xs text-slate-200/70">
              Interni {euro(calc.internalTotal)} · Bus {euro(busCostTotal)} · Fee {euro(calc.payFees)}
            </div>
          </Card>

          <Card className={`${cardDark} p-4`}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-slate-200/70">Margine</div>
              <Badge>{calc.status === 'OK' ? 'OK' : calc.status === 'QUASI' ? 'QUASI' : 'KO'}</Badge>
            </div>
            <div className="mt-1 text-2xl font-black text-white">{euro(calc.margin)}</div>
            <div className="mt-1 text-xs text-slate-200/70">
              {euro(calc.marginPP)} / partecipante · Target {euro(targetMargin)}
            </div>
          </Card>
        </div>

        {/* A */}
        <Section title="Posti & partecipanti" subtitle="Imposta bus, capienza, hold e partecipanti (in prova puoi simulare).">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Card className={`${cardDark} p-4`}>
              <div className={`${labelMuted} mb-2`}>Tipo bus</div>
              <select className={inputDark} value={busId} onChange={(e) => setBusId(e.target.value)}>
                {BUS_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} ({b.capacity} posti)
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-slate-200/70">Cambiare bus aggiorna la capienza.</div>
            </Card>

            <Card className={`${cardDark} p-4`}>
              <div className={`${labelMuted} mb-2`}>Capienza bus</div>
              <input type="number" className={inputDark} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} min={0} />
            </Card>

            <Card className={`${cardDark} p-4`}>
              <div className={`${labelMuted} mb-2`}>Hold / posti bloccati</div>
              <input type="number" className={inputDark} value={holds} onChange={(e) => setHolds(Number(e.target.value))} min={0} />
            </Card>

            <Card className={`${cardDark} p-4`}>
              <div className={`${labelMuted} mb-2`}>Partecipanti</div>
              <input
                type="number"
                className={inputDark}
                value={participants}
                onChange={(e) => setParticipants(Number(e.target.value))}
                min={0}
                disabled={!testMode}
                title={!testMode ? 'In modalità reale: verrà dai dati prenotazioni (step successivo).' : ''}
              />
              {!testMode && <div className="mt-2 text-xs text-slate-200/60">In modalità reale verrà dai prenotati (step DB).</div>}
            </Card>

            <Card className={`${cardDark} p-4 lg:col-span-2`}>
              <div className={`${labelMuted} mb-2`}>Costo bus totale (€)</div>
              <input
                type="number"
                className={inputDark}
                value={busCostTotal}
                onChange={(e) => setBusCostTotal(Number(e.target.value))}
                min={0}
              />
              <div className="mt-2 text-xs text-slate-200/70">Questo entra nei costi (fisso).</div>
            </Card>
          </div>
        </Section>

        {/* B */}
        <Section title="Prezzo base gita" subtitle="Vendita e costo per partecipante. Il cliente vede solo la vendita.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className={`${cardDark} p-4`}>
              <div className={`${labelMuted} mb-2`}>Prezzo vendita base (€/persona)</div>
              <input type="number" className={inputDark} value={baseSalePP} onChange={(e) => setBaseSalePP(Number(e.target.value))} min={0} />
              <div className="mt-2 text-xs text-slate-200/70">Ricavo base: {euro(calc.baseSales)}</div>
            </Card>

            <Card className={`${cardDark} p-4`}>
              <div className={`${labelMuted} mb-2`}>Costo reale base (€/persona)</div>
              <input type="number" className={inputDark} value={baseCostPP} onChange={(e) => setBaseCostPP(Number(e.target.value))} min={0} />
              <div className="mt-2 text-xs text-slate-200/70">Costo base: {euro(calc.baseCost)}</div>
            </Card>
          </div>
        </Section>

        {/* C */}
        <Section
          title="Servizi extra (visibili al cliente)"
          subtitle="Ogni servizio ha vendita+costo. Il cliente vede solo la vendita."
          right={<Button onClick={addService} type="button">+ Aggiungi servizio</Button>}
        >
          <div className="space-y-3">
            {services.map((s) => {
              const breakdown = calc.svcBreakdown.find((x) => x.id === s.id);
              return (
                <Card key={s.id} className={`${cardDark} p-4`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={s.active}
                          onChange={(e) => setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: e.target.checked } : x)))}
                        />
                        <input
                          className={`${inputDark} font-black`}
                          value={s.name}
                          onChange={(e) => setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))}
                        />
                        <Pill>{s.model}</Pill>
                        <Badge>{euro(breakdown?.margin || 0)} margine</Badge>
                      </div>

                      <div className="mt-2 grid grid-cols-1 lg:grid-cols-4 gap-2">
                        <div>
                          <div className={labelMuted}>Tipo</div>
                          <select
                            className={inputDark}
                            value={s.model}
                            onChange={(e) => setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, model: e.target.value as PricingModel } : x)))}
                          >
                            <option value="per_person">Per persona</option>
                            <option value="per_booking">Per prenotazione</option>
                            <option value="quantity">A quantità</option>
                            <option value="options">A opzioni</option>
                          </select>
                        </div>

                        {s.model !== 'options' && (
                          <>
                            <div>
                              <div className={labelMuted}>Vendita (€)</div>
                              <input
                                type="number"
                                className={inputDark}
                                value={s.sale}
                                onChange={(e) => setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, sale: Number(e.target.value) } : x)))}
                                min={0}
                              />
                            </div>
                            <div>
                              <div className={labelMuted}>Costo (€)</div>
                              <input
                                type="number"
                                className={inputDark}
                                value={s.cost}
                                onChange={(e) => setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, cost: Number(e.target.value) } : x)))}
                                min={0}
                              />
                            </div>
                          </>
                        )}

                        {s.model === 'quantity' && (
                          <div>
                            <div className={labelMuted}>Quantità</div>
                            <input
                              type="number"
                              className={inputDark}
                              value={s.qty}
                              onChange={(e) => setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, qty: Number(e.target.value) } : x)))}
                              min={0}
                            />
                          </div>
                        )}

                        {s.model === 'options' && (
                          <div className="lg:col-span-3">
                            <div className={labelMuted}>Opzioni</div>
                            <select
                              className={inputDark}
                              value={s.selectedOptionId}
                              onChange={(e) => setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, selectedOptionId: e.target.value } : x)))}
                            >
                              {(s.options || []).map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label} — vendita {euro(o.sale)} / costo {euro(o.cost)}
                                </option>
                              ))}
                            </select>
                            <div className="mt-2 text-xs text-slate-200/70">
                              In questa versione l’opzione è calcolata “per persona”.
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <label className="inline-flex items-center gap-2 text-slate-200/80">
                          <input
                            type="checkbox"
                            checked={s.visibleToUser}
                            onChange={(e) => setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, visibleToUser: e.target.checked } : x)))}
                          />
                          Visibile al cliente
                        </label>
                        <label className="inline-flex items-center gap-2 text-slate-200/80">
                          <input
                            type="checkbox"
                            checked={s.required}
                            onChange={(e) => setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, required: e.target.checked } : x)))}
                          />
                          Obbligatorio
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="secondary" onClick={() => setServices((prev) => prev.filter((x) => x.id !== s.id))} type="button">
                        Elimina
                      </Button>
                      <div className="text-xs text-slate-200/70">
                        Ricavo: {euro(breakdown?.sales || 0)}
                        <br />
                        Costo: {euro(breakdown?.cost || 0)}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>

        {/* D */}
        <Section
          title="Costi interni (non visibili al cliente)"
          subtitle="Pedaggi, parcheggi, staff, ecc."
          right={<Button onClick={addInternalCost} type="button">+ Aggiungi costo</Button>}
        >
          <div className="space-y-3">
            {internalCosts.map((c) => {
              const b = calc.internalBreakdown.find((x) => x.id === c.id);
              return (
                <Card key={c.id} className={`${cardDark} p-4`}>
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-end">
                    <div className="lg:col-span-2">
                      <div className={labelMuted}>Nome costo</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={c.active}
                          onChange={(e) => setInternalCosts((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: e.target.checked } : x)))}
                        />
                        <input
                          className={`${inputDark} font-black`}
                          value={c.name}
                          onChange={(e) => setInternalCosts((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))}
                        />
                      </div>
                    </div>

                    <div>
                      <div className={labelMuted}>Tipo</div>
                      <select
                        className={inputDark}
                        value={c.model}
                        onChange={(e) => setInternalCosts((prev) => prev.map((x) => (x.id === c.id ? { ...x, model: e.target.value as InternalCostModel } : x)))}
                      >
                        <option value="fixed">Fisso</option>
                        <option value="per_person">Per persona</option>
                      </select>
                    </div>

                    <div>
                      <div className={labelMuted}>Valore (€)</div>
                      <input
                        type="number"
                        className={inputDark}
                        value={c.value}
                        onChange={(e) => setInternalCosts((prev) => prev.map((x) => (x.id === c.id ? { ...x, value: Number(e.target.value) } : x)))}
                        min={0}
                      />
                    </div>

                    <div className="text-xs text-slate-200/70">
                      Totale: <span className="font-black text-white">{euro(b?.total || 0)}</span>
                    </div>

                    <div className="flex justify-end">
                      <Button variant="secondary" onClick={() => setInternalCosts((prev) => prev.filter((x) => x.id !== c.id))} type="button">
                        Elimina
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>

        {/* E */}
        <Section title="Pagamenti (commissioni)" subtitle="Stima costi PayPal/Stripe sui ricavi totali. Solo admin.">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <Card className={`${cardDark} p-4`}>
              <div className="flex items-center justify-between">
                <div className="font-black text-white">PayPal</div>
                <label className="text-xs text-slate-200/80 inline-flex items-center gap-2">
                  <input type="checkbox" checked={includePaypal} onChange={(e) => setIncludePaypal(e.target.checked)} />
                  Includi
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <div className={labelMuted}>% fee</div>
                  <input type="number" className={inputDark} value={paypalPct} onChange={(e) => setPaypalPct(Number(e.target.value))} min={0} />
                </div>
                <div>
                  <div className={labelMuted}>Fisso (€)</div>
                  <input type="number" className={inputDark} value={paypalFixed} onChange={(e) => setPaypalFixed(Number(e.target.value))} min={0} />
                </div>
                <div className="col-span-2">
                  <div className={labelMuted}>Quota ricavi su PayPal (%)</div>
                  <input type="number" className={inputDark} value={paypalShare} onChange={(e) => setPaypalShare(Number(e.target.value))} min={0} max={100} />
                </div>
              </div>
            </Card>

            <Card className={`${cardDark} p-4`}>
              <div className="flex items-center justify-between">
                <div className="font-black text-white">Stripe</div>
                <label className="text-xs text-slate-200/80 inline-flex items-center gap-2">
                  <input type="checkbox" checked={includeStripe} onChange={(e) => setIncludeStripe(e.target.checked)} />
                  Includi
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <div className={labelMuted}>% fee</div>
                  <input type="number" className={inputDark} value={stripePct} onChange={(e) => setStripePct(Number(e.target.value))} min={0} />
                </div>
                <div>
                  <div className={labelMuted}>Fisso (€)</div>
                  <input type="number" className={inputDark} value={stripeFixed} onChange={(e) => setStripeFixed(Number(e.target.value))} min={0} />
                </div>
                <div className="col-span-2">
                  <div className={labelMuted}>Quota ricavi su Stripe (%)</div>
                  <input type="number" className={inputDark} value={stripeShare} onChange={(e) => setStripeShare(Number(e.target.value))} min={0} max={100} />
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-3 text-sm text-slate-200/80">
            Fee stimate totali: <span className="font-black text-white">{euro(calc.payFees)}</span>
          </div>
        </Section>

        {/* F */}
        <Section title="Break-even & conferma bus" subtitle="Solo admin: soglie per decidere se confermare la gita.">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className={`${cardDark} p-4`}>
              <div className="text-xs font-black text-slate-200/70">Margine target (€)</div>
              <input type="number" className={`${inputDark} mt-2`} value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} min={0} />
              <div className="mt-2 text-xs text-slate-200/70">Stato: {calc.status}</div>
            </Card>

            <Card className={`${cardDark} p-4`}>
              <div className="text-xs font-black text-slate-200/70">Break-even stimato</div>
              <div className="mt-2 text-3xl font-black text-white">{calc.breakEven || 0}</div>
              <div className="mt-1 text-xs text-slate-200/70">partecipanti minimi per non andare in perdita</div>
            </Card>

            <Card className={`${cardDark} p-4`}>
              <div className="text-xs font-black text-slate-200/70">Azioni</div>
              <div className="mt-2 flex flex-col gap-2">
                <Button onClick={() => alert('Step successivo: conferma bus (DB + notifiche).')} type="button">
                  Segna “Bus confermato”
                </Button>
                <Button variant="secondary" onClick={() => alert('Step successivo: modalità prova → applica alla gita (DB).')} type="button">
                  Applica valori alla gita
                </Button>
              </div>
              <div className="mt-2 text-xs text-slate-200/70">Nota: queste soglie non si mostrano mai ai clienti.</div>
            </Card>
          </div>
        </Section>
      </div>
    </TripLayout>
  );
}