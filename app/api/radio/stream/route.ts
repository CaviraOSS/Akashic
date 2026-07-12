export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { public_fetch } from "@/lib/net/public_fetch";

const str = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
const radio_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136 Safari/537.36",
    Referer: "https://radio.garden/",
    Accept: "audio/mpeg,audio/aac,audio/ogg,application/octet-stream,text/plain,*/*",
};

const fetch_stream = async (url: string) => {
    let last_error: unknown = new Error("stream fetch failed");
    for (let attempt = 0; attempt < 3; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12000);
        try {
            const res = await public_fetch(url, {
                method: "GET",
                cache: "no-store",
                headers: radio_headers,
                signal: ctrl.signal,
            });
            if (res.ok || (res.status < 500 && res.status !== 429) || attempt === 2) return res;
            last_error = new Error(`stream upstream failed: ${res.status}`);
            await res.body?.cancel().catch(() => undefined);
        } catch (error) {
            last_error = error;
        } finally {
            clearTimeout(timer);
        }
        await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
    }
    throw last_error;
};

const playlist_url = (text: string, base: string) => {
    const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    for (const line of lines) {
        if (line.startsWith("#")) continue;
        const file = line.match(/^file\d*=(.+)$/i)?.[1];
        const target = file || (!line.includes("=") ? line : null);
        if (!target) continue;
        try { return new URL(target.trim(), base).toString(); } catch { continue; }
    }
    return text.match(/https?:\/\/[^\s"'<>]+/i)?.[0] || null;
};

const open_stream = async (input: string) => {
    const first = await fetch_stream(input);
    if (!first.ok || !first.body) throw new Error(`stream upstream failed: ${first.status}`);
    const content_type = (first.headers.get("content-type") || "").toLowerCase();
    const playlist = content_type.includes("mpegurl") || content_type.includes("scpls") || content_type.includes("xspf") || content_type.startsWith("text/") || content_type.includes("json");
    if (!playlist) return first;
    const target = playlist_url(await first.text(), first.url || input);
    if (!target) throw new Error("playlist contained no stream");
    const second = await fetch_stream(target);
    if (!second.ok || !second.body) throw new Error(`playlist stream failed: ${second.status}`);
    return second;
};

export async function GET(req: Request) {
    try {
        const input = str(new URL(req.url).searchParams.get("url"));
        if (!input || !/^https?:\/\//i.test(input)) return NextResponse.json({ error: "url required" }, { status: 400 });
        const upstream = await open_stream(input);
        const headers = new Headers();
        headers.set("Cache-Control", "no-store, no-transform");
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
        for (const name of ["icy-br", "icy-description", "icy-genre", "icy-name", "icy-url"]) {
            const value = upstream.headers.get(name);
            if (value) headers.set(name, value);
        }
        return new Response(upstream.body, { status: 200, headers });
    } catch (error) {
        const cause = error instanceof Error && "cause" in error ? error.cause : null;
        console.warn("[api/radio/stream]", error instanceof Error ? error.message : error, cause);
        return NextResponse.json({ error: "stream proxy failed" }, { status: 502 });
    }
}
