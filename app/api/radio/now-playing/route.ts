export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { public_fetch } from "@/lib/net/public_fetch";
const str = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && Number.isFinite(Number(v)) ? Number(v) : null;
const garden_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36",
    Accept: "application/json",
    Referer: "https://radio.garden/",
};
interface stream_meta {
    title: string | null;
    stream_name: string | null;
    description: string | null;
    genre: string | null;
    homepage: string | null;
    bitrate: number | null;
    content_type: string | null;
    server: string | null;
    final_url: string | null;
}
async function fetch_garden_profile(station_id: string) {
    const res = await fetch(`https://radio.garden/api/ara/content/channel/${encodeURIComponent(station_id)}`, {
        cache: "no-store",
        headers: garden_headers,
        signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data || {};
    return {
        id: str(data.id) || station_id,
        title: str(data.title),
        website: str(data.website),
        station_url: str(data.url) ? `https://radio.garden${data.url}` : null,
        place: str(data.place?.title),
        country: str(data.country?.title),
        stream_host: str(data.stream),
        secure: typeof data.secure === "boolean" ? data.secure : null,
        preroll: typeof data.preroll === "boolean" ? data.preroll : null,
        social: Array.isArray(data.social) ? data.social.map((x: any) => ({ platform: str(x?.platform), url: str(x?.url) })).filter((x: any) => x.platform && x.url) : [],
    };
}
async function readIcyMetadata(streamUrl: string): Promise<stream_meta> {
    const res = await public_fetch(streamUrl, {
        headers: {
            "Icy-MetaData": "1",
            "User-Agent": garden_headers["User-Agent"],
            Referer: garden_headers.Referer,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
    });
    const base = {
        title: null,
        stream_name: str(res.headers.get("icy-name")),
        description: str(res.headers.get("icy-description")),
        genre: str(res.headers.get("icy-genre")),
        homepage: str(res.headers.get("icy-url")),
        bitrate: num(res.headers.get("icy-br")),
        content_type: str(res.headers.get("content-type")),
        server: str(res.headers.get("server")),
        final_url: str(res.url),
    } satisfies stream_meta;
    if (!res.ok) return base;
    const icyName = str(res.headers.get("icy-name"));
    const metaInt = Number(res.headers.get("icy-metaint") || "0");
    if (!res.body || !Number.isFinite(metaInt) || metaInt <= 0) {
        await res.body?.cancel().catch(() => undefined);
        return { ...base, stream_name: icyName };
    }
    const reader = res.body.getReader();
    let received = 0;
    let metaLen = -1;
    let metaBytes: number[] = [];
    const decoder = new TextDecoder("utf-8");
    try {
        while (received < metaInt + 4096) {
            const { value, done } = await reader.read();
            if (done || !value) break;
            for (let i = 0; i < value.length; i++) {
                const b = value[i];
                if (received < metaInt) {
                    received++;
                    continue;
                }
                if (metaLen < 0) {
                    metaLen = b * 16;
                    if (metaLen === 0) {
                        await reader.cancel().catch(() => undefined);
                        return { ...base, stream_name: icyName };
                    }
                    continue;
                }
                if (metaBytes.length < metaLen) {
                    metaBytes.push(b);
                    if (metaBytes.length === metaLen) {
                        const txt = decoder.decode(new Uint8Array(metaBytes)).replace(/\0/g, "");
                        const match = txt.match(/StreamTitle='([^']*)'/i);
                        await reader.cancel().catch(() => undefined);
                        return { ...base, title: match?.[1]?.trim() || null, stream_name: icyName };
                    }
                }
            }
        }
    } catch {
        await reader.cancel().catch(() => undefined);
        return { ...base, stream_name: icyName };
    }
    await reader.cancel().catch(() => undefined);
    return { ...base, stream_name: icyName };
}
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const streamUrl = searchParams.get("streamUrl")?.trim();
        const station_id = searchParams.get("stationId")?.trim() || "";
        if (!streamUrl) return NextResponse.json({ error: "streamUrl required" }, { status: 400 });
        const [meta_result, profile_result] = await Promise.allSettled([
            readIcyMetadata(streamUrl),
            station_id ? fetch_garden_profile(station_id) : Promise.resolve(null),
        ]);
        const meta = meta_result.status === "fulfilled" ? meta_result.value : null;
        const profile = profile_result.status === "fulfilled" ? profile_result.value : null;
        return NextResponse.json({
            fetchedAt: new Date().toISOString(),
            nowPlaying: meta?.title || null,
            streamName: meta?.stream_name || null,
            stream: meta ? {
                description: meta.description,
                genre: meta.genre,
                homepage: meta.homepage,
                bitrate: meta.bitrate,
                content_type: meta.content_type,
                server: meta.server,
                final_url: meta.final_url,
            } : null,
            profile,
        });
    } catch {
        return NextResponse.json({ error: "now playing unavailable" }, { status: 502 });
    }
}
