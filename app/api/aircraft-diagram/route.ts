import { NextResponse } from "next/server";

export const revalidate = 0;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const AEROLOPA = "https://www.aerolopa.com";

interface DiagramResult {
    blueprint: { url: string; title: string; pageUrl: string; source: string } | null;
    seatmap: { url: string; title: string; pageUrl: string; airline: string; source: string } | null;
}

// ---- caches ----
const resultCache = new Map<string, { at: number; data: DiagramResult }>();
const airlineHomeCache = { at: 0, map: new Map<string, string>() };
const airlinePageCache = new Map<string, { at: number; aircraft: { slug: string; type: string }[] }>();
const RESULT_TTL = 60 * 60 * 1000;
const HOME_TTL = 6 * 60 * 60 * 1000;
const PAGE_TTL = 60 * 60 * 1000;

const STOP = new Set(["air", "airlines", "airline", "airways", "lines", "international", "the", "co", "ltd", "inc", "group", "holdings", "company", "aviation", "connection", "express", "regional", "system"]);
const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const sigWords = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));

// A few common ICAO->IATA to resolve airline straight from callsign when operator name is missing.
const ICAO_IATA: Record<string, string> = {
    DAL: "dl", UAL: "ua", AAL: "aa", SWA: "wn", BAW: "ba", DLH: "lh", AFR: "af", KLM: "kl", UAE: "ek",
    QTR: "qr", SIA: "sq", CPA: "cx", ACA: "ac", THY: "tk", JBU: "b6", ANA: "nh", JAL: "jl", QFA: "qf",
    VIR: "vs", IBE: "ib", AZA: "az", SAS: "sk", FIN: "ay", TAP: "tp", ETD: "ey", SVA: "sv", RYR: "fr",
    EZY: "u2", WZZ: "w6", VLG: "vy", EWG: "ew", AMX: "am", GLO: "g3", TAM: "jj", CCA: "ca", CES: "mu",
    CSN: "cz", HDA: "cx", ANZ: "nz", ELY: "ly", ROU: "ac", WJA: "ws", SKW: "oo", ASA: "as", NKS: "nk",
    FFT: "f9", HAL: "ha", AAR: "oz", KAL: "ke", EVA: "br", MAS: "mh", THA: "tg", GIA: "ga", PAL: "pr",
};

async function fetchText(url: string, timeout = 10000): Promise<string | null> {
    try {
        const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(timeout) });
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    }
}

async function imageExists(url: string): Promise<boolean> {
    try {
        const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(7000) });
        return res.ok && (res.headers.get("content-type") || "").startsWith("image");
    } catch {
        return false;
    }
}

async function getAirlineMap(): Promise<Map<string, string>> {
    if (airlineHomeCache.map.size && Date.now() - airlineHomeCache.at < HOME_TTL) return airlineHomeCache.map;
    const html = await fetchText(AEROLOPA + "/");
    const map = new Map<string, string>();
    if (html) {
        for (const m of html.matchAll(/tiles\/airlines\/([a-z0-9]+)_tile\.webp"\s+alt="([^"]+)"/gi)) map.set(m[1], m[2]);
        for (const m of html.matchAll(/<a[^>]+href="\/([a-z0-9]{2,3})"[^>]*>([^<]{2,60})<\/a>/gi)) if (!map.has(m[1])) map.set(m[1], m[2].trim());
        airlineHomeCache.map = map;
        airlineHomeCache.at = Date.now();
    }
    return map;
}

async function resolveAirlineSlug(operator: string, callsign: string): Promise<{ slug: string; name: string } | null> {
    const icao = (callsign || "").trim().slice(0, 3).toUpperCase();
    const map = await getAirlineMap();
    if (ICAO_IATA[icao] && map.has(ICAO_IATA[icao])) return { slug: ICAO_IATA[icao], name: map.get(ICAO_IATA[icao])! };
    if (!operator) return null;
    const on = norm(operator);
    const ow = new Set(sigWords(operator));
    let best: { slug: string; name: string } | null = null;
    let bestScore = 0;
    for (const [slug, name] of map) {
        const an = norm(name);
        if (!an) continue;
        let score = 0;
        if (an === on) score = 100;
        else if (an.includes(on) || on.includes(an)) score = 75;
        else {
            const hits = sigWords(name).filter((w) => ow.has(w)).length;
            if (hits) score = hits * 35;
        }
        if (score > bestScore) { bestScore = score; best = { slug, name }; }
    }
    return bestScore >= 35 ? best : null;
}

async function getAirlineAircraft(slug: string): Promise<{ slug: string; type: string }[]> {
    const cached = airlinePageCache.get(slug);
    if (cached && Date.now() - cached.at < PAGE_TTL) return cached.aircraft;
    const html = await fetchText(`${AEROLOPA}/${slug}`);
    const aircraft: { slug: string; type: string }[] = [];
    if (html) {
        const seen = new Set<string>();
        for (const m of html.matchAll(/tiles\/aircraft\/([a-z0-9-]+)\.webp"\s+alt="([^"]+)"/gi)) {
            if (seen.has(m[1])) continue;
            seen.add(m[1]);
            aircraft.push({ slug: m[1], type: m[2] });
        }
        airlinePageCache.set(slug, { at: Date.now(), aircraft });
    }
    return aircraft;
}

function numTokens(s: string): Set<string> {
    return new Set([...(s || "").matchAll(/([0-9]{3})/g)].map((m) => m[1]));
}

function scoreAircraft(needle: string, typeName: string): number {
    const a = norm(needle);
    const b = norm(typeName);
    if (!a || !b) return 0;
    if (a === b) return 100;
    if (a.includes(b) || b.includes(a)) return 80;
    const an = numTokens(needle);
    const bn = numTokens(typeName);
    const inter = [...an].filter((n) => bn.has(n));
    if (inter.length === 0) return 0;
    const mfrA = (needle.toLowerCase().match(/boeing|airbus|embraer|bombardier|douglas|atr|dash|comac|cessna|gulfstream|crj/) || [])[0];
    const mfrB = (typeName.toLowerCase().match(/boeing|airbus|embraer|bombardier|douglas|atr|dash|comac|cessna|gulfstream|crj/) || [])[0];
    const mfrBonus = mfrA && mfrB && mfrA === mfrB ? 15 : 0;
    return Math.min(95, inter.length * 30 + mfrBonus);
}

async function fetchBlueprint(family: string, desc: string): Promise<DiagramResult["blueprint"]> {
    const variant = (desc.match(/([0-9]{3})/g) || []).slice(0, 2);
    const queries = [`${family} silhouette`, `${family} orthographic`, `${family} 3-view`, `${desc} silhouette`, `${family} drawing`];
    let bestOverall: { url: string; title: string; page: string; score: number } | null = null;

    for (const q of queries) {
        if (!q.trim() || /^(silhouette|orthographic|3-view|drawing)$/i.test(q.trim())) continue;
        const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=10&gsrnamespace=6&prop=imageinfo&iiprop=url|mime&iiurlwidth=1200&format=json&origin=*`;
        const txt = await fetchText(api, 8000);
        if (!txt) continue;
        let data: any;
        try { data = JSON.parse(txt); } catch { continue; }
        const pages: any[] = Object.values(data?.query?.pages || {});
        for (const p of pages) {
            const ii = p.imageinfo?.[0];
            if (!ii?.thumburl) continue;
            const title: string = p.title || "";
            const isSvg = ii.mime === "image/svg+xml";
            let score = 0;
            if (/silhouette/i.test(title)) score += 4;
            if (/3.?view|orthographic/i.test(title)) score += 5;
            if (/line drawing|drawing|profile|vector|schematic/i.test(title)) score += 2;
            if (/\bv\d(\.\d)?\b/i.test(title)) score += 4;
            if (/family/i.test(title)) score += 1;
            if (isSvg) score += 3;
            for (const v of variant) if (title.includes(v)) score += 3;
            // reject photos and oddball one-off variants
            if (/\b(19|20)\d\d\b/.test(title) || /airport|livery|takeoff|landing|approach|taxi|runway|cockpit|engine|\bat\b|\.jpg/i.test(title)) score -= 8;
            if (/radome|antenna|prototype|experimental|winglet|sharklet|blended|nasa|\btest\b|concept|paint/i.test(title)) score -= 3;
            if (score <= 0) continue;
            if (!bestOverall || score > bestOverall.score) {
                bestOverall = { url: ii.thumburl, title: title.replace(/^File:/, "").replace(/\.[a-z]+$/i, ""), page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`, score };
            }
        }
        if (bestOverall && bestOverall.score >= 8) break;
    }

    if (!bestOverall) return null;
    return { url: bestOverall.url, title: bestOverall.title, pageUrl: bestOverall.page, source: "Wikimedia Commons" };
}

async function fetchSeatmap(operator: string, callsign: string, desc: string, model: string): Promise<DiagramResult["seatmap"]> {
    const airline = await resolveAirlineSlug(operator, callsign);
    if (!airline) return null;
    const aircraft = await getAirlineAircraft(airline.slug);
    if (!aircraft.length) return null;
    const needle = `${desc} ${model}`.trim();
    let best: { slug: string; type: string } | null = null;
    let bestScore = 0;
    for (const ac of aircraft) {
        const s = scoreAircraft(needle, ac.type);
        if (s > bestScore) { bestScore = s; best = ac; }
    }
    if (!best || bestScore < 40) return null;
    const url = `https://d9k46j35fmriq.cloudfront.net/maptool/seatmaps/${best.slug}.webp`;
    if (!(await imageExists(url))) return null;
    return {
        url,
        title: `${airline.name} · ${best.type}`,
        pageUrl: `${AEROLOPA}/${best.slug}`,
        airline: airline.name,
        source: "AeroLOPA",
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const desc = searchParams.get("desc") || "";
    const model = searchParams.get("model") || "";
    const family = searchParams.get("family") || desc || model;
    const operator = searchParams.get("operator") || "";
    const callsign = searchParams.get("callsign") || "";

    const key = norm(`${family}|${desc}|${model}|${operator}|${callsign.slice(0, 3)}`);
    const cached = resultCache.get(key);
    if (cached && Date.now() - cached.at < RESULT_TTL) {
        return NextResponse.json(cached.data);
    }

    const [blueprint, seatmap] = await Promise.all([
        fetchBlueprint(family, desc).catch(() => null),
        fetchSeatmap(operator, callsign, desc, model).catch(() => null),
    ]);

    const data: DiagramResult = { blueprint, seatmap };
    resultCache.set(key, { at: Date.now(), data });
    return NextResponse.json(data);
}
