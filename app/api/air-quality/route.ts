export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

type city = { name: string; country: string; lat: number; lon: number };
type cache_record = { at: number; body: any };

const ttl_ms = 20 * 60_000;
let cache: cache_record | null = null;

const cities: city[] = [
    { name: "washington", country: "us", lat: 38.9072, lon: -77.0369 },
    { name: "new york", country: "us", lat: 40.7128, lon: -74.0060 },
    { name: "london", country: "gb", lat: 51.5072, lon: -0.1276 },
    { name: "paris", country: "fr", lat: 48.8566, lon: 2.3522 },
    { name: "berlin", country: "de", lat: 52.52, lon: 13.405 },
    { name: "moscow", country: "ru", lat: 55.7558, lon: 37.6173 },
    { name: "kyiv", country: "ua", lat: 50.4501, lon: 30.5234 },
    { name: "istanbul", country: "tr", lat: 41.0082, lon: 28.9784 },
    { name: "cairo", country: "eg", lat: 30.0444, lon: 31.2357 },
    { name: "riyadh", country: "sa", lat: 24.7136, lon: 46.6753 },
    { name: "dubai", country: "ae", lat: 25.2048, lon: 55.2708 },
    { name: "tehran", country: "ir", lat: 35.6892, lon: 51.3890 },
    { name: "delhi", country: "in", lat: 28.6139, lon: 77.2090 },
    { name: "mumbai", country: "in", lat: 19.076, lon: 72.8777 },
    { name: "beijing", country: "cn", lat: 39.9042, lon: 116.4074 },
    { name: "shanghai", country: "cn", lat: 31.2304, lon: 121.4737 },
    { name: "tokyo", country: "jp", lat: 35.6762, lon: 139.6503 },
    { name: "seoul", country: "kr", lat: 37.5665, lon: 126.9780 },
    { name: "singapore", country: "sg", lat: 1.3521, lon: 103.8198 },
    { name: "jakarta", country: "id", lat: -6.2088, lon: 106.8456 },
    { name: "sydney", country: "au", lat: -33.8688, lon: 151.2093 },
    { name: "nairobi", country: "ke", lat: -1.2921, lon: 36.8219 },
    { name: "lagos", country: "ng", lat: 6.5244, lon: 3.3792 },
    { name: "johannesburg", country: "za", lat: -26.2041, lon: 28.0473 },
    { name: "sao paulo", country: "br", lat: -23.5558, lon: -46.6396 },
    { name: "mexico city", country: "mx", lat: 19.4326, lon: -99.1332 },
    { name: "los angeles", country: "us", lat: 34.0522, lon: -118.2437 },
    { name: "toronto", country: "ca", lat: 43.6532, lon: -79.3832 },
];

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
const severity_for = (aqi: number | null) => aqi === null ? "unknown" : aqi >= 201 ? "critical" : aqi >= 151 ? "high" : aqi >= 101 ? "elevated" : "low";

const fetch_city = async (c: city) => {
    const params = new URLSearchParams({
        latitude: String(c.lat),
        longitude: String(c.lon),
        current: "us_aqi,european_aqi,pm10,pm2_5,nitrogen_dioxide,ozone",
        timezone: "UTC",
    });
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json", "User-Agent": "akashic/0.1" },
    });
    if (!res.ok) throw new Error(String(res.status));
    const raw = await res.json();
    const current = raw?.current || {};
    const aqi = num(current.us_aqi) ?? num(current.european_aqi);
    return {
        id: `airq-${c.country}-${c.name.replace(/\s+/g, "-")}`,
        city: c.name,
        country: c.country,
        lat: c.lat,
        lon: c.lon,
        aqi,
        european_aqi: num(current.european_aqi),
        pm25: num(current.pm2_5),
        pm10: num(current.pm10),
        no2: num(current.nitrogen_dioxide),
        ozone: num(current.ozone),
        time: typeof current.time === "string" ? current.time : null,
        severity: severity_for(aqi),
        source: "open-meteo air quality",
    };
};

export async function GET() {
    if (cache && Date.now() - cache.at < ttl_ms) return NextResponse.json(cache.body);
    try {
        const settled = await Promise.allSettled(cities.map(fetch_city));
        const points = settled.flatMap(r => r.status === "fulfilled" ? [r.value] : []);
        if (!points.length) return NextResponse.json({ error: "air quality upstream unavailable" }, { status: 502 });
        const body = { fetched_at: new Date().toISOString(), source: "open-meteo air quality", count: points.length, points };
        cache = { at: Date.now(), body };
        return NextResponse.json(body);
    } catch {
        return NextResponse.json({ error: "air quality fetch failed" }, { status: 500 });
    }
}