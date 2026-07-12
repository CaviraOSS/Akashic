import { NextResponse } from "next/server";
import {
    weather_grid_points,
    weather_grid_spec,
    type weather_grid,
} from "@/lib/weather/map-core";

export const dynamic = "force-dynamic";

type wind_point = {
    lat: number;
    lon: number;
    u_ms: number;
    v_ms: number;
    speed_kmh: number;
    direction_deg: number;
    gust_kmh: number;
    temperature_c: number;
    humidity_pct: number;
    pressure_hpa: number;
    precipitation_mm: number;
    cloud_cover_pct: number;
};

type open_meteo_current = {
    current?: {
        wind_speed_10m?: number;
        wind_direction_10m?: number;
        wind_gusts_10m?: number;
        temperature_2m?: number;
        relative_humidity_2m?: number;
        pressure_msl?: number;
        precipitation?: number;
        cloud_cover?: number;
    };
};

type cache_entry = {
    fetched_at: number;
    grid: weather_grid;
    vectors: wind_point[];
};

const open_meteo_url = "https://api.open-meteo.com/v1/forecast";
const cache_ttl_ms = 10 * 60_000;
const batch_size = 300;
const fetch_concurrency = 1;
const cache_max = 8;
const cache = new Map<string, cache_entry>();
let latest_good: cache_entry | null = null;

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const num = (v: string | null, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};

const chunks = <t,>(arr: t[], size: number) => {
    const out: t[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

const map_limit = async <t, u>(arr: t[], limit: number, fn: (x: t) => Promise<u>) => {
    const out = new Array<u>(arr.length);
    let next = 0;
    const worker = async () => {
        while (next < arr.length) {
            const i = next++;
            out[i] = await fn(arr[i]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, arr.length) }, worker));
    return out;
};

const uv = (speed_kmh: number, direction_deg: number) => {
    const speed_ms = Math.max(0, speed_kmh) / 3.6;
    const flow = ((direction_deg + 180) % 360) * Math.PI / 180;
    return {
        u_ms: Math.sin(flow) * speed_ms,
        v_ms: Math.cos(flow) * speed_ms,
    };
};

const parse_batch = (
    json: unknown,
    pts: Array<{ lat: number; lon: number }>,
): wind_point[] => {
    const rows = Array.isArray(json) ? json : [json];
    const out: wind_point[] = [];
    for (let i = 0; i < Math.min(rows.length, pts.length); i++) {
        const rec = rows[i] as open_meteo_current;
        const speed_kmh = rec.current?.wind_speed_10m;
        const direction_deg = rec.current?.wind_direction_10m;
        if (!finite(speed_kmh) || !finite(direction_deg)) continue;
        const dir = ((direction_deg % 360) + 360) % 360;
        const speed = clamp(speed_kmh, 0, 260);
        const flow = uv(speed, dir);
        out.push({
            lat: pts[i].lat,
            lon: pts[i].lon,
            ...flow,
            speed_kmh: speed,
            direction_deg: dir,
            gust_kmh: clamp(rec.current?.wind_gusts_10m ?? speed, 0, 320),
            temperature_c: clamp(rec.current?.temperature_2m ?? 0, -90, 65),
            humidity_pct: clamp(rec.current?.relative_humidity_2m ?? 0, 0, 100),
            pressure_hpa: clamp(rec.current?.pressure_msl ?? 1013, 850, 1100),
            precipitation_mm: clamp(rec.current?.precipitation ?? 0, 0, 500),
            cloud_cover_pct: clamp(rec.current?.cloud_cover ?? 0, 0, 100),
        });
    }
    return out;
};

const trim_cache = () => {
    while (cache.size > cache_max) {
        const oldest = cache.keys().next().value as string | undefined;
        if (!oldest) break;
        cache.delete(oldest);
    }
};

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const grid = weather_grid_spec({
            west: num(url.searchParams.get("west"), -180),
            south: num(url.searchParams.get("south"), -85),
            east: num(url.searchParams.get("east"), 180),
            north: num(url.searchParams.get("north"), 85),
        }, num(url.searchParams.get("zoom"), 1));
        const now = Date.now();
        const hit = cache.get(grid.key);
        if (hit && now - hit.fetched_at < cache_ttl_ms) {
            latest_good = hit;
            cache.delete(grid.key);
            cache.set(grid.key, hit);
            return NextResponse.json({
                source: "open-meteo-best-match",
                model: "automatic high-resolution model",
                cached: true,
                fetched_at: new Date(hit.fetched_at).toISOString(),
                grid: hit.grid,
                vectors: hit.vectors,
            });
        }

        const pts = weather_grid_points(grid);
        const batches = chunks(pts, batch_size);
        let ok_batches = 0;
        const failures: Record<string, number> = {};
        const fields = "wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,relative_humidity_2m,pressure_msl,precipitation,cloud_cover";
        const responses = await map_limit(batches, fetch_concurrency, async batch => {
            const latitude = batch.map(p => p.lat.toFixed(2)).join(",");
            const longitude = batch.map(p => p.lon.toFixed(2)).join(",");
            const elevation = batch.map(() => "nan").join(",");
            const api = `${open_meteo_url}?latitude=${latitude}&longitude=${longitude}&current=${fields}&wind_speed_unit=kmh&precipitation_unit=mm&timezone=UTC&elevation=${elevation}&cell_selection=nearest`;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const res = await fetch(api, {
                        cache: "no-store",
                        headers: {
                            "User-Agent": "akashik/0.1",
                            Accept: "application/json",
                        },
                    });
                    if (res.ok) {
                        ok_batches++;
                        return parse_batch(await res.json(), batch);
                    }
                    if (res.status === 429) {
                        failures["429"] = (failures["429"] || 0) + 1;
                        break;
                    }
                    failures[String(res.status)] = (failures[String(res.status)] || 0) + 1;
                } catch {
                    failures.network = (failures.network || 0) + 1;
                }
                await wait(600 * (attempt + 1));
            }
            return [] as wind_point[];
        });
        const vectors = responses.flat();
        if (vectors.length < pts.length * 0.75) {
            const fallback = hit || latest_good;
            if (fallback) {
                return NextResponse.json({
                    source: "open-meteo-best-match",
                    model: "automatic high-resolution model",
                    cached: true,
                    stale: true,
                    degraded: true,
                    fetched_at: new Date(fallback.fetched_at).toISOString(),
                    requested_grid: grid,
                    grid: fallback.grid,
                    vectors: fallback.vectors,
                    failures,
                });
            }
            return NextResponse.json({
                source: "open-meteo-unavailable",
                degraded: true,
                received: vectors.length,
                expected: pts.length,
                failures,
                vectors: [],
            });
        }

        const fresh = { fetched_at: now, grid, vectors };
        latest_good = fresh;
        cache.set(grid.key, fresh);
        trim_cache();
        return NextResponse.json({
            source: "open-meteo-best-match",
            model: "automatic high-resolution model",
            cached: false,
            fetched_at: new Date(now).toISOString(),
            coverage: {
                points: vectors.length,
                batches_ok: ok_batches,
                batches_total: batches.length,
                step_lon: grid.step_lon,
                step_lat: grid.step_lat,
            },
            grid,
            vectors,
        });
    } catch {
        return NextResponse.json({
            source: "open-meteo-unavailable",
            degraded: true,
            vectors: [],
        });
    }
}
