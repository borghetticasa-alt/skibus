'use client';

<<<<<<< HEAD
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchJson } from '@/lib/netlifyFunctions';
import { TripLayout } from '@/components/admin/TripLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';

type PricingModel = 'per_person' | 'per_booking' | 'quantity' | 'options';

type ServiceOption = {
  id: string;
  label: string;
  sale: number; // € vendita
  cost: number; // € costo
};

type ServiceItem = {
  id: string;
  active: boolean;
  visibleToUser: boolean;
  required: boolean;
  name: string;
  description?: string;
  model: PricingModel;
  sale: number; // default sale (used by non-options)
  cost: number; // default cost (used by non-options)
  qty: number;  // used by quantity
  options?: ServiceOption[];
  selectedOptionId?: string;
};

type InternalCostModel = 'fixed' | 'per_person';
type InternalCostItem = {
  id: string;
  active: boolean;
  name: string;
  model: InternalCostModel;
  value: number; // € (if per_person -> €/persona)
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

export default function NumbersPage() {

const BUS_OPTIONS = [
  { id: 'small', label: 'Bus Piccolo', capacity: 34 },
  { id: 'medium', label: 'Bus Medio', capacity: 49 },
  { id: 'large', label: 'Bus Grande', capacity: 59 },
] as const;

  const [busId, setBusId] = useState<string>(() => {
  if (typeof window === 'undefined') return 'small';
  return window.localStorage.getItem('skibus_numbers_busId') || 'small';
});

  const selectedBus = BUS_OPTIONS.find(b => b.id === busId) || BUS_OPTIONS[0];


  const params = useParams();
  const id = String((params as any)?.id || '');

  // =========================
  // Modalità / Posti / Partecipanti
  // =========================
  const [testMode, setTestMode] = useState(true);

    const [capacity, setCapacity] = useState<number>(() => {
    if (typeof window === 'undefined') return selectedBus.capacity;
    const v = window.localStorage.getItem('skibus_numbers_capacity');
    return v ? Number(v) : selectedBus.capacity;
  });

useEffect(() => {
  try {
    window.localStorage.setItem('skibus_numbers_busId', busId);
  } catch {}
  // When bus changes, update capacity (unless user manually changed it in test mode)
  setCapacity(prev => (Number.isFinite(prev) && prev > 0 ? selectedBus.capacity : selectedBus.capacity));
}, [busId]);

useEffect(() => {
  try {
    window.localStorage.setItem('skibus_numbers_capacity', String(capacity));
  } catch {}
}, [capacity]);

const [busCostTotal, setBusCostTotal] = useState<number>(() => {
  if (typeof window === 'undefined') return 0;
  const v = window.localStorage.getItem('skibus_numbers_busCostTotal');
  return v ? Number(v) : 0;
});

useEffect(() => {
  try { window.localStorage.setItem('skibus_numbers_busCostTotal', String(busCostTotal)); } catch {}
}, [busCostTotal]);

  const [holds, setHolds] = useState<number>(0);

  // In modalità “reale”, potrai collegarlo ai dati prenotazioni (per ora è input controllabile).
  const [participants, setParticipants] = useState<number>(21);

  // =========================
  // Base gita (vendita + costo)
  // =========================
  const [baseSalePP, setBaseSalePP] = useState<number>(35);
  const [baseCostPP, setBaseCostPP] = useState<number>(25);

  // =========================
  // Servizi (visibili al cliente)
  // =========================
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

  // =========================
  // Costi interni (non visibili al cliente)
  // =========================
  const [internalCosts, setInternalCosts] = useState<InternalCostItem[]>([
    { id: 'c_pedaggi', active: true, name: 'Pedaggi / ZTL', model: 'fixed', value: 120 },
    { id: 'c_parking', active: true, name: 'Parcheggi', model: 'fixed', value: 60 },
  ]);

  // =========================
  // Pagamenti (fee)
  // =========================
  const [includePaypal, setIncludePaypal] = useState(true);
  const [includeStripe, setIncludeStripe] = useState(true);

  const [paypalPct, setPaypalPct] = useState<number>(3.4);
  const [paypalFixed, setPaypalFixed] = useState<number>(0.35);

  const [stripePct, setStripePct] = useState<number>(1.5);
  const [stripeFixed, setStripeFixed] = useState<number>(0.25);

  // split stimato (solo admin) – puoi cambiarlo quando vuoi
  const [paypalShare, setPaypalShare] = useState<number>(60); // %
  const [stripeShare, setStripeShare] = useState<number>(40); // %

  const [targetMargin, setTargetMargin] = useState<number>(350);

const [dbLoading, setDbLoading] = useState(false);
const [dbError, setDbError] = useState<string | null>(null);
const [dbSavedAt, setDbSavedAt] = useState<string | null>(null);

async function loadFromDb(tripId: string) {
  setDbLoading(true);
  setDbError(null);
  try {
    const data = await fetchJson<any>(`admin/trips/${tripId}/numbers`, { withAuth: true });
    const n = data?.numbers;
    if (n) {
      setBusId(n.bus_id || 'small');
              const bid = (n.bus_id || 'small') as string;
        const bus = BUS_OPTIONS.find(b => b.id === bid) || BUS_OPTIONS[0];
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
      setServices(data.services.map((s: any) => ({
        id: String(s.id || crypto.randomUUID()),
        name: String(s.name || 'Servizio'),
        model: (s.pricing_mode || 'per_person') as PricingModel,
        sale: Number(s.sale_price || 0),
        cost: Number(s.cost_price || 0),
        options: Array.isArray(s.options) ? s.options : (s.options?.items || []),
        active: s.is_active !== false,
      })));
    }
    if (Array.isArray(data?.internalCosts)) {
      setInternalCosts(data.internalCosts.map((c: any) => ({
        id: String(c.id || crypto.randomUUID()),
        name: String(c.name || 'Costo'),
        mode: (c.cost_mode || 'fixed') as 'fixed' | 'per_person',
        amount: Number(c.amount || 0),
        active: c.is_active !== false,
      })));
    }
  } catch (e: any) {
    setDbError(e?.message || 'Errore caricamento DB');
  } finally {
    setDbLoading(false);
  }
}

async function saveToDb(tripId: string) {
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
      services: services.filter(s => s.active).map((s, i) => ({
        name: s.name,
        pricing_mode: s.model,
        sale_price: s.sale,
        cost_price: s.cost,
        options: s.options ? { items: s.options } : null,
        is_active: s.active,
        sort: (i + 1) * 10,
      })),
      internalCosts: internalCosts.filter(c => c.active).map((c, i) => ({
        name: c.name,
        cost_mode: c.mode,
        amount: c.amount,
        is_active: c.active,
        sort: (i + 1) * 10,
      })),
    };
    await fetchJson<any>(`admin/trips/${tripId}/numbers`, {
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
  if (!id) return;
  if (testMode) return;
  loadFromDb(String(id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [id, testMode]);


  // =========================
  // Calcoli
  // =========================
  const calc = useMemo(() => {
    const p = clamp0(participants);
    const cap = clamp0(capacity);
    const h = clamp0(holds);
    const available = Math.max(0, cap - p - h);

    const baseSales = clamp0(baseSalePP) * p;
    const baseCost = clamp0(baseCostPP) * p;

    // Servizi: in modalità admin, per ora stimiamo “tutti i partecipanti” per i per_person.
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
        const opt = (s.options || []).find(o => o.id === s.selectedOptionId) || (s.options || [])[0];
        sales = clamp0(opt?.sale || 0) * p; // opzione “per persona” (più realistica per noleggio)
        cost = clamp0(opt?.cost || 0) * p;
      }

      svcSales += sales;
      svcCost += cost;
      return { id: s.id, name: s.name, sales, cost, margin: sales - cost };
    });

    // Costi interni
    let internalTotal = 0;
    const internalBreakdown = internalCosts.map((c) => {
      if (!c.active) return { id: c.id, name: c.name, total: 0 };
      const total = c.model === 'per_person' ? clamp0(c.value) * p : clamp0(c.value);
      internalTotal += total;
      return { id: c.id, name: c.name, total };
    });

    const salesTotal = baseSales + svcSales;
    const costBeforePay = baseCost + svcCost + internalTotal;

    // Commissioni pagamenti: stima split PayPal/Stripe sui ricavi
    const ppShare = Math.max(0, Math.min(100, paypalShare)) / 100;
    const stShare = Math.max(0, Math.min(100, stripeShare)) / 100;

    const paypalBase = includePaypal ? salesTotal * ppShare : 0;
    const stripeBase = includeStripe ? salesTotal * stShare : 0;

    // Stima transazioni: 1 (semplificato) – se vuoi, in futuro la leghiamo alle prenotazioni.
    const tx = 1;
    const paypalFees = includePaypal ? (paypalBase * (clamp0(paypalPct) / 100) + clamp0(paypalFixed) * tx) : 0;
    const stripeFees = includeStripe ? (stripeBase * (clamp0(stripePct) / 100) + clamp0(stripeFixed) * tx) : 0;

    const payFees = paypalFees + stripeFees;

    const totalCost = costBeforePay + payFees;
    const margin = salesTotal - totalCost;
    const marginPP = p > 0 ? margin / p : 0;

    // Break-even approssimato:
    // contributo per persona = (sale_base - cost_base) + (servizi per persona margin stimato medio)
    // semplificazione: usiamo margine totale variabile / p
    const fixedCostsApprox =
      // fissi interni
      internalCosts.filter(c => c.active && c.model === 'fixed').reduce((a,c)=>a+clamp0(c.value),0)
      // fee fisse
      + (includePaypal ? clamp0(paypalFixed) * tx : 0)
      + (includeStripe ? clamp0(stripeFixed) * tx : 0);

    const contributionPP = (clamp0(baseSalePP) - clamp0(baseCostPP)) + (p > 0 ? (svcSales - svcCost) / p : 0);
    const breakEven = contributionPP > 0 ? Math.ceil(fixedCostsApprox / contributionPP) : 0;

    const status =
      margin >= targetMargin ? 'OK' :
      margin >= 0 ? 'QUASI' :
      'KO';

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
    participants, capacity, holds,
    baseSalePP, baseCostPP,
    services, internalCosts,
    includePaypal, includeStripe,
    paypalPct, paypalFixed,
    stripePct, stripeFixed,
    paypalShare, stripeShare,
    targetMargin
  ]);

  const tripSummary = useMemo(() => {
  const status = (calc.status === 'OK' ? 'CONFIRMED' : calc.status === 'QUASI' ? 'SOFT_HOLD' : 'DRAFT') as any;
  const slaLevel = (calc.status === 'OK' ? 'GREEN' : calc.status === 'QUASI' ? 'YELLOW' : 'RED') as any;

  return {
    destinationName: 'Gita',
    departureLabel: `Trip ${id}`,
    status,
    sla: {
      level: slaLevel,
      label: calc.status === 'OK' ? 'Ok per conferma' : calc.status === 'QUASI' ? 'Quasi' : 'In perdita',
    },
  };
}, [calc.status, id]);

const navBadges = useMemo(() => {
  return {
    numbers: { label: euro(calc.margin), tone: calc.margin >= 0 ? 'success' : 'danger' } as any,
  };
}, [calc.margin]);

  // =========================
  // Azioni UI
  // =========================
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
    setInternalCosts((prev) => [
      ...prev,
      { id: uid('cost'), active: true, name: 'Nuovo costo', model: 'fixed', value: 0 },
    ]);
  };

  return (
    <TripLayout id={String(id)} activeTab="numbers" tripSummary={tripSummary}>
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-2xl font-black text-white tracking-tight">Numbers</div>
            <div className="text-sm text-slate-200/70">
              Conti costi/ricavi, posti e break-even — valido per sci, mare, eventi (non solo sci).
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-white/10 bg-white/5/5 px-3 py-2 text-xs font-black text-slate-100 hover:bg-white/5/10"
              onClick={() => setTestMode((v) => !v)}
              title="In prova non salvi nulla: modifichi e vedi i risultati."
            >
              Modalità prova: <span className={testMode ? 'text-emerald-300' : 'text-slate-200'}>{testMode ? 'ON' : 'OFF'}</span>
            </button>

            <Button onClick={() => alert('Salvataggio: step successivo (DB).')} variant="secondary">
              Salva
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
            <div className="text-xs font-black text-slate-200/70">Posti</div>
            <div className="mt-1 text-2xl font-black text-white">{calc.available}</div>
            <div className="mt-1 text-xs text-slate-200/70">
              Capienza {capacity} · Partecipanti {participants} · Hold {holds}
            </div>
          </Card>

          <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
            <div className="text-xs font-black text-slate-200/70">Ricavi totali</div>
            <div className="mt-1 text-2xl font-black text-white">{euro(calc.salesTotal)}</div>
            <div className="mt-1 text-xs text-slate-200/70">
              Base {euro(calc.baseSales)} · Servizi {euro(calc.svcSales)}
            </div>
          </Card>

          <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
            <div className="text-xs font-black text-slate-200/70">Costi totali</div>
            <div className="mt-1 text-2xl font-black text-white">{euro(calc.totalCost)}</div>
            <div className="mt-1 text-xs text-slate-200/70">
              Interni {euro(calc.internalTotal)} · Fee {euro(calc.payFees)}
            </div>
          </Card>

          <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-slate-200/70">Margine</div>
              <Badge>
                {calc.status === 'OK' ? 'OK' : calc.status === 'QUASI' ? 'QUASI' : 'KO'}
              </Badge>
            </div>
            <div className="mt-1 text-2xl font-black text-white">{euro(calc.margin)}</div>
            <div className="mt-1 text-xs text-slate-200/70">
              {euro(calc.marginPP)} / partecipante · Target {euro(targetMargin)}
            </div>
          </Card>
        </div>

        {/* Section A */}
        <Section title="Posti & partecipanti" subtitle="Imposta capienza, hold e partecipanti (in prova puoi simulare).">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
              <div className="text-xs font-black text-slate-200/70 mb-2">Capienza bus</div>
              <input
                type="number"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                min={0}
              />
            </Card>
            <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
              <div className="text-xs font-black text-slate-200/70 mb-2">Hold / posti bloccati</div>
              <input
                type="number"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                value={holds}
                onChange={(e) => setHolds(Number(e.target.value))}
                min={0}
              />
            </Card>
            <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
              <div className="text-xs font-black text-slate-200/70 mb-2">Partecipanti</div>
              <input
                type="number"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                value={participants}
                onChange={(e) => setParticipants(Number(e.target.value))}
                min={0}
                disabled={!testMode}
                title={!testMode ? 'In modalità reale: verrà dai dati prenotazioni (step successivo).' : ''}
              />
              {!testMode && (
                <div className="mt-2 text-xs text-slate-200/60">In modalità reale verrà dai prenotati (step DB).</div>
              )}
            </Card>
          </div>
        </Section>

        {/* Section B */}
        <Section title="Prezzo base gita" subtitle="Vendita e costo per partecipante. Il cliente vede solo la vendita.">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
              <div className="text-xs font-black text-slate-200/70 mb-2">Prezzo vendita base (€/persona)</div>
              <input
                type="number"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                value={baseSalePP}
                onChange={(e) => setBaseSalePP(Number(e.target.value))}
                min={0}
              />
              <div className="mt-2 text-xs text-slate-200/70">Ricavo base: {euro(calc.baseSales)}</div>
            </Card>

            <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
              <div className="text-xs font-black text-slate-200/70 mb-2">Costo reale base (€/persona)</div>
              <input
                type="number"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                value={baseCostPP}
                onChange={(e) => setBaseCostPP(Number(e.target.value))}
                min={0}
              />
              <div className="mt-2 text-xs text-slate-200/70">Costo base: {euro(calc.baseCost)}</div>
            </Card>
          </div>
        </Section>

        {/* Section C */}
        <Section
          title="Servizi extra (visibili al cliente)"
          subtitle="Ogni servizio ha vendita+costo. Il cliente vede solo la vendita e può selezionare le opzioni."
          right={<Button onClick={addService}>+ Aggiungi servizio</Button>}
        >
          <div className="space-y-3">
            {services.map((s) => {
              const breakdown = calc.svcBreakdown.find(x => x.id === s.id);
              return (
                <Card key={s.id} className="rounded-2xl border-white/10 bg-white/5/5 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={s.active}
                          onChange={(e) => setServices(prev => prev.map(x => x.id === s.id ? { ...x, active: e.target.checked } : x))}
                        />
                        <input
                          className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white font-black"
                          value={s.name}
                          onChange={(e) => setServices(prev => prev.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))}
                        />
                        <Pill>{s.model}</Pill>
                        <Badge>{euro(breakdown?.margin || 0)} margine</Badge>
                      </div>

                      <div className="mt-2 grid grid-cols-1 lg:grid-cols-4 gap-2">
                        <div>
                          <div className="text-xs font-black text-slate-200/70 mb-1">Tipo</div>
                          <select
                            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                            value={s.model}
                            onChange={(e) => setServices(prev => prev.map(x => x.id === s.id ? { ...x, model: e.target.value as PricingModel } : x))}
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
                              <div className="text-xs font-black text-slate-200/70 mb-1">Vendita (€)</div>
                              <input
                                type="number"
                                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                                value={s.sale}
                                onChange={(e) => setServices(prev => prev.map(x => x.id === s.id ? { ...x, sale: Number(e.target.value) } : x))}
                                min={0}
                              />
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-200/70 mb-1">Costo (€)</div>
                              <input
                                type="number"
                                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                                value={s.cost}
                                onChange={(e) => setServices(prev => prev.map(x => x.id === s.id ? { ...x, cost: Number(e.target.value) } : x))}
                                min={0}
                              />
                            </div>
                          </>
                        )}

                        {s.model === 'quantity' && (
                          <div>
                            <div className="text-xs font-black text-slate-200/70 mb-1">Quantità</div>
                            <input
                              type="number"
                              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                              value={s.qty}
                              onChange={(e) => setServices(prev => prev.map(x => x.id === s.id ? { ...x, qty: Number(e.target.value) } : x))}
                              min={0}
                            />
                          </div>
                        )}

                        {s.model === 'options' && (
                          <div className="lg:col-span-3">
                            <div className="text-xs font-black text-slate-200/70 mb-1">Opzioni</div>
                            <select
                              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                              value={s.selectedOptionId}
                              onChange={(e) => setServices(prev => prev.map(x => x.id === s.id ? { ...x, selectedOptionId: e.target.value } : x))}
                            >
                              {(s.options || []).map(o => (
                                <option key={o.id} value={o.id}>
                                  {o.label} — vendita {euro(o.sale)} / costo {euro(o.cost)}
                                </option>
                              ))}
                            </select>
                            <div className="mt-2 text-xs text-slate-200/70">
                              In questa versione l’opzione è calcolata “per persona” (realistica per noleggi/skipass).
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <label className="inline-flex items-center gap-2 text-slate-200/80">
                          <input
                            type="checkbox"
                            checked={s.visibleToUser}
                            onChange={(e) => setServices(prev => prev.map(x => x.id === s.id ? { ...x, visibleToUser: e.target.checked } : x))}
                          />
                          Visibile al cliente
                        </label>
                        <label className="inline-flex items-center gap-2 text-slate-200/80">
                          <input
                            type="checkbox"
                            checked={s.required}
                            onChange={(e) => setServices(prev => prev.map(x => x.id === s.id ? { ...x, required: e.target.checked } : x))}
                          />
                          Obbligatorio
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setServices(prev => prev.filter(x => x.id !== s.id))}
                      >
                        Elimina
                      </Button>
                      <div className="text-xs text-slate-200/70">
                        Ricavo: {euro(breakdown?.sales || 0)}<br/>
                        Costo: {euro(breakdown?.cost || 0)}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>

        {/* Section D */}
        <Section
          title="Costi interni (non visibili al cliente)"
          subtitle="Pedaggi, parcheggi, staff, ecc. Queste voci aumentano i costi ma non i ricavi."
          right={<Button onClick={addInternalCost}>+ Aggiungi costo</Button>}
        >
          <div className="space-y-3">
            {internalCosts.map((c) => {
              const b = calc.internalBreakdown.find(x => x.id === c.id);
              return (
                <Card key={c.id} className="rounded-2xl border-white/10 bg-white/5/5 p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-2 items-end">
                    <div className="lg:col-span-2">
                      <div className="text-xs font-black text-slate-200/70 mb-1">Nome costo</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={c.active}
                          onChange={(e) => setInternalCosts(prev => prev.map(x => x.id === c.id ? { ...x, active: e.target.checked } : x))}
                        />
                        <input
                          className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white font-black"
                          value={c.name}
                          onChange={(e) => setInternalCosts(prev => prev.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-200/70 mb-1">Tipo</div>
                      <select
                        className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                        value={c.model}
                        onChange={(e) => setInternalCosts(prev => prev.map(x => x.id === c.id ? { ...x, model: e.target.value as InternalCostModel } : x))}
                      >
                        <option value="fixed">Fisso</option>
                        <option value="per_person">Per persona</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-200/70 mb-1">Valore (€)</div>
                      <input
                        type="number"
                        className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                        value={c.value}
                        onChange={(e) => setInternalCosts(prev => prev.map(x => x.id === c.id ? { ...x, value: Number(e.target.value) } : x))}
                        min={0}
                      />
                    </div>
                    <div className="text-xs text-slate-200/70">
                      Totale: <span className="font-black text-white">{euro(b?.total || 0)}</span>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="secondary" onClick={() => setInternalCosts(prev => prev.filter(x => x.id !== c.id))}>
                        Elimina
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Section>

        {/* Section E */}
        <Section title="Pagamenti (commissioni)" subtitle="Stima costi PayPal/Stripe sui ricavi totali. Solo admin.">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
              <div className="flex items-center justify-between">
                <div className="font-black text-white">PayPal</div>
                <label className="text-xs text-slate-200/80 inline-flex items-center gap-2">
                  <input type="checkbox" checked={includePaypal} onChange={(e) => setIncludePaypal(e.target.checked)} />
                  Includi
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs font-black text-slate-200/70 mb-1">% fee</div>
                  <input type="number" className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                    value={paypalPct} onChange={(e) => setPaypalPct(Number(e.target.value))} min={0} />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-200/70 mb-1">Fisso (€)</div>
                  <input type="number" className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                    value={paypalFixed} onChange={(e) => setPaypalFixed(Number(e.target.value))} min={0} />
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-black text-slate-200/70 mb-1">Quota ricavi su PayPal (%)</div>
                  <input type="number" className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                    value={paypalShare} onChange={(e) => setPaypalShare(Number(e.target.value))} min={0} max={100} />
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
              <div className="flex items-center justify-between">
                <div className="font-black text-white">Stripe</div>
                <label className="text-xs text-slate-200/80 inline-flex items-center gap-2">
                  <input type="checkbox" checked={includeStripe} onChange={(e) => setIncludeStripe(e.target.checked)} />
                  Includi
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs font-black text-slate-200/70 mb-1">% fee</div>
                  <input type="number" className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                    value={stripePct} onChange={(e) => setStripePct(Number(e.target.value))} min={0} />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-200/70 mb-1">Fisso (€)</div>
                  <input type="number" className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                    value={stripeFixed} onChange={(e) => setStripeFixed(Number(e.target.value))} min={0} />
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-black text-slate-200/70 mb-1">Quota ricavi su Stripe (%)</div>
                  <input type="number" className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                    value={stripeShare} onChange={(e) => setStripeShare(Number(e.target.value))} min={0} max={100} />
                </div>
              </div>
            </Card>
          </div>
          <div className="mt-3 text-sm text-slate-200/80">
            Fee stimate totali: <span className="font-black text-white">{euro(calc.payFees)}</span>
          </div>
        </Section>

        {/* Section F */}
        <Section title="Break-even & conferma bus" subtitle="Solo admin: soglie per decidere se confermare la gita.">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
              <div className="text-xs font-black text-slate-200/70">Margine target (€)</div>
              <input
                type="number"
                className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-white"
                value={targetMargin}
                onChange={(e) => setTargetMargin(Number(e.target.value))}
                min={0}
              />
              <div className="mt-2 text-xs text-slate-200/70">Stato: {calc.status}</div>
            </Card>

            <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
              <div className="text-xs font-black text-slate-200/70">Break-even stimato</div>
              <div className="mt-2 text-3xl font-black text-white">{calc.breakEven || 0}</div>
              <div className="mt-1 text-xs text-slate-200/70">partecipanti minimi per non andare in perdita</div>
            </Card>

            <Card className="rounded-2xl border-white/10 bg-white/5/5 p-4">
              <div className="text-xs font-black text-slate-200/70">Azioni</div>
              <div className="mt-2 flex flex-col gap-2">
                <Button onClick={() => alert('Step successivo: conferma bus (DB + notifiche).')}>
                  Segna “Bus confermato”
                </Button>
                <Button variant="secondary" onClick={() => alert('Step successivo: modalità prova → applica alla gita (DB).')}>
                  Applica valori alla gita
                </Button>
              </div>
              <div className="mt-2 text-xs text-slate-200/70">
                Nota: queste soglie non si mostrano mai ai clienti.
              </div>
            </Card>
          </div>
        </Section>
=======
import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { TripLayout, TripStatus, SlaLevel } from '@/components/admin/TripLayout';

/* =========================
   TIPI
========================= */

type StatoGita = 'BOZZA' | 'IN_ATTESA' | 'CONFERMATA' | 'BLOCCATA' | 'PIENA' | 'ANNULLATA';
type TipoBus = 'PICCOLO' | 'MEDIO' | 'GRANDE';

type ConfigBus = {
  tipo: TipoBus;
  attivo: boolean;
  posti: number;
  costo: number;
};

type ConfigExtra = {
  skipass: { costo: number }; // sempre costo
  assicurazione: { attiva: boolean; costo: number };
  noleggio: { attivo: boolean; costo: number; prezzo: number }; // costo + prezzo vendita (markup)
};

type RigaBus = {
  numeroBus: number; // 1,2,3...
  tipo: TipoBus;
  posti: number;
  iscritti: number;
  costoBus: number;

  ricavoUnitarioLordo: number;
  costiUnitari: number;
  ricaviTotali: number;
  costiTotali: number;
  margine: number;

  regolaTempoOk: boolean;
  regolaMargineOk: boolean;
  regolaMin21Ok: boolean; // solo Bus 1

  confermabile: boolean;
  pieno: boolean;

  noteDecisione: string;
};

function clampInt(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

function formatEuro(n: number) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}€ ${abs.toFixed(0)}`;
}

function labelBus(t: TipoBus) {
  if (t === 'PICCOLO') return 'Bus piccolo';
  if (t === 'MEDIO') return 'Bus medio';
  return 'Bus grande';
}

function ordineBusPerTaglia(t: TipoBus) {
  if (t === 'PICCOLO') return 1;
  if (t === 'MEDIO') return 2;
  return 3;
}

/* =========================
   PAGINA
========================= */

export default function NumbersPage() {
  const { id } = useParams<{ id: string }>();

  // business
  const [prezzoCliente, setPrezzoCliente] = useState<number>(70); // Gressoney 70€
  const [margineMinimo, setMargineMinimo] = useState<number>(300);
  const [giorniLimiteAgenzia, setGiorniLimiteAgenzia] = useState<number>(4);

  // iscritti (simulazione)
  const [iscrittiTotali, setIscrittiTotali] = useState<number>(0);

  // tempo (evito Date.now per hydration)
  const [simulaTempoOk, setSimulaTempoOk] = useState<boolean>(true);

  // bus configurabili
  const [bus, setBus] = useState<ConfigBus[]>([
    { tipo: 'PICCOLO', attivo: true, posti: 14, costo: 250 },
    { tipo: 'MEDIO', attivo: true, posti: 25, costo: 500 },
    { tipo: 'GRANDE', attivo: true, posti: 52, costo: 1000 },
  ]);

  // extra
  const [extra, setExtra] = useState<ConfigExtra>({
    skipass: { costo: 53 },
    assicurazione: { attiva: false, costo: 0 },
    noleggio: { attivo: false, costo: 0, prezzo: 0 },
  });

  const riepilogo = useMemo(
    () => ({
      nomeDestinazione: 'Gressoney',
      stato: 'IN_ATTESA' as StatoGita,
    }),
    []
  );

  function toggleBus(tipo: TipoBus) {
    setBus(prev => prev.map(b => (b.tipo === tipo ? { ...b, attivo: !b.attivo } : b)));
  }

  function updateBus(tipo: TipoBus, patch: Partial<ConfigBus>) {
    setBus(prev => prev.map(b => (b.tipo === tipo ? { ...b, ...patch } : b)));
  }

  const calcolo = useMemo(() => {
    const iscritti = clampInt(iscrittiTotali);

    // bus attivi validi ordinati
    const busAttivi = bus
      .filter(b => b.attivo && b.posti > 0 && b.costo >= 0)
      .sort((a, b) => a.posti - b.posti);

    if (busAttivi.length === 0) {
      return {
        righe: [] as RigaBus[],
        waitlist: iscritti,
        waitlistAttiva: iscritti > 0,
        ricavoUnitarioLordo: 0,
        costiUnitari: 0,
        note: 'Nessun bus attivo: attiva almeno un bus.',
      };
    }

    // extra costi
    const costoSkipass = Math.max(0, extra.skipass.costo);
    const costoAss = extra.assicurazione.attiva ? Math.max(0, extra.assicurazione.costo) : 0;

    const costoNoleggio = extra.noleggio.attivo ? Math.max(0, extra.noleggio.costo) : 0;
    const prezzoNoleggio = extra.noleggio.attivo ? Math.max(0, extra.noleggio.prezzo) : 0;

    // ricavo/costi unitari
    const ricavoUnitarioLordo = prezzoCliente + (extra.noleggio.attivo ? prezzoNoleggio : 0);
    const costiUnitari = costoSkipass + costoAss + (extra.noleggio.attivo ? costoNoleggio : 0);

    // --- Funzione: calcola margine di un bus con X iscritti
    const calcMargine = (costoBus: number, iscrittiBus: number) => {
      const ricaviTotali = iscrittiBus * ricavoUnitarioLordo;
      const costiTotali = iscrittiBus * costiUnitari + costoBus;
      return { ricaviTotali, costiTotali, margine: ricaviTotali - costiTotali };
    };

    // --- Funzione: verifica regole per un bus (Bus 1 ha anche min 21)
    const regoleOk = (numeroBus: number, margine: number, iscrittiBus: number) => {
      const regolaTempoOk = simulaTempoOk;
      const regolaMargineOk = margine >= margineMinimo;
      const regolaMin21Ok = numeroBus !== 1 || iscrittiBus >= 21;
      const confermabile = regolaTempoOk && regolaMargineOk && regolaMin21Ok;
      return { regolaTempoOk, regolaMargineOk, regolaMin21Ok, confermabile };
    };

    // --- STATE MACHINE:
    // - c'è un bus corrente
    // - se over capienza: se regole OK -> upgrade al prossimo bus (senza “tenere” quello precedente)
    // - se al max bus e pieno e regole OK -> crea bus successivo
    // - altrimenti waitlist ON

    const righe: RigaBus[] = [];
    let rimanenti = iscritti;

    // helper: trova la “catena” di taglie disponibili ordinata per capienza/taglia
    const catena = [...busAttivi].sort((a, b) => ordineBusPerTaglia(a.tipo) - ordineBusPerTaglia(b.tipo));

    const maxIdx = catena.length - 1;

    let numeroBus = 1;

    while (rimanenti > 0) {
      // bus corrente parte dal più piccolo disponibile
      let idxCorrente = 0;

      // proviamo a scegliere la taglia minima che “può” contenere gli iscritti che vogliono entrare ORA
      // ma l'upgrade lo facciamo SOLO quando serve (cioè quando rimanenti supera la capienza corrente)
      // e SOLO se le regole risultano OK sulla taglia successiva (o quella selezionata).
      let iscrittiBus = Math.min(rimanenti, catena[idxCorrente].posti);

      // calcolo iniziale su taglia corrente
      let { ricaviTotali, costiTotali, margine } = calcMargine(catena[idxCorrente].costo, iscrittiBus);
      let rules = regoleOk(numeroBus, margine, iscrittiBus);

      // --- Se rimanenti eccedono la capienza corrente:
      // proviamo ad UPGRARE finché:
      // - esiste una taglia successiva
      // - serve più capienza (rimanenti > postiCorrenti)
      // - e le regole risultano OK con la nuova taglia (per il numero di persone che entrerebbero in quel bus)
      while (
        idxCorrente < maxIdx &&
        rimanenti > catena[idxCorrente].posti
      ) {
        const idxProssimo = idxCorrente + 1;
        const postiProssimo = catena[idxProssimo].posti;

        // se passiamo al bus più grande, possiamo far entrare più persone (fino alla sua capienza)
        const iscrittiProssimo = Math.min(rimanenti, postiProssimo);

        const test = calcMargine(catena[idxProssimo].costo, iscrittiProssimo);
        const rulesProssimo = regoleOk(numeroBus, test.margine, iscrittiProssimo);

        // upgrade solo se regole OK
        if (!rulesProssimo.confermabile) break;

        // upgrade accettato: “non consideriamo più” il bus precedente
        idxCorrente = idxProssimo;
        iscrittiBus = iscrittiProssimo;
        ricaviTotali = test.ricaviTotali;
        costiTotali = test.costiTotali;
        margine = test.margine;
        rules = rulesProssimo;
      }

      const cfg = catena[idxCorrente];
      const pieno = iscrittiBus >= cfg.posti;

      // nota decisione (spiegazione chiara per utente finale)
      let noteDecisione = '';
      if (!rules.confermabile) {
        if (!rules.regolaTempoOk) noteDecisione = `Non confermabile: fuori tempo (soglia agenzia ${giorniLimiteAgenzia} giorni prima).`;
        else if (!rules.regolaMin21Ok) noteDecisione = 'Non confermabile: per il primo bus serve minimo 21 persone.';
        else noteDecisione = 'Non confermabile: margine insufficiente.';
      } else {
        // confermabile
        if (idxCorrente > 0) {
          noteDecisione = `Upgrade: passaggio a ${labelBus(cfg.tipo)} perché le regole sono OK e serve più capienza.`;
        } else {
          noteDecisione = 'Confermabile sulla taglia attuale.';
        }
      }

      righe.push({
        numeroBus,
        tipo: cfg.tipo,
        posti: cfg.posti,
        iscritti: iscrittiBus,
        costoBus: cfg.costo,
        ricavoUnitarioLordo,
        costiUnitari,
        ricaviTotali,
        costiTotali,
        margine,
        regolaTempoOk: rules.regolaTempoOk,
        regolaMargineOk: rules.regolaMargineOk,
        regolaMin21Ok: rules.regolaMin21Ok,
        confermabile: rules.confermabile,
        pieno,
        noteDecisione,
      });

      // consumiamo iscritti assegnati
      rimanenti -= iscrittiBus;

      // Se il bus corrente NON è pieno -> ci sono posti, quindi non può esistere waitlist
      if (!pieno) {
        // anche se ci sarebbero “rimanenti”, in realtà non può succedere perché iscrittiBus = min(rimanenti, posti)
        // quindi qui in pratica rimanenti sarà 0.
      }

      // Se bus è pieno:
      if (pieno) {
        // se abbiamo ancora rimanenti:
        if (rimanenti > 0) {
          // possiamo creare BUS SUCCESSIVO solo se:
          // - siamo già alla taglia massima disponibile (cioè non si può più fare upgrade)
          // - e le regole sono confermabili (altrimenti: waitlist)
          const siamoAllaTagliaMax = idxCorrente === maxIdx;

          if (siamoAllaTagliaMax && rules.confermabile) {
            // crea bus successivo
            numeroBus += 1;
            // continua il while e riparte dal più piccolo (catena[0]) per il bus successivo
            continue;
          }

          // altrimenti: non possiamo/ non dobbiamo creare bus successivo
          // rimanenti resta in waitlist -> usciamo dal ciclo
          break;
        }
      }

      // se non ci sono rimanenti, fine
      if (rimanenti <= 0) break;
    }

    const waitlist = Math.max(0, rimanenti);

    // waitlist ON/OFF:
    // ON se esiste gente non allocata (rimanenti > 0)
    // OFF se tutto allocato
    const waitlistAttiva = waitlist > 0;

    const note = waitlistAttiva
      ? 'Lista d’attesa ATTIVA: ci sono richieste in eccesso che non possono ancora essere trasformate in posti confermabili.'
      : 'Lista d’attesa DISATTIVA: tutte le richieste sono state allocate in posti disponibili.';

    return {
      righe,
      waitlist,
      waitlistAttiva,
      ricavoUnitarioLordo,
      costiUnitari,
      note,
    };
  }, [
    iscrittiTotali,
    bus,
    extra,
    margineMinimo,
    giorniLimiteAgenzia,
    simulaTempoOk,
    prezzoCliente,
  ]);

  return (
    <TripLayout id={String(id)} activeTab="numbers" riepilogo={riepilogo}>
      <div className="space-y-8">
        {/* HEADER */}
        <div className="bg-slate-950/30 rounded-2xl border p-6 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Numeri & Meccanismo Bus</h2>
              <p className="text-sm text-slate-300/70">
                1) Si parte dal bus più piccolo disponibile • 2) Se serve capienza e regole OK → upgrade • 3) Se il più grande è pieno e regole OK → nasce il bus successivo • 4) Altrimenti waitlist ON.
              </p>
            </div>

            <button
              onClick={() => setSimulaTempoOk(v => !v)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                simulaTempoOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              Tempo Agenzia: {simulaTempoOk ? 'OK' : 'FUORI TEMPO'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-950/30 rounded-xl border p-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prezzo Cliente</div>
              <input
                type="number"
                value={prezzoCliente}
                onChange={e => setPrezzoCliente(Number(e.target.value) || 0)}
                className="mt-2 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                min={0}
              />
              <div className="text-xs text-slate-300/70 mt-1">Incasso base per persona (es. 70€).</div>
            </div>

            <div className="bg-slate-950/30 rounded-xl border p-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margine minimo</div>
              <input
                type="number"
                value={margineMinimo}
                onChange={e => setMargineMinimo(Number(e.target.value) || 0)}
                className="mt-2 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                min={0}
              />
              <div className="text-xs text-slate-300/70 mt-1">Per dichiarare “confermabile”.</div>
            </div>

            <div className="bg-slate-950/30 rounded-xl border p-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scadenza agenzia</div>
              <input
                type="number"
                value={giorniLimiteAgenzia}
                onChange={e => setGiorniLimiteAgenzia(Number(e.target.value) || 0)}
                className="mt-2 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                min={0}
              />
              <div className="text-xs text-slate-300/70 mt-1">Es. 4 giorni prima.</div>
            </div>
          </div>
        </div>

        {/* EXTRA */}
        <div className="bg-slate-950/30 rounded-2xl border p-6 space-y-4">
          <h3 className="text-lg font-black text-white">Skipass / Assicurazione / Noleggio</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/30 rounded-xl border p-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skipass (costo)</div>
              <input
                type="number"
                value={extra.skipass.costo}
                onChange={e => setExtra(prev => ({ ...prev, skipass: { costo: Number(e.target.value) || 0 } }))}
                className="mt-2 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                min={0}
              />
              <div className="text-xs text-slate-300/70 mt-1">È un costo unitario che impatta il margine.</div>
            </div>

            <div className="bg-slate-950/30 rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assicurazione</div>
                <button
                  onClick={() => setExtra(prev => ({ ...prev, assicurazione: { ...prev.assicurazione, attiva: !prev.assicurazione.attiva } }))}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    extra.assicurazione.attiva ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white/5 text-slate-300/70 border-white/10'
                  }`}
                >
                  {extra.assicurazione.attiva ? 'ATTIVA' : 'OFF'}
                </button>
              </div>
              <input
                type="number"
                value={extra.assicurazione.costo}
                onChange={e => setExtra(prev => ({ ...prev, assicurazione: { ...prev.assicurazione, costo: Number(e.target.value) || 0 } }))}
                className="w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                min={0}
                disabled={!extra.assicurazione.attiva}
              />
              <div className="text-xs text-slate-300/70">Costo unitario (se attiva).</div>
            </div>

            <div className="bg-slate-950/30 rounded-xl border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Noleggio</div>
                <button
                  onClick={() => setExtra(prev => ({ ...prev, noleggio: { ...prev.noleggio, attivo: !prev.noleggio.attivo } }))}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    extra.noleggio.attivo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white/5 text-slate-300/70 border-white/10'
                  }`}
                >
                  {extra.noleggio.attivo ? 'ATTIVO' : 'OFF'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Costo</div>
                  <input
                    type="number"
                    value={extra.noleggio.costo}
                    onChange={e => setExtra(prev => ({ ...prev, noleggio: { ...prev.noleggio, costo: Number(e.target.value) || 0 } }))}
                    className="mt-1 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                    min={0}
                    disabled={!extra.noleggio.attivo}
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase">Prezzo</div>
                  <input
                    type="number"
                    value={extra.noleggio.prezzo}
                    onChange={e => setExtra(prev => ({ ...prev, noleggio: { ...prev.noleggio, prezzo: Number(e.target.value) || 0 } }))}
                    className="mt-1 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                    min={0}
                    disabled={!extra.noleggio.attivo}
                  />
                </div>
              </div>

              <div className="text-xs text-slate-300/70">
                Se prezzo &gt; costo, crei margine extra.
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-sm text-slate-200/80">
            <span className="font-black text-white">Unità:</span>{' '}
            ricavo lordo/persona <b>{formatEuro(calcolo.ricavoUnitarioLordo)}</b> •
            costi unitari/persona <b>{formatEuro(calcolo.costiUnitari)}</b>
          </div>
        </div>

        {/* BUS CONFIG */}
        <div className="bg-slate-950/30 rounded-2xl border p-6 space-y-4">
          <div>
            <h3 className="text-lg font-black text-white">Bus disponibili</h3>
            <p className="text-sm text-slate-300/70">
              Il sistema prova a far entrare più persone facendo upgrade SOLO se le regole restano OK.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bus.map(b => (
              <div key={b.tipo} className="bg-slate-950/30 rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-white">{labelBus(b.tipo)}</div>
                  <button
                    onClick={() => toggleBus(b.tipo)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      b.attivo ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white/5 text-slate-300/70 border-white/10'
                    }`}
                  >
                    {b.attivo ? 'ATTIVO' : 'OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Posti</div>
                    <input
                      type="number"
                      value={b.posti}
                      onChange={e => updateBus(b.tipo, { posti: Number(e.target.value) || 0 })}
                      className="mt-1 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                      min={0}
                      disabled={!b.attivo}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase">Costo</div>
                    <input
                      type="number"
                      value={b.costo}
                      onChange={e => updateBus(b.tipo, { costo: Number(e.target.value) || 0 })}
                      className="mt-1 w-full bg-slate-950/30 border rounded-xl px-4 py-2 font-black"
                      min={0}
                      disabled={!b.attivo}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ISCRITTI */}
        <div className="bg-slate-950/30 rounded-2xl border p-6 space-y-3">
          <h3 className="text-lg font-black text-white">Simulazione iscritti</h3>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              type="number"
              value={iscrittiTotali}
              onChange={e => setIscrittiTotali(Number(e.target.value) || 0)}
              className="border rounded-xl px-4 py-2 font-black w-48"
              min={0}
            />
            <div className="text-sm text-slate-200/80">
              Inserisci quante persone vogliono prenotare. Il sistema decide upgrade / nuovo bus / waitlist.
            </div>
          </div>
        </div>

        {/* RISULTATI BUS */}
        <div className="space-y-4">
          <div className="text-sm text-slate-300/70">{calcolo.note}</div>

          {calcolo.righe.length === 0 ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700 font-bold">
              Nessun calcolo disponibile.
            </div>
          ) : (
            calcolo.righe.map(r => (
              <div key={`${r.numeroBus}-${r.tipo}`} className="bg-slate-950/30 rounded-2xl border p-6 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="font-black text-white">
                    Bus {r.numeroBus} — {labelBus(r.tipo)} • {r.iscritti}/{r.posti}
                    {r.pieno ? <span className="ml-2 text-xs font-black text-indigo-600">PIENO</span> : null}
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      r.confermabile ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {r.confermabile ? 'CONFERMABILE' : 'NON CONFERMABILE'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="bg-slate-950/30 border rounded-xl p-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo bus</div>
                    <div className="font-black text-white">{formatEuro(r.costoBus)}</div>
                  </div>

                  <div className="bg-slate-950/30 border rounded-xl p-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ricavi</div>
                    <div className="font-black text-white">{formatEuro(r.ricaviTotali)}</div>
                  </div>

                  <div className="bg-slate-950/30 border rounded-xl p-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costi totali</div>
                    <div className="font-black text-white">{formatEuro(r.costiTotali)}</div>
                  </div>

                  <div className="bg-slate-950/30 border rounded-xl p-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margine</div>
                    <div className={`font-black ${r.margine >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatEuro(r.margine)}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${r.regolaTempoOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      Tempo: {r.regolaTempoOk ? 'OK' : 'NO'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${r.regolaMargineOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      Margine: {r.regolaMargineOk ? 'OK' : 'NO'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${r.regolaMin21Ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      Min 21 (solo Bus 1): {r.regolaMin21Ok ? 'OK' : 'NO'}
                    </span>
                  </div>

                  <div className={`mt-2 font-bold ${r.confermabile ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {r.noteDecisione}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* WAITLIST */}
        <div className={`rounded-2xl border p-6 ${calcolo.waitlistAttiva ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className={`font-black ${calcolo.waitlistAttiva ? 'text-amber-900' : 'text-emerald-900'}`}>
            Lista d’attesa: {calcolo.waitlistAttiva ? 'ATTIVA' : 'DISATTIVA'}
          </div>
          <div className={`text-sm mt-2 ${calcolo.waitlistAttiva ? 'text-amber-900/80' : 'text-emerald-900/80'}`}>
            {calcolo.waitlistAttiva ? (
              <>
                Persone in attesa: <b>{calcolo.waitlist}</b>.  
                La lista si spegne solo quando si può fare upgrade o creare un bus successivo mantenendo le regole.
              </>
            ) : (
              <>Nessuna persona in attesa: tutto allocato correttamente.</>
            )}
          </div>
        </div>
>>>>>>> ddd8ffa10a3e1b234e788c3913d2de8ba4de131a
      </div>
    </TripLayout>
  );
}
