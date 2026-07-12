export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
interface RadioStationRaw {
    stationuuid?: unknown;
    name?: unknown;
    country?: unknown;
    countrycode?: unknown;
    state?: unknown;
    language?: unknown;
    tags?: unknown;
    codec?: unknown;
    bitrate?: unknown;
    url?: unknown;
    url_resolved?: unknown;
    homepage?: unknown;
    favicon?: unknown;
    votes?: unknown;
    clickcount?: unknown;
    lastcheckok?: unknown;
    geo_lat?: unknown;
    geo_long?: unknown;
}
interface GardenPlaceRaw {
    id?: unknown;
    title?: unknown;
    country?: unknown;
    geo?: unknown;
    size?: unknown;
    url?: unknown;
}
interface UnifiedStation {
    id: string;
    name: string;
    country: string | null;
    countryCode: string | null;
    state: string | null;
    language: string | null;
    tags: string | null;
    codec: string | null;
    bitrate: number | null;
    streamUrl: string;
    homepage: string | null;
    favicon: string | null;
    votes: number | null;
    clickCount: number | null;
    online: boolean;
    lat: number;
    lon: number;
    frequencyMHz: number | null;
    source: "radio.garden" | "radio-browser";
    channel_id: string | null;
    place_id: string | null;
    station_url: string | null;
    stream_host: string | null;
    secure: boolean | null;
    preroll: boolean | null;
    utc_offset: number | null;
    place_size: number | null;
}
const str = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
const RG_PLACES_URL = "https://radio.garden/api/ara/content/places";
const RG_CHANNELS_URL = (id: string) => `https://radio.garden/api/ara/content/page/${encodeURIComponent(id)}/channels`;
const RG_LISTEN_URL = (id: string) => `https://radio.garden/api/ara/content/listen/${encodeURIComponent(id)}/channel.mp3`;
let gardenCache: { at: number; stations: UnifiedStation[] } = { at: 0, stations: [] };
const GARDEN_CACHE_MS = 30 * 60_000;
const garden_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36",
    Accept: "application/json",
    Referer: "https://radio.garden/",
};
function parseFrequencyMHz(name: string | null, tags: string | null): number | null {
    const txt = `${name || ""} ${tags || ""}`;
    const m = txt.match(/\b(\d{2,3}(?:\.\d)?)\s?mhz\b/i) || txt.match(/\b(\d{2,3}(?:\.\d)?)\b/);
    if (!m) return null;
    const v = Number(m[1]);
    return Number.isFinite(v) && v >= 50 && v <= 200 ? v : null;
}
function parseGardenStationId(url: string | null): string | null {
    if (!url) return null;
    const m = url.match(/\/listen\/[^/]+\/([^/?#]+)/i);
    return m?.[1] || null;
}
function site_favicon(url: string | null): string | null {
    if (!url) return null;
    try {
        return `${new URL(url).origin}/favicon.ico`;
    } catch {
        return null;
    }
}
function select_garden_places(places: GardenPlaceRaw[], limit: number, max_places: number): string[] {
    const groups = new Map<string, GardenPlaceRaw[]>();
    for (const place of places) {
        const id = str(place.id);
        if (!id) continue;
        const country = str(place.country) || "unknown";
        const group = groups.get(country) || [];
        group.push(place);
        groups.set(country, group);
    }
    const buckets = Array.from(groups.values()).map(group => group.sort((a, b) => (num(b.size) || 0) - (num(a.size) || 0)));
    const selected: string[] = [];
    let expected = 0;
    for (let depth = 0; selected.length < max_places; depth++) {
        let added = false;
        for (const bucket of buckets) {
            const place = bucket[depth];
            const id = str(place?.id);
            if (!id) continue;
            selected.push(id);
            expected += Math.max(1, num(place.size) || 1);
            added = true;
            if (selected.length >= max_places) break;
        }
        if (expected >= limit * 1.5) break;
        if (!added) break;
    }
    return selected;
}
function collectGardenChannelPages(node: unknown, out: Array<Record<string, unknown>>) {
    if (!node) return;
    if (Array.isArray(node)) {
        for (const n of node) collectGardenChannelPages(n, out);
        return;
    }
    if (typeof node !== "object") return;
    const rec = node as Record<string, unknown>;
    const page = rec.page;
    if (page && typeof page === "object") {
        const p = page as Record<string, unknown>;
        if (str(p.type) === "channel") out.push(p);
    }
    if (str(rec.type) === "channel") out.push(rec);
    for (const v of Object.values(rec)) collectGardenChannelPages(v, out);
}
async function fetchRadioBrowserStations(q: string, country: string, limit: number): Promise<{ stations: UnifiedStation[]; selectedHost: string | null; upstreamCount: number; }> {
    const hosts = [
        "https://de1.api.radio-browser.info/json/stations/search",
        "https://fr1.api.radio-browser.info/json/stations/search",
        "https://nl1.api.radio-browser.info/json/stations/search",
        "https://all.api.radio-browser.info/json/stations/search",
    ];
    let res: Response | null = null;
    let selectedHost: string | null = null;
    for (const host of hosts) {
        const stationUrl = new URL(host);
        stationUrl.searchParams.set("hidebroken", "true");
        stationUrl.searchParams.set("has_geo_info", "true");
        stationUrl.searchParams.set("offset", "0");
        stationUrl.searchParams.set("order", "clickcount");
        stationUrl.searchParams.set("reverse", "true");
        stationUrl.searchParams.set("limit", String(limit));
        if (q) stationUrl.searchParams.set("name", q);
        if (country) stationUrl.searchParams.set("country", country);
        try {
            const tryRes = await fetch(stationUrl.toString(), {
                cache: "no-store",
                headers: { "User-Agent": "akashic/0.1", Accept: "application/json" },
            });
            if (tryRes.ok) {
                res = tryRes;
                selectedHost = host;
                break;
            }
        } catch {
            continue;
        }
    }
    if (!res || !res.ok) throw new Error("radio browser unavailable");
    const raw = await res.json();
    const list = Array.isArray(raw) ? raw as RadioStationRaw[] : [];
    const stations = list.map((s): UnifiedStation | null => {
        const uuid = str(s.stationuuid);
        const name = str(s.name);
        const tags = str(s.tags);
        const stream_url = str(s.url_resolved) || str(s.url);
        const lat = num(s.geo_lat);
        const lon = num(s.geo_long);
        if (!uuid || !name || !stream_url || lat === null || lon === null) return null;
        return {
            id: `rb-${uuid}`,
            name,
            country: str(s.country),
            countryCode: str(s.countrycode),
            state: str(s.state),
            language: str(s.language),
            tags,
            codec: str(s.codec),
            bitrate: num(s.bitrate),
            streamUrl: stream_url,
            homepage: str(s.homepage),
            favicon: str(s.favicon),
            votes: num(s.votes),
            clickCount: num(s.clickcount),
            online: num(s.lastcheckok) === 1,
            lat,
            lon,
            frequencyMHz: parseFrequencyMHz(name, tags),
            source: "radio-browser" as const,
            channel_id: null,
            place_id: null,
            station_url: null,
            stream_host: (() => { try { return new URL(stream_url).hostname || null; } catch { return null; } })(),
            secure: stream_url.startsWith("https://"),
            preroll: null,
            utc_offset: null,
            place_size: null,
        };
    }).filter((s): s is UnifiedStation => s !== null);
    return { stations, selectedHost, upstreamCount: list.length };
}
async function fetchRadioGardenStations(limit: number, maxPlaces: number): Promise<UnifiedStation[]> {
    const now = Date.now();
    if (gardenCache.stations.length >= limit && now - gardenCache.at < GARDEN_CACHE_MS) {
        return gardenCache.stations.slice(0, limit);
    }
    const placesRes = await fetch(RG_PLACES_URL, {
        cache: "no-store",
        headers: garden_headers,
    });
    if (!placesRes.ok) throw new Error("radio garden places unavailable");
    const placesJson = await placesRes.json() as { data?: { list?: GardenPlaceRaw[] } };
    const placesList = Array.isArray(placesJson?.data?.list) ? placesJson.data.list : [];
    const placeGeo = new Map<string, { lat: number; lon: number; title: string | null; country: string | null; url: string | null; size: number | null }>();
    for (const p of placesList) {
        const pid = str(p.id);
        const geo = Array.isArray(p.geo) ? p.geo : [];
        const lon = num(geo[0]);
        const lat = num(geo[1]);
        if (!pid || lon === null || lat === null) continue;
        placeGeo.set(pid, { lat, lon, title: str(p.title), country: str(p.country), url: str(p.url), size: num(p.size) });
    }
    const placeIds = select_garden_places(placesList, limit, maxPlaces);
    const out = new Map<string, UnifiedStation>();
    const workerCount = 14;
    let idx = 0;
    const worker = async () => {
        while (idx < placeIds.length && out.size < limit) {
            const i = idx;
            idx += 1;
            const placeId = placeIds[i];
            try {
                const pageRes = await fetch(RG_CHANNELS_URL(placeId), {
                    cache: "no-store",
                    headers: garden_headers,
                });
                if (!pageRes.ok) continue;
                const pageJson = await pageRes.json();
                const utc_offset = num(pageJson?.data?.utcOffset);
                const pages: Array<Record<string, unknown>> = [];
                collectGardenChannelPages(pageJson?.data, pages);
                for (const p of pages) {
                    if (out.size >= limit) break;
                    const sid = parseGardenStationId(str(p.url));
                    if (!sid || out.has(sid)) continue;
                    const place = (p.place as Record<string, unknown> | undefined) || undefined;
                    const country = (p.country as Record<string, unknown> | undefined) || undefined;
                    const effectivePlaceId = str(place?.id) || placeId;
                    const geo = effectivePlaceId ? placeGeo.get(effectivePlaceId) : undefined;
                    const lat = geo?.lat;
                    const lon = geo?.lon;
                    if (lat === undefined || lon === undefined) continue;
                    const name = str(p.title);
                    if (!name) continue;
                    out.set(sid, {
                        id: `rg-${sid}`,
                        name,
                        country: str(country?.title) || geo?.country || null,
                        countryCode: null,
                        state: str(place?.title) || geo?.title || null,
                        language: null,
                        tags: "radio.garden",
                        codec: null,
                        bitrate: null,
                        streamUrl: RG_LISTEN_URL(sid),
                        homepage: str(p.website),
                        favicon: site_favicon(str(p.website)),
                        votes: null,
                        clickCount: null,
                        online: true,
                        lat,
                        lon,
                        frequencyMHz: parseFrequencyMHz(name, null),
                        source: "radio.garden",
                        channel_id: sid,
                        place_id: effectivePlaceId,
                        station_url: `https://radio.garden${str(p.url) || ""}`,
                        stream_host: str(p.stream),
                        secure: typeof p.secure === "boolean" ? p.secure : null,
                        preroll: typeof p.preroll === "boolean" ? p.preroll : null,
                        utc_offset,
                        place_size: geo?.size || null,
                    });
                }
            } catch {
                continue;
            }
        }
    };
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    const stations = Array.from(out.values());
    gardenCache = { at: now, stations };
    return stations.slice(0, limit);
}
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim() || "";
        const country = searchParams.get("country")?.trim() || "";
        const limit = Math.min(12000, Math.max(100, Number(searchParams.get("limit") || 8000)));
        const source = (searchParams.get("source") || "all").toLowerCase();
        const maxPlaces = Math.min(12000, Math.max(200, Number(searchParams.get("maxPlaces") || 5000)));
        const garden_limit = source === "all" ? Math.min(limit, Math.max(600, Math.round(limit * 0.4))) : limit;
        const [browser, garden] = await Promise.allSettled([
            source === "garden" ? Promise.resolve({ stations: [] as UnifiedStation[], selectedHost: null as string | null, upstreamCount: 0 }) : fetchRadioBrowserStations(q, country, Math.min(limit, 12000)),
            source === "browser" ? Promise.resolve([] as UnifiedStation[]) : fetchRadioGardenStations(garden_limit, maxPlaces),
        ]);
        const browserStations = browser.status === "fulfilled" ? browser.value.stations : [];
        const browserHost = browser.status === "fulfilled" ? browser.value.selectedHost : null;
        const browserUpstream = browser.status === "fulfilled" ? browser.value.upstreamCount : 0;
        const gardenStations = garden.status === "fulfilled" ? garden.value : [];
        const merged = new Map<string, UnifiedStation>();
        const identities = new Set<string>();
        const pushMany = (items: UnifiedStation[]) => {
            for (const st of items) {
                if (merged.size >= limit) break;
                if (!st.id || !st.name || !st.streamUrl) continue;
                if (!Number.isFinite(st.lat) || !Number.isFinite(st.lon)) continue;
                if (st.lat < -90 || st.lat > 90 || st.lon < -180 || st.lon > 180) continue;
                const identity = `${st.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}|${st.lat.toFixed(2)}|${st.lon.toFixed(2)}`;
                if (!merged.has(st.id) && !identities.has(identity)) {
                    merged.set(st.id, st);
                    identities.add(identity);
                }
            }
        };
        if (source === "garden") {
            pushMany(gardenStations);
        } else if (source === "browser") {
            pushMany(browserStations);
        } else {
            pushMany(gardenStations);
            pushMany(browserStations);
        }
        let stations = Array.from(merged.values());
        if (q) {
            const qq = q.toLowerCase();
            stations = stations.filter((s) => s.name.toLowerCase().includes(qq));
        }
        if (country) {
            const cc = country.toLowerCase();
            stations = stations.filter((s) => (s.country || "").toLowerCase().includes(cc));
        }
        stations = stations.slice(0, limit);
        console.info("[api/radio]", {
            source,
            host: browserHost,
            browserUpstream,
            browserCount: browserStations.length,
            gardenCount: gardenStations.length,
            mergedCount: stations.length,
            q,
            country,
            limit,
            maxPlaces,
        });
        return NextResponse.json({
            fetchedAt: new Date().toISOString(),
            source,
            count: stations.length,
            sources: {
                garden: {
                    state: garden.status === "fulfilled" ? "live" : "unavailable",
                    count: gardenStations.length,
                    error: garden.status === "rejected" ? String(garden.reason) : null,
                },
                browser: {
                    state: browser.status === "fulfilled" ? "live" : "unavailable",
                    count: browserStations.length,
                    host: browserHost,
                    error: browser.status === "rejected" ? String(browser.reason) : null,
                },
            },
            stations,
        });
    } catch {
        return NextResponse.json({ error: "radio fetch failed" }, { status: 500 });
    }
}
