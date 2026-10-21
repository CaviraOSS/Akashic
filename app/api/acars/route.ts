import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UA = "WORLDVIEW OSINT";

interface AcarsStatus {
    online: boolean;
    stations: { total: number; acars: number; vdl: number; hfdl: number; satcom: number };
    source: string;
    fetchedAt: string;
}

let cache: { at: number; data: AcarsStatus } | null = null;
const TTL = 60_000;

export async function GET() {
    if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.data);

    const fallback: AcarsStatus = { online: false, stations: { total: 0, acars: 0, vdl: 0, hfdl: 0, satcom: 0 }, source: "airframes.io", fetchedAt: new Date().toISOString() };
    try {
        const res = await fetch("https://api.airframes.io/stats", { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) {
            console.warn("[acars] stats not ok:", res.status);
            return NextResponse.json(fallback);
        }
        const j: any = await res.json();
        const active = j?.stats?.stations?.active || {};
        const sum = (obj: any) => (obj && typeof obj === "object" ? Object.values(obj).reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0);
        const acars = sum(active.acars) + (Number(active.airframes?.acars) || 0) + (Number(active.airframes?.["aero-acars"]) || 0) + (Number(active.airframes?.["iridium-acars"]) || 0);
        const vdl = (Number(active.acars?.vdl) || 0) + (Number(active.airframes?.vdl) || 0);
        const hfdl = sum(active.hfdl) + (Number(active.airframes?.hfdl) || 0);
        const satcom = sum(active.satcom) + (Number(active.airframes?.["aero-adsc"]) || 0);
        const data: AcarsStatus = {
            online: true,
            stations: {
                total: Number(j?.stats?.stations?.total) || acars + vdl + hfdl + satcom,
                acars,
                vdl,
                hfdl,
                satcom,
            },
            source: "airframes.io",
            fetchedAt: new Date().toISOString(),
        };
        cache = { at: Date.now(), data };
        return NextResponse.json(data);
    } catch (err) {
        console.warn("[acars] fetch error:", err instanceof Error ? err.message : err);
        return NextResponse.json(fallback);
    }
}
