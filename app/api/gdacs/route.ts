export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const gdacs_url = "https://www.gdacs.org/xml/rss.xml";
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
const str = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
const arr = <t,>(v: t | t[] | undefined | null): t[] => Array.isArray(v) ? v : v ? [v] : [];
const pick = (obj: any, ...keys: string[]) => keys.map(k => obj?.[k]).find(v => v !== undefined && v !== null);

const coords_of = (item: any) => {
    let lat = num(pick(item, "geo:lat", "gdacs:lat", "lat"));
    let lon = num(pick(item, "geo:long", "geo:lon", "gdacs:lon", "long", "lon"));
    const point = item?.["geo:Point"] || item?.["georss:point"];
    if ((lat === null || lon === null) && typeof point === "string") {
        const parts = point.trim().split(/\s+/).map(Number);
        if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
            lat = parts[0];
            lon = parts[1];
        }
    } else if ((lat === null || lon === null) && point && typeof point === "object") {
        lat = num(pick(point, "geo:lat", "lat"));
        lon = num(pick(point, "geo:long", "geo:lon", "long", "lon"));
    }
    return lat !== null && lon !== null && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 ? { lat, lon } : null;
};

const severity_for = (alert: string | null) => {
    const a = (alert || "").toLowerCase();
    if (a.includes("red")) return "critical";
    if (a.includes("orange")) return "high";
    if (a.includes("green")) return "low";
    return "elevated";
};

const type_name = (code: string | null) => {
    const c = (code || "").toUpperCase();
    return c === "EQ" ? "earthquake" : c === "TC" ? "tropical cyclone" : c === "FL" ? "flood" : c === "VO" ? "volcano" : c === "DR" ? "drought" : c === "WF" ? "wildfire" : c || "disaster";
};

export async function GET() {
    try {
        const res = await fetch(gdacs_url, {
            cache: "no-store",
            headers: { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": "akashic/0.1" },
        });
        if (!res.ok) return NextResponse.json({ error: "gdacs upstream unavailable" }, { status: 502 });
        const xml = await res.text();
        const raw = parser.parse(xml);
        const items = arr(raw?.rss?.channel?.item);
        const events = items.flatMap((item: any, idx: number) => {
            const pos = coords_of(item);
            if (!pos) return [];
            const alert = str(pick(item, "gdacs:alertlevel", "alertlevel"));
            const event_type = type_name(str(pick(item, "gdacs:eventtype", "eventtype")));
            return [{
                id: str(pick(item, "gdacs:eventid", "guid")) || `gdacs-${idx + 1}`,
                title: str(item.title) || event_type,
                event_type,
                alert: alert || "unknown",
                severity: severity_for(alert),
                lat: pos.lat,
                lon: pos.lon,
                country: str(pick(item, "gdacs:country", "country")),
                date: str(item.pubDate),
                url: str(item.link),
                source: "gdacs",
            }];
        }).slice(0, 120);
        return NextResponse.json({ fetched_at: new Date().toISOString(), source: "gdacs rss", count: events.length, events });
    } catch {
        return NextResponse.json({ error: "gdacs fetch failed" }, { status: 500 });
    }
}