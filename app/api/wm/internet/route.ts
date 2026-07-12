import { NextResponse } from "next/server";


export async function GET() {
  try {
    
    const res = await fetch(
      "https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country?from=-1h&until=now",
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) throw new Error(`ioda ${res.status}`);
    const data = await res.json();

    const outages = (data.data || [])
      .filter((d: any) => d.scores && d.scores.some((s: any) => s.score < 0.8))
      .map((d: any) => ({
        country: d.entity?.name || "unknown",
        code: d.entity?.code || "",
        scores: d.scores?.map((s: any) => ({
          source: s.source,
          score: s.score,
        })) || [],
        severity: d.scores?.some((s: any) => s.score < 0.3) ? "critical" :
                  d.scores?.some((s: any) => s.score < 0.6) ? "high" : "moderate",
      }));

    return NextResponse.json({ outages, count: outages.length, source: "IODA (CAIDA)" });
  } catch (err) {
    console.warn("[WM] internet outage fetch failed:", err);
    return NextResponse.json({ outages: [], count: 0, error: String(err) });
  }
}
