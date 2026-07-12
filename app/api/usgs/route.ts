export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
interface usgs_feature {
    id?: unknown;
    geometry?: {
        coordinates?: unknown;
    };
    properties?: {
        mag?: unknown;
        magType?: unknown;
        place?: unknown;
        time?: unknown;
        updated?: unknown;
        felt?: unknown;
        tsunami?: unknown;
        sig?: unknown;
        cdi?: unknown;
        mmi?: unknown;
        alert?: unknown;
        status?: unknown;
        type?: unknown;
        title?: unknown;
        detail?: unknown;
        url?: unknown;
        products?: unknown;
        dmin?: unknown;
        gap?: unknown;
    };
}
interface quake_event {
    id: string;
    mag: number | null;
    place: string | null;
    time: number | null;
    updated: number | null;
    longitude: number;
    latitude: number;
    depth_km: number | null;
    mag_type: string | null;
    felt_reports: number | null;
    tsunami: boolean;
    significance: number | null;
    cdi: number | null;
    mmi: number | null;
    alert: string | null;
    status: string | null;
    event_type: string | null;
    title: string | null;
    detail_url: string | null;
    event_url: string | null;
    dmin: number | null;
    gap: number | null;
    danger_level: string;
    expected_damage: string;
}
const usgs_feed_url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const usgs_feed_week_url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
const str = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
function toDangerLevel(mag: number | null, alert: string | null, sig: number | null): string {
    if (alert === "red") return "extreme";
    if (alert === "orange") return "very high";
    if (alert === "yellow") return "high";
    if (alert === "green") return "elevated";
    if (mag === null) return "unknown";
    if (mag >= 8) return "extreme";
    if (mag >= 7) return "very high";
    if (mag >= 6) return "high";
    if (mag >= 5) return "elevated";
    if (sig !== null && sig >= 600) return "elevated";
    return "low";
}
function toExpectedDamage(mag: number | null, depthKm: number | null, mmi: number | null, cdi: number | null): string {
    if (mag === null) return "unknown";
    const shallowBoost = depthKm !== null && depthKm <= 30 ? 0.4 : 0;
    const intensityBoost = mmi !== null ? Math.max(0, (mmi - 5) * 0.2) : cdi !== null ? Math.max(0, (cdi - 4) * 0.15) : 0;
    const score = mag + shallowBoost + intensityBoost;
    if (score >= 8) return "catastrophic";
    if (score >= 7) return "major structural damage likely";
    if (score >= 6) return "moderate to heavy local damage possible";
    if (score >= 5) return "light to moderate damage possible";
    return "minimal structural damage expected";
}
function parseFeature(ft: usgs_feature, idx: number): quake_event | null {
    const coords = Array.isArray(ft.geometry?.coordinates) ? ft.geometry.coordinates : [];
    const longitude = num(coords[0]);
    const latitude = num(coords[1]);
    if (longitude === null || latitude === null) return null;
    const mag = num(ft.properties?.mag);
    const alert = str(ft.properties?.alert);
    const sig = num(ft.properties?.sig);
    const depth = num(coords[2]);
    const mmi = num(ft.properties?.mmi);
    const cdi = num(ft.properties?.cdi);
    return {
        id: str(ft.id) || `quake-${idx + 1}`,
        mag,
        place: str(ft.properties?.place),
        time: num(ft.properties?.time),
        updated: num(ft.properties?.updated),
        longitude,
        latitude,
        depth_km: depth,
        mag_type: str(ft.properties?.magType),
        felt_reports: num(ft.properties?.felt),
        tsunami: num(ft.properties?.tsunami) === 1,
        significance: sig,
        cdi,
        mmi,
        alert,
        status: str(ft.properties?.status),
        event_type: str(ft.properties?.type),
        title: str(ft.properties?.title),
        detail_url: str(ft.properties?.detail),
        event_url: str(ft.properties?.url),
        dmin: num(ft.properties?.dmin),
        gap: num(ft.properties?.gap),
        danger_level: toDangerLevel(mag, alert, sig),
        expected_damage: toExpectedDamage(mag, depth, mmi, cdi),
    };
}
export async function GET() {
    try {
        const [dayRes, weekRes] = await Promise.allSettled([
            fetch(usgs_feed_url, {
                cache: "no-store",
                headers: {
                    Accept: "application/geo+json, application/json",
                    "User-Agent": "akashic/0.1",
                },
            }),
            fetch(usgs_feed_week_url, {
                cache: "no-store",
                headers: {
                    Accept: "application/geo+json, application/json",
                    "User-Agent": "akashic/0.1",
                },
            }),
        ]);
        const dayOk = dayRes.status === "fulfilled" && dayRes.value.ok;
        const weekOk = weekRes.status === "fulfilled" && weekRes.value.ok;
        if (!dayOk && !weekOk) {
            return NextResponse.json({ error: "usgs upstream unavailable" }, { status: 502 });
        }
        const dayRaw = dayOk ? await dayRes.value.json() : null;
        const weekRaw = weekOk ? await weekRes.value.json() : null;
        const dayFeats = Array.isArray(dayRaw?.features) ? dayRaw.features as usgs_feature[] : [];
        const weekFeats = Array.isArray(weekRaw?.features) ? weekRaw.features as usgs_feature[] : [];
        const map = new Map<string, quake_event>();
        for (let i = 0; i < weekFeats.length; i++) {
            const ev = parseFeature(weekFeats[i], i);
            if (!ev) continue;
            map.set(ev.id, ev);
        }
        for (let i = 0; i < dayFeats.length; i++) {
            const ev = parseFeature(dayFeats[i], i);
            if (!ev) continue;
            map.set(ev.id, ev);
        }
        const events = [...map.values()].sort((a, b) => (b.time || 0) - (a.time || 0));
        return NextResponse.json({
            fetchedAt: new Date().toISOString(),
            source: "usgs all_day + all_week",
            count: events.length,
            events,
        });
    } catch {
        return NextResponse.json({ error: "usgs fetch failed" }, { status: 500 });
    }
}
