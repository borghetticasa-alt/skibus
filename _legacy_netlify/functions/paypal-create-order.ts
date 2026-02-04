
import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin } from "./lib/supabase";

const PAYPAL_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const json = await res.json();
  return json.access_token as string;
}

export const handler: Handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const tripId = body.tripId;
    const seatsRaw = body.seats;

    // 🔒 FIX CHIAVE: seats sempre numero
    const seats = Number(seatsRaw);
    const seatsSafe = Number.isFinite(seats) && seats > 0 ? seats : 0;

    if (!tripId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing tripId" }),
      };
    }

    const supabase = getSupabaseAdmin();

    const { data: created, error } = await supabase
      .from("trips")
      .select(
        `
        id,
        title,
        base_price,
        trips_numbers (
          base_sale_price
        )
      `
      )
      .eq("id", tripId)
      .single();

    if (error || !created) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Trip not found" }),
      };
    }

    const title = created.title || "SkiBus";
    const unitPrice = Number(
      created.trips_numbers?.base_sale_price ??
        created.base_price ??
        0
    );

    const total = Math.max(0, unitPrice * seatsSafe);

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: title,
            amount: {
              currency_code: "EUR",
              value: total.toFixed(2),
            },
          },
        ],
      }),
    });

    const order = await orderRes.json();

    return {
      statusCode: 200,
      body: JSON.stringify(order),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err?.message || "Internal server error",
      }),
    };
  }
};
