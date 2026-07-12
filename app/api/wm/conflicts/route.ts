import { NextResponse } from "next/server";


export async function GET() {
  try {
    const year = new Date().getFullYear();
    const res = await fetch(
      `https://ucdpapi.pcr.uu.se/api/gedevents/24.1?pagesize=200&page=0`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(20000) }
    );
    if (!res.ok) throw new Error(`ucdp ${res.status}`);
    const data = await res.json();

    const events = (data.Result || []).map((e: any) => ({
      id: e.id || `ucdp-${e.relid}`,
      country: e.country,
      country_iso: e.country_id,
      lat: parseFloat(e.latitude),
      lon: parseFloat(e.longitude),
      type: e.type_of_violence === 1 ? "state-based" : e.type_of_violence === 2 ? "non-state" : "one-sided",
      deaths_a: e.deaths_a || 0,
      deaths_b: e.deaths_b || 0,
      deaths_civilians: e.deaths_civilians || 0,
      best_estimate: e.best || 0,
      date: e.date_start,
      source: e.source_article || null,
      side_a: e.side_a,
      side_b: e.side_b,
    })).filter((e: any) => !isNaN(e.lat) && !isNaN(e.lon));

    return NextResponse.json({ events, count: events.length, source: "UCDP GED v24.1" });
  } catch (err) {
    console.warn("[WM] conflicts fetch failed:", err);
    return NextResponse.json({ events: [], count: 0, error: String(err) });
  }
}
