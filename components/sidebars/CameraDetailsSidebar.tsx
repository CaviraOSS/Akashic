"use client";

import type { TacticalCamera } from "@/lib/live/cameras";

function fmtDistance(km: number | null): string {
    if (km === null || !Number.isFinite(km)) return "-";
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function host(url: string | null): string {
    if (!url) return "-";
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

export default function CameraDetailsSidebar({ camera, onClose }: { camera: TacticalCamera | null; onClose: () => void }) {
    if (!camera) return null;

    const location = [camera.city, camera.region, camera.country].filter(Boolean).join(", ") || "Unknown location";
    const categories = camera.categories.length ? camera.categories.join(", ") : "Uncategorized";
    const coordinates = `${camera.lat.toFixed(4)}, ${camera.lon.toFixed(4)}`;

    const row = (label: string, value: string) => (
        <div key={label} className="flex items-center justify-between px-3.5 py-1.5">
            <span className="font-sans text-[0.55rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">{label}</span>
            <span className="max-w-[170px] truncate text-right font-mono text-[0.62rem] text-m3-on-surface" title={value}>{value}</span>
        </div>
    );

    const viewer = camera.embedUrl ? (
        <iframe
            src={camera.embedUrl}
            title={camera.name}
            className="h-full w-full rounded-card border border-m3-outline/40 bg-black"
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups"
        />
    ) : camera.thumbnailUrl ? (
        <img src={camera.thumbnailUrl} alt={camera.name} className="h-full w-full rounded-card border border-m3-outline/40 bg-black object-contain" />
    ) : (
        <div className="flex h-full w-full items-center justify-center rounded-card border border-m3-outline/40 bg-black text-[0.7rem] uppercase tracking-widest text-m3-on-surface-variant">
            No live preview available
        </div>
    );

    return (
        <div className="fixed inset-0 z-[220] flex cursor-default items-center justify-center bg-black/70 p-4 text-m3-on-surface backdrop-blur-sm sm:p-6">
            <div className="flex h-[82vh] max-h-[780px] w-[min(94vw,1180px)] flex-col overflow-hidden rounded-panel border border-cyan-400/25 bg-m3-surface shadow-2xl">
                <div className="relative border-b border-m3-outline-variant px-4 py-3 sm:px-5">
                    <div className="pr-10">
                        <div className="truncate text-[0.9rem] font-bold uppercase tracking-wide text-m3-on-surface" title={camera.name}>{camera.name}</div>
                        <div className="mt-0.5 truncate text-[0.6rem] text-m3-on-surface-variant" title={location}>{location}</div>
                    </div>
                    <button onClick={onClose} className="absolute right-3 top-3 cursor-pointer rounded-card border border-m3-outline bg-m3-surface-container px-2 py-1 text-xs text-m3-on-surface-variant hover:text-m3-on-surface">x</button>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-h-0 bg-black p-3 sm:p-4">
                        {viewer}
                    </div>

                    <div className="overflow-y-auto border-t border-m3-outline-variant bg-m3-surface lg:border-l lg:border-t-0">
                        <div className="grid grid-cols-2 gap-2 border-b border-m3-outline-variant px-3 py-3">
                            <div className="rounded-card border border-m3-outline bg-m3-surface-container p-2.5 text-center">
                                <div className="mb-1 font-sans text-[0.5rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">Status</div>
                                <div className="font-mono text-[0.9rem] font-bold uppercase text-cyan-300">{camera.status}</div>
                            </div>
                            <div className="rounded-card border border-m3-outline bg-m3-surface-container p-2.5 text-center">
                                <div className="mb-1 font-sans text-[0.5rem] font-medium uppercase tracking-wider text-m3-on-surface-variant">Distance</div>
                                <div className="font-mono text-[0.9rem] font-bold text-m3-on-surface">{fmtDistance(camera.distanceKm)}</div>
                            </div>
                        </div>

                        <div className="border-b border-m3-outline-variant">
                            <div className="px-3.5 pb-1 pt-2.5">
                                <span className="font-sans text-[0.5rem] font-semibold uppercase tracking-widest text-m3-primary">Camera Metadata</span>
                            </div>
                            {row("Provider", "Local Infrastructure")}
                            {row("Categories", categories)}
                            {row("Country", camera.country || "-")}
                            {row("Coords", coordinates)}
                            {row("Updated", camera.lastUpdated ? new Date(camera.lastUpdated).toLocaleString() : "-")}
                            {row("Source", host(camera.pageUrl))}
                            <div className="pb-1" />
                        </div>

                        <div className="px-3.5 py-3">
                            {camera.pageUrl && (
                                <a href={camera.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center rounded-card border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-400/15">
                                    Open Camera Source
                                </a>
                            )}
                            <div className="mt-2 text-[0.5rem] leading-relaxed text-m3-on-surface-variant">
                                Webcams parsed securely from public city directories.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
