import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface PanoImage {
    id: number;
    handle: string;
    key: string;
    bucket: string;
    is_stereo: number;
}

interface ClumpItem {
    id: number;
    lat: number;
    lng: number;
    count: number;
    image: PanoImage;
}

export interface PanoramaPoint {
    id: number;
    lat: number;
    lon: number;
    handle: string;
    title: string;
    thumbUrl: string;
    embedUrl: string;
    pageUrl: string;
}

const UPSTREAM = "https://www.360cities.net/data/clump_filter";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const cache = new Map<string, { at: number; data: PanoramaPoint[] }>();
const CACHE_TTL = 60_000;

function thumbUrl(image: PanoImage): string {
    let domain: string;
    if (image.bucket === "tiles.360cities") domain = "cloudflare1.360gigapixels.com";
    else if (image.bucket === "360cities") domain = "cloudflare2.360gigapixels.com";
    else domain = `${image.bucket}.s3.amazonaws.com`;
    const stereo = image.is_stereo ? "LEFT" : "";
    return `https://${domain}/pano/${image.key}${stereo}/equirect_crop_3_1/1.jpg`;
}

function titleFromHandle(handle: string): string {
    return handle
        .split("-")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const latS = searchParams.get("latS");
    const latN = searchParams.get("latN");
    const lngW = searchParams.get("lngW");
    const lngE = searchParams.get("lngE");

    if (!latS || !latN || !lngW || !lngE) {
        return NextResponse.json({ error: "Missing bounding box parameters" }, { status: 400 });
    }

    const lat = searchParams.get("lat") || String((Number(latS) + Number(latN)) / 2);
    const lng = searchParams.get("lng") || String((Number(lngW) + Number(lngE)) / 2);
    const zoom = searchParams.get("zoom") || "14";

    const cacheKey = [latS, latN, lngW, lngE, zoom].map((v) => Number(v).toFixed(3)).join(",");
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL) {
        return NextResponse.json({ items: hit.data, cached: true });
    }

    const upstreamUrl =
        `${UPSTREAM}?latS=${encodeURIComponent(latS)}&latN=${encodeURIComponent(latN)}` +
        `&lngW=${encodeURIComponent(lngW)}&lngE=${encodeURIComponent(lngE)}` +
        `&lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}` +
        `&zoom=${encodeURIComponent(zoom)}&limit=300&order=random&offset=0&image_handle=`;

    try {
        const res = await fetch(upstreamUrl, {
            headers: { "User-Agent": UA, Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
            signal: AbortSignal.timeout(9000),
        });
        if (!res.ok) {
            return NextResponse.json({ items: [], error: `upstream ${res.status}` }, { status: 200 });
        }
        const json = (await res.json()) as { items?: ClumpItem[] };
        const seen = new Set<string>();
        const items: PanoramaPoint[] = [];
        for (const it of json.items || []) {
            const img = it?.image;
            if (!img?.handle || !Number.isFinite(it.lat) || !Number.isFinite(it.lng)) continue;
            if (seen.has(img.handle)) continue;
            seen.add(img.handle);
            items.push({
                id: img.id,
                lat: it.lat,
                lon: it.lng,
                handle: img.handle,
                title: titleFromHandle(img.handle),
                thumbUrl: thumbUrl(img),
                embedUrl: `https://www.360cities.net/embed_iframe/${img.handle}`,
                pageUrl: `https://www.360cities.net/image/${img.handle}/vr`,
            });
        }
        cache.set(cacheKey, { at: Date.now(), data: items });
        return NextResponse.json({ items });
    } catch (err) {
        return NextResponse.json(
            { items: [], error: err instanceof Error ? err.message : "panorama fetch failed" },
            { status: 200 },
        );
    }
}
