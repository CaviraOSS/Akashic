import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 60; 

export interface city_intel_marker {
    id: string;
    type: "webcam" | "shooting" | "intel";
    lat: number;
    lng: number;
    title: string;
    status: string;
    severity?: "low" | "medium" | "high" | "critical";
    url?: string;
    story?: string;
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name } = await params;
    const url = new URL(_req.url);
    const latStr = url.searchParams.get("lat");
    const lngStr = url.searchParams.get("lng");
    const decodedName = decodeURIComponent(name);
    if (!latStr || !lngStr) {
        return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }
    const baseLat = parseFloat(latStr);
    const baseLng = parseFloat(lngStr);
    const markers: city_intel_marker[] = [];
    
    
    let seed = 0;
    for (let i = 0; i < decodedName.length; i++) {
        seed += decodedName.charCodeAt(i);
    }
    const rnd = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };
    
    
    try {
        const markersPath = path.join(process.cwd(), "public", "markers.json");
        const markersData = await fs.readFile(markersPath, "utf-8");
        const allCams = JSON.parse(markersData);
        
        for (const cam of allCams) {
            if (!cam.lat || !cam.lng) continue;
            
            const dLat = cam.lat - baseLat;
            const dLng = cam.lng - baseLng;
            const kmLat = dLat * 111;
            const kmLng = dLng * 111 * Math.cos(baseLat * Math.PI / 180);
            const dist = Math.sqrt(kmLat * kmLat + kmLng * kmLng);
            
            if (dist <= 35) {
                markers.push({
                    id: cam.id || `cam-${Math.random().toString(36).slice(2, 9)}`,
                    type: "webcam",
                    lat: cam.lat,
                    lng: cam.lng,
                    title: `${cam.manufacturer || "CCTV"} | ${cam.city || decodedName}`,
                    status: "LIVE",
                    url: cam.stream
                });
            }
            if (markers.filter(m => m.type === "webcam").length >= 50) break; 
        }
    } catch (e) {
        console.error("Failed to load markers.json", e);
    }
    
    
    try {
        const query = encodeURIComponent(`${decodedName} (shooting OR gunfire OR violence OR police OR arrest)`);
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
        
        const Parser = (await import('rss-parser')).default;
        const parser = new Parser();
        const feed = await parser.parseURL(rssUrl);
        
        
        const newsItems = feed.items.slice(0, 5);
        
        newsItems.forEach((item, i) => {
            const isViolence = item.title?.toLowerCase().match(/shoot|gun|kill|murder|violence|dead|injur/);
            const type = isViolence ? "shooting" : "intel";
            const severity = isViolence ? (item.title?.toLowerCase().includes("kill") || item.title?.toLowerCase().includes("dead") ? "critical" : "high") : "medium";
            
            
            let snippet = item.contentSnippet || "";
            if (snippet.length > 250) snippet = snippet.substring(0, 250) + "...";
            // strip html tags if any
            snippet = snippet.replace(/<[^>]*>?/gm, '').trim();
            if (snippet.startsWith(item.title || "")) {
                snippet = snippet.substring((item.title || "").length).trim();
            }

            markers.push({
                id: `news-${i}`,
                type,
                lat: baseLat + (rnd() - 0.5) * 0.15,
                lng: baseLng + (rnd() - 0.5) * 0.15,
                title: type === "shooting" ? "CRITICAL INCIDENT" : "TACTICAL UPDATE",
                status: "ACTIVE",
                severity,
                story: `**[${item.title}](${item.link})**\n\n${snippet}\n\n*Published: ${new Date(item.pubDate || Date.now()).toLocaleString()}*`
            });
        });
        
    } catch (e) {
        console.error("Failed to fetch Google News", e);
    }

    
    markers.sort(() => rnd() - 0.5);

    return NextResponse.json({
        city: decodedName,
        markers
    });
}
