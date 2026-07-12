"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface KartaPhoto {
    fileurl: string;
    fileurlProc: string;
    fileurlTh: string;
    fileurlLTh: string;
    imageProcUrl: string;
    imageThUrl: string;
    imageLthUrl: string;
    lat: string;
    lng: string;
    heading: string;
    projection: string;
    fieldOfView: string;
    sequenceId: string;
    sequenceIndex: number;
    shotDate: string;
}

interface StreetViewMapProps {
    initialLat?: number;
    initialLon?: number;
    initialZoom?: number;
}

export function StreetViewMap({
    initialLat = 0,
    initialLon = 0,
}: StreetViewMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [photo, setPhoto] = useState<KartaPhoto | null>(null);
    const [photos, setPhotos] = useState<KartaPhoto[]>([]);
    const [photoIdx, setPhotoIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const dragRef = useRef({ dragging: false, startX: 0, offsetX: 0, currentOffsetX: 0 });

    
    const fetchNearby = useCallback(async (lat: number, lon: number) => {
        setLoading(true);
        setError(null);
        try {
            const url = `https://api.openstreetcam.org/2.0/photo/?lat=${lat.toFixed(6)}&lng=${lon.toFixed(6)}&zoomLevel=18&radius=500&join=sequence&orderBy=id&orderDirection=desc`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`KartaView ${res.status}`);
            const json = await res.json();
            const data: KartaPhoto[] = json?.result?.data ?? [];
            if (data.length === 0) {
                setError(`No street imagery near ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
                setPhoto(null);
                setPhotos([]);
            } else {
                setPhotos(data);
                setPhotoIdx(0);
                setPhoto(data[0]);
            }
        } catch (err) {
            console.error("[KartaView] fetch error:", err);
            setError("Failed to load street imagery");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (Number.isFinite(initialLat) && Number.isFinite(initialLon) && (initialLat !== 0 || initialLon !== 0)) {
            void fetchNearby(initialLat, initialLon);
        } else {
            setLoading(false);
            setError("Move the globe to load street view");
        }
    }, [initialLat, initialLon, fetchNearby]);

    
    
    const getCandidateUrls = (p: KartaPhoto): string[] => {
        const urls: string[] = [];
        
        if (p.imageProcUrl) urls.push(p.imageProcUrl);
        if (p.imageThUrl) urls.push(p.imageThUrl);
        if (p.imageLthUrl) urls.push(p.imageLthUrl);
        
        if (p.fileurlProc) urls.push(p.fileurlProc);
        if (p.fileurlTh) urls.push(p.fileurlTh);
        if (p.fileurlLTh) urls.push(p.fileurlLTh);
        
        if (p.fileurl) {
            urls.push(p.fileurl.replace("{{sizeprefix}}", "wrapped_proc"));
            urls.push(p.fileurl.replace("{{sizeprefix}}", "th"));
            urls.push(p.fileurl.replace("{{sizeprefix}}", "lth"));
        }
        
        return [...new Set(urls)];
    };

    
    useEffect(() => {
        if (!photo || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const candidates = getCandidateUrls(photo);
        let attempt = 0;

        const img = new Image();
        img.crossOrigin = "anonymous";
        imgRef.current = img;

        img.onload = () => {
            canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
            canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
            drawImage(ctx, img, canvas.width, canvas.height, dragRef.current.currentOffsetX, photo.projection === "SPHERE");
        };
        img.onerror = () => {
            attempt++;
            if (attempt < candidates.length) {
                
                img.src = candidates[attempt];
            } else {
                
                console.warn("[KartaView] All URLs failed for photo, skipping to next");
                const nextIdx = photoIdx + 1;
                if (nextIdx < photos.length) {
                    setPhotoIdx(nextIdx);
                    setPhoto(photos[nextIdx]);
                    dragRef.current.currentOffsetX = 0;
                } else {
                    setError("No loadable images found nearby");
                }
            }
        };
        if (candidates.length > 0) {
            img.src = candidates[0];
        } else {
            setError("No image URL available");
        }
    }, [photo]);

    const drawImage = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number, offsetX: number, is360: boolean) => {
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, cw, ch);
        if (is360) {
            
            const srcW = img.naturalWidth;
            const srcH = img.naturalHeight;
            const viewW = srcW / 3; 
            const ox = ((offsetX % srcW) + srcW) % srcW;
            
            const firstSlice = Math.min(viewW, srcW - ox);
            ctx.drawImage(img, ox, 0, firstSlice, srcH, 0, 0, (firstSlice / viewW) * cw, ch);
            if (firstSlice < viewW) {
                ctx.drawImage(img, 0, 0, viewW - firstSlice, srcH, (firstSlice / viewW) * cw, 0, ((viewW - firstSlice) / viewW) * cw, ch);
            }
        } else {
            
            const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
        }
    };

    
    const onPointerDown = (e: React.PointerEvent) => {
        if (!photo || photo.projection !== "SPHERE") return;
        dragRef.current.dragging = true;
        dragRef.current.startX = e.clientX;
        dragRef.current.offsetX = dragRef.current.currentOffsetX;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current.dragging || !canvasRef.current || !imgRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const scale = imgRef.current.naturalWidth / (canvasRef.current.clientWidth * 3);
        dragRef.current.currentOffsetX = dragRef.current.offsetX - dx * scale;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) drawImage(ctx, imgRef.current, canvas.width, canvas.height, dragRef.current.currentOffsetX, true);
    };
    const onPointerUp = () => {
        dragRef.current.dragging = false;
    };

    
    const goNext = () => {
        if (photoIdx < photos.length - 1) {
            const next = photoIdx + 1;
            setPhotoIdx(next);
            setPhoto(photos[next]);
            dragRef.current.currentOffsetX = 0;
        }
    };
    const goPrev = () => {
        if (photoIdx > 0) {
            const prev = photoIdx - 1;
            setPhotoIdx(prev);
            setPhoto(photos[prev]);
            dragRef.current.currentOffsetX = 0;
        }
    };

    return (
        <div style={{ width: "100%", height: "100%", position: "relative", backgroundColor: "#111", overflow: "hidden" }}>
            {}
            <canvas
                ref={canvasRef}
                style={{ width: "100%", height: "100%", cursor: photo?.projection === "SPHERE" ? "grab" : "default", display: photo ? "block" : "none" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            />

            {}
            {(loading || error) && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 13, textAlign: "center", padding: 16 }}>
                    {loading ? "Loading street view..." : error}
                </div>
            )}

            {}
            {photo && photos.length > 1 && (
                <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 30 }}>
                    <button
                        onClick={goPrev}
                        disabled={photoIdx <= 0}
                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff", border: "1px solid #555", borderRadius: 4, padding: "4px 12px", cursor: photoIdx > 0 ? "pointer" : "not-allowed", fontSize: 13 }}
                    >
                        ◀ Prev
                    </button>
                    <span style={{ color: "#ccc", fontSize: 12, alignSelf: "center" }}>
                        {photoIdx + 1}/{photos.length}
                    </span>
                    <button
                        onClick={goNext}
                        disabled={photoIdx >= photos.length - 1}
                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff", border: "1px solid #555", borderRadius: 4, padding: "4px 12px", cursor: photoIdx < photos.length - 1 ? "pointer" : "not-allowed", fontSize: 13 }}
                    >
                        Next ▶
                    </button>
                </div>
            )}

            {}
            {photo && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "rgba(0,0,0,0.65)", color: "#ddd", fontSize: 11, padding: "4px 8px", zIndex: 30, display: "flex", justifyContent: "space-between" }}>
                    <span>KartaView {photo.projection === "SPHERE" ? "360°" : ""} · {photo.shotDate?.split(" ")[0] ?? ""}</span>
                    <span>{Number(photo.lat).toFixed(4)}, {Number(photo.lng).toFixed(4)}</span>
                </div>
            )}
        </div>
    );
}
