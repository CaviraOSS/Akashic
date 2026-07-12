"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Globe2, Pause, Play, RadioTower, ShieldCheck, Volume2, X } from "lucide-react";
import type { TacticalRadio } from "@/components/map/MapGlobe";

interface radio_meta {
    nowPlaying?: string | null;
    streamName?: string | null;
    fetchedAt?: string;
    stream?: {
        description?: string | null;
        genre?: string | null;
        homepage?: string | null;
        bitrate?: number | null;
        content_type?: string | null;
        server?: string | null;
        final_url?: string | null;
    } | null;
    profile?: {
        title?: string | null;
        website?: string | null;
        station_url?: string | null;
        place?: string | null;
        country?: string | null;
        stream_host?: string | null;
        secure?: boolean | null;
        preroll?: boolean | null;
        social?: Array<{ platform: string; url: string }>;
    } | null;
}

const host = (value: string | null | undefined) => {
    try { return value ? new URL(value).hostname.replace(/^www\./, "") : null; } catch { return null; }
};

const origin_icon = (value: string | null | undefined) => {
    try { return value ? `${new URL(value).origin}/favicon.ico` : null; } catch { return null; }
};

const offset = (mins: number | null) => {
    if (mins === null) return "n/a";
    const sign = mins >= 0 ? "+" : "-";
    const val = Math.abs(mins);
    return `utc${sign}${String(Math.floor(val / 60)).padStart(2, "0")}:${String(val % 60).padStart(2, "0")}`;
};

function row(label: string, value: string, tone = "text-m3-on-surface") {
    return (
        <div key={label} className="flex min-h-8 items-center justify-between gap-3 border-b border-m3-outline-variant/50 px-3.5 py-1.5 last:border-0">
            <span className="text-[0.52rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">{label}</span>
            <span className={`max-w-[190px] truncate text-right font-mono text-[0.6rem] ${tone}`} title={value}>{value}</span>
        </div>
    );
}

export default function radio_details_sidebar({ radio, onClose }: { radio: TacticalRadio | null; onClose: () => void; }) {
    const [meta, set_meta] = useState<radio_meta | null>(null);
    const [playing, set_playing] = useState(false);
    const [connecting, set_connecting] = useState(false);
    const [ready, set_ready] = useState(false);
    const [audio_error, set_audio_error] = useState<string | null>(null);
    const [volume, set_volume] = useState(0.72);
    const [icon_index, set_icon_index] = useState(0);
    const audio_ref = useRef<HTMLAudioElement | null>(null);
    const metadata_ctrl_ref = useRef<AbortController | null>(null);
    const trying_ref = useRef(false);

    useEffect(() => {
        if (!radio?.streamUrl) {
            set_meta(null);
            return;
        }
        if (playing || connecting) return;
        const ctrl = new AbortController();
        metadata_ctrl_ref.current = ctrl;
        const fetch_now = async () => {
            try {
                const params = new URLSearchParams({ streamUrl: radio.streamUrl });
                if (radio.channel_id) params.set("stationId", radio.channel_id);
                const res = await fetch(`/api/radio/now-playing?${params}`, { cache: "no-store", signal: ctrl.signal });
                if (!res.ok) return;
                set_meta(await res.json() as radio_meta);
            } catch {
                if (!ctrl.signal.aborted) set_meta(null);
            }
        };
        void fetch_now();
        const id = window.setInterval(fetch_now, 30000);
        return () => {
            ctrl.abort();
            if (metadata_ctrl_ref.current === ctrl) metadata_ctrl_ref.current = null;
            window.clearInterval(id);
        };
    }, [radio?.id, radio?.streamUrl, radio?.channel_id, playing, connecting]);

    useEffect(() => {
        set_playing(false);
        set_connecting(false);
        set_ready(false);
        set_audio_error(null);
        set_icon_index(0);
        if (audio_ref.current) {
            audio_ref.current.pause();
            audio_ref.current.load();
        }
    }, [radio?.id]);

    const audio_src = useMemo(() => radio?.streamUrl ? `/api/radio/stream?url=${encodeURIComponent(radio.streamUrl)}` : "", [radio?.streamUrl]);
    const homepage = meta?.profile?.website || radio?.homepage || meta?.stream?.homepage || null;
    const station_url = meta?.profile?.station_url || radio?.station_url || null;
    const icon_urls = useMemo(() => {
        if (!radio) return [];
        const domain = host(homepage);
        return Array.from(new Set([
            radio.favicon,
            origin_icon(homepage),
            domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : null,
        ].filter((x): x is string => !!x)));
    }, [radio?.favicon, homepage]);
    const bitrate = meta?.stream?.bitrate || radio?.bitrate || null;
    const stream_host = meta?.profile?.stream_host || radio?.stream_host || host(meta?.stream?.final_url) || null;
    const now_playing = meta?.nowPlaying || meta?.streamName || "live programme metadata unavailable";
    const place = meta?.profile?.place || radio?.state || "unknown location";
    const country = meta?.profile?.country || radio?.country || "unknown country";
    const secure = meta?.profile?.secure ?? radio?.secure;
    const socials = meta?.profile?.social || [];

    const media_error = () => {
        const code = audio_ref.current?.error?.code;
        if (code === 2) return "network interrupted - retry available";
        if (code === 3) return "station audio could not be decoded";
        if (code === 4) return "station format is unsupported";
        return "stream connection failed";
    };

    const play_once = async (audio: HTMLAudioElement, source: string, attempt: number, proxied: boolean) => {
        audio.pause();
        audio.src = proxied ? `/api/radio/stream?url=${encodeURIComponent(source)}&attempt=${Date.now()}-${attempt}` : source;
        audio.volume = volume;
        audio.load();
        let timer = 0;
        try {
            await Promise.race([
                audio.play(),
                new Promise<never>((_, reject) => {
                    timer = window.setTimeout(() => reject(new Error("stream timeout")), 14000);
                }),
            ]);
        } finally {
            window.clearTimeout(timer);
        }
    };

    const toggle_play = async () => {
        const audio = audio_ref.current;
        if (!audio || !radio) return;
        if (!audio.paused) {
            audio.pause();
            set_playing(false);
            return;
        }
        metadata_ctrl_ref.current?.abort();
        set_audio_error(null);
        set_connecting(true);
        set_ready(false);
        trying_ref.current = true;
        const sources = Array.from(new Set([radio.streamUrl, meta?.stream?.final_url].filter((x): x is string => !!x)));
        const targets = sources.flatMap(source => [{ source, proxied: true }, { source, proxied: false }]);
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            try {
                await play_once(audio, target.source, i, target.proxied);
                trying_ref.current = false;
                set_connecting(false);
                set_playing(true);
                return;
            } catch {
                audio.pause();
            }
        }
        trying_ref.current = false;
        set_connecting(false);
        set_audio_error(media_error());
        set_playing(false);
    };

    if (!radio) return null;

    return (
        <div className="flight-sidebar max-h-[88vh] w-[340px] overflow-y-auto rounded-panel border border-m3-outline-variant bg-m3-surface text-m3-on-surface shadow-panel-sm">
            <audio
                ref={audio_ref}
                preload="none"
                src={audio_src}
                onCanPlay={() => set_ready(true)}
                onPlaying={() => { set_connecting(false); set_playing(true); }}
                onPause={() => set_playing(false)}
                onStalled={() => { if (!trying_ref.current) set_audio_error("station stalled - press play to reconnect"); }}
                onError={() => {
                    if (trying_ref.current) return;
                    set_audio_error(media_error());
                    set_connecting(false);
                    set_playing(false);
                }}
            />

            <div className="relative border-b border-m3-outline-variant bg-m3-surface-container-low px-3.5 py-3">
                <div className="flex items-center gap-3 pr-7">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-card border border-m3-outline bg-m3-surface-container">
                        {icon_urls[icon_index] ? (
                            <img src={icon_urls[icon_index]} alt="" className="h-8 w-8 object-contain" onError={() => set_icon_index(x => x + 1)} />
                        ) : <RadioTower size={20} className="text-blue" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[0.78rem] font-bold tracking-wide text-m3-on-surface">{radio.name}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[0.52rem] text-m3-on-surface-variant">
                            <span className={`h-1.5 w-1.5 rounded-full ${radio.online ? "bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.8)]" : "bg-amber-400"}`} />
                            <span className="truncate">{place} · {country}</span>
                        </div>
                    </div>
                </div>
                <button type="button" onClick={onClose} title="close" className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-m3-on-surface-variant hover:bg-m3-surface-container hover:text-m3-on-surface">
                    <X size={14} />
                </button>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-tag border border-blue/40 bg-blue/10 px-2 py-0.5 text-[0.48rem] font-semibold uppercase tracking-wider text-blue">{radio.source}</span>
                    {radio.frequencyMHz !== null && <span className="rounded-tag border border-m3-outline px-2 py-0.5 font-mono text-[0.48rem] text-m3-on-surface-variant">{radio.frequencyMHz.toFixed(1)} mhz</span>}
                    {secure && <span className="inline-flex items-center gap-1 rounded-tag border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.48rem] text-emerald-400"><ShieldCheck size={9} /> secure</span>}
                </div>
            </div>

            <div className="border-b border-m3-outline-variant px-3.5 py-3.5">
                <div className="mb-1 text-[0.5rem] font-semibold uppercase tracking-[0.16em] text-blue">now playing</div>
                <div className="min-h-9 text-[0.72rem] font-semibold leading-snug text-m3-on-surface">{now_playing}</div>
                {meta?.stream?.description && <div className="mt-1 line-clamp-2 text-[0.54rem] leading-relaxed text-m3-on-surface-variant">{meta.stream.description}</div>}

                <div className="mt-3 flex h-10 items-center gap-3 border-t border-m3-outline-variant/60 pt-3">
                    <button type="button" onClick={toggle_play} title={playing ? "pause" : "play"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue/50 bg-blue/10 text-blue hover:bg-blue/20">
                        {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className={connecting ? "ml-0.5 animate-pulse" : "ml-0.5"} />}
                    </button>
                    <div className="flex h-7 flex-1 items-end gap-[3px] overflow-hidden" aria-hidden="true">
                        {[9, 17, 12, 23, 15, 26, 11, 20, 14, 24, 10, 18].map((h, i) => (
                            <span key={i} className={`w-full rounded-sm bg-blue/70 ${playing ? "animate-pulse" : "opacity-25"}`} style={{ height: playing ? h : 4, animationDelay: `${i * 70}ms` }} />
                        ))}
                    </div>
                    <Volume2 size={14} className="shrink-0 text-m3-on-surface-variant" />
                    <input
                        aria-label="volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={e => {
                            const val = Number(e.target.value);
                            set_volume(val);
                            if (audio_ref.current) audio_ref.current.volume = val;
                        }}
                        className="h-1 w-16 accent-blue"
                    />
                </div>
                <div className="mt-2 flex items-center justify-between font-mono text-[0.48rem] text-m3-on-surface-variant">
                    <span>{audio_error || (playing ? "receiving live audio" : connecting ? "resolving station stream" : ready ? "stream ready" : "press play to connect")}</span>
                    <span>{radio.codec || meta?.stream?.content_type?.replace("audio/", "") || "stream"}{bitrate ? ` · ${bitrate} kbps` : ""}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 border-b border-m3-outline-variant">
                <div className="border-r border-m3-outline-variant px-2 py-2.5 text-center">
                    <div className="font-mono text-[0.66rem] font-bold text-m3-on-surface">{secure === null ? "n/a" : secure ? "tls" : "open"}</div>
                    <div className="mt-0.5 text-[0.44rem] uppercase tracking-wider text-m3-on-surface-variant">transport</div>
                </div>
                <div className="border-r border-m3-outline-variant px-2 py-2.5 text-center">
                    <div className="truncate font-mono text-[0.66rem] font-bold text-m3-on-surface">{meta?.stream?.genre || radio.tags?.split(",")[0] || "general"}</div>
                    <div className="mt-0.5 text-[0.44rem] uppercase tracking-wider text-m3-on-surface-variant">format</div>
                </div>
                <div className="px-2 py-2.5 text-center">
                    <div className="font-mono text-[0.66rem] font-bold text-m3-on-surface">{offset(radio.utc_offset)}</div>
                    <div className="mt-0.5 text-[0.44rem] uppercase tracking-wider text-m3-on-surface-variant">station time</div>
                </div>
            </div>

            <div className="border-b border-m3-outline-variant py-1.5">
                <div className="px-3.5 pb-1 pt-1.5 text-[0.48rem] font-semibold uppercase tracking-[0.16em] text-m3-primary">station intelligence</div>
                {row("location", `${radio.lat.toFixed(4)}, ${radio.lon.toFixed(4)}`)}
                {row("language", radio.language || "not supplied")}
                {row("local catalog", radio.place_size === null ? "not supplied" : `${radio.place_size.toLocaleString()} stations`)}
                {row("stream host", stream_host || "not disclosed")}
                {row("preroll", (meta?.profile?.preroll ?? radio.preroll) === null ? "unknown" : (meta?.profile?.preroll ?? radio.preroll) ? "enabled" : "none")}
                {row("popularity", radio.votes !== null ? `${radio.votes.toLocaleString()} votes` : radio.clickCount !== null ? `${radio.clickCount.toLocaleString()} recent clicks` : "not ranked")}
                {row("station id", radio.channel_id || radio.id)}
            </div>

            {(homepage || station_url || socials.length > 0) && (
                <div className="px-3.5 py-3">
                    <div className="mb-2 text-[0.48rem] font-semibold uppercase tracking-[0.16em] text-m3-primary">source links</div>
                    <div className="flex flex-wrap gap-2">
                        {homepage && <a href={homepage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-tag border border-m3-outline bg-m3-surface-container px-2.5 py-1.5 text-[0.54rem] text-m3-on-surface hover:border-blue/50"><Globe2 size={11} /> station site</a>}
                        {station_url && <a href={station_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-tag border border-m3-outline bg-m3-surface-container px-2.5 py-1.5 text-[0.54rem] text-m3-on-surface hover:border-blue/50"><RadioTower size={11} /> radio garden</a>}
                        {socials.map(link => <a key={`${link.platform}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-tag border border-m3-outline px-2.5 py-1.5 text-[0.52rem] text-m3-on-surface-variant hover:text-m3-on-surface">{link.platform}<ExternalLink size={9} /></a>)}
                    </div>
                </div>
            )}
        </div>
    );
}
