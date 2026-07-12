import { NextResponse } from "next/server";


export async function GET() {
  try {
    const res = await fetch(
      "https://api.safecast.org/measurements.json?order=created_at+desc&per_page=200",
      { next: { revalidate: 900 }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) throw new Error(`safecast ${res.status}`);
    const data = await res.json();

    const observations = (Array.isArray(data) ? data : []).map((m: any) => ({
      id: m.id,
      lat: m.latitude,
      lon: m.longitude,
      value: m.value,
      unit: m.unit || "cpm",
      location: m.location_name || "",
      captured_at: m.captured_at,
      device_id: m.device_id,
    })).filter((o: any) => o.lat && o.lon && o.value != null);

    return NextResponse.json({ observations, count: observations.length, source: "Safecast" });
  } catch (err) {
    console.warn("[WM] radiation fetch failed:", err);
    return NextResponse.json({ observations: [], count: 0, error: String(err) });
  }
}
