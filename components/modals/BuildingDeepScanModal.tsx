"use client";

import { useEffect, useState } from "react";

interface DeepScanData {
    images: string[];
    drawings?: string[];
    facts: Record<string, string>;
    cvuOutline?: string | null;
    cvuFacts?: Record<string, string>;
    warning?: string;
    source?: string;
}

interface Props {
    url: string;
    onClose: () => void;
}

export default function BuildingDeepScanModal({ url, onClose }: Props) {
    const [data, setData] = useState<DeepScanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`/api/wm/building/deep-scan?url=${encodeURIComponent(url)}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) throw new Error(d.error);
                setData(d);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [url]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="relative flex h-[90vh] w-full max-w-6xl flex-col rounded-3xl border border-white/10 bg-stone-950 shadow-2xl overflow-hidden">
                { }
                <div className="flex items-center justify-between border-b border-white/5 bg-stone-900/50 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold uppercase tracking-wider text-white">Deep Scan Analysis</h2>
                            <p className="text-xs font-mono text-stone-400">Target: {new URL(url).hostname}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-stone-400 hover:bg-white/10 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                </div>

                { }
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                    {loading && (
                        <div className="flex h-full flex-col items-center justify-center gap-4">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/30 border-t-emerald-500" />
                            <div className="text-center">
                                <p className="font-mono text-sm uppercase tracking-widest text-emerald-400">Connecting to Remote Database...</p>
                                <p className="mt-2 font-mono text-xs text-stone-500">Initializing headless extraction. This may take a few seconds.</p>
                            </div>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="flex h-full flex-col items-center justify-center">
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center max-w-md">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <p className="font-mono text-sm text-red-300">Extraction Failed</p>
                                <p className="mt-2 text-xs text-stone-400">{error}</p>
                            </div>
                        </div>
                    )}

                    {data && !loading && (
                        <div className="flex flex-col gap-8">
                            {data.warning && (
                                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-100">
                                    {data.warning}
                                </div>
                            )}

                            { }
                            {data.cvuOutline && (
                                <div className="flex flex-col md:flex-row gap-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-6">
                                    <div className="flex w-full md:w-1/3 flex-col justify-center gap-4">
                                        <h3 className="font-mono text-lg font-bold uppercase tracking-widest text-emerald-400">Structure Metrics</h3>
                                        {data.cvuFacts && Object.entries(data.cvuFacts).map(([key, val], idx) => (
                                            <div key={key} className="flex flex-col border-l-2 border-emerald-500/40 pl-4">
                                                <span className="font-mono text-xs uppercase text-emerald-500/80">{(idx + 1).toString().padStart(2, '0')} - {key}</span>
                                                <span className="font-sans text-sm font-semibold text-stone-200 mt-1">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex w-full md:w-2/3 justify-center items-center bg-white/5 rounded-xl border border-white/5 p-4 min-h-[300px]">
                                        <img src={data.cvuOutline} alt="Structural Outline" className="max-h-[500px] object-contain drop-shadow-2xl" />
                                    </div>
                                </div>
                            )}

                            {data.drawings && data.drawings.length > 0 && (
                                <div>
                                    <h3 className="mb-4 border-b border-white/10 pb-2 font-mono text-xs uppercase tracking-widest text-emerald-400">plans, sections and elevations ({data.drawings.length})</h3>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {data.drawings.map((img, i) => (
                                            <a key={img} href={img} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-emerald-500/20 bg-white/[0.03]">
                                                <img src={img} alt={`architectural drawing ${i + 1}`} className="max-h-[440px] w-full object-contain" loading="lazy" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col lg:flex-row gap-8">
                                { }
                                <div className="w-full lg:w-1/3 shrink-0">
                                    <h3 className="mb-4 font-mono text-xs uppercase tracking-widest text-emerald-400 border-b border-white/10 pb-2">Extracted Metrics</h3>
                                    {Object.keys(data.facts).length > 0 ? (
                                        <div className="flex flex-col gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1">
                                            {Object.entries(data.facts).map(([key, val]) => (
                                                <div key={key} className="flex items-start justify-between rounded-lg px-3 py-2 hover:bg-white/5 transition-colors">
                                                    <span className="font-sans text-xs font-medium uppercase tracking-wider text-stone-400 pr-4">{key}</span>
                                                    <span className="text-right font-mono text-sm text-stone-200">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-stone-500">No structured metrics extracted.</p>
                                    )}
                                </div>

                                { }
                                <div className="w-full lg:w-2/3">
                                    <h3 className="mb-4 font-mono text-xs uppercase tracking-widest text-emerald-400 border-b border-white/10 pb-2">project media ({data.images.length})</h3>
                                    {data.images.length > 0 ? (
                                        <div className="columns-1 sm:columns-2 gap-4 space-y-4">
                                            {data.images.map((img, i) => (
                                                <div key={i} className="break-inside-avoid rounded-xl border border-white/10 bg-black/50 overflow-hidden relative group">
                                                    <img src={img} alt={`Extracted media ${i}`} className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <a href={img} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur hover:bg-white/20">Open Original</a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-white/10 flex h-48 items-center justify-center text-center p-6">
                                            <p className="text-sm text-stone-500">No media gallery found on the target page.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
