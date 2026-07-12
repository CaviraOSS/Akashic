export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export const revalidate = 86400; 
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name } = await params;
    const url = new URL(_req.url);
    const country = url.searchParams.get("country") || "";
    const iso = url.searchParams.get("iso") || "";
    const decodedName = decodeURIComponent(name);
    try {
        // 1) Search Wikipedia for the city page
        const searchQuery = `${decodedName} ${country} city`;
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srlimit=3&format=json&origin=*`;
        const searchRes = await fetch(searchUrl, { headers: { "User-Agent": "AkashicGlobe/1.0" } });
        if (!searchRes.ok) throw new Error("Wikipedia search failed");
        const searchData = await searchRes.json();
        const results = searchData?.query?.search;
        if (!results || results.length === 0) {
            return NextResponse.json({ name: decodedName, country, iso, wiki: null, wikidata: null });
        }
        const pageTitle = results[0].title;
        const pageId = results[0].pageid;
        
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
        const summaryRes = await fetch(summaryUrl, { headers: { "User-Agent": "AkashicGlobe/1.0" } });
        const summary = summaryRes.ok ? await summaryRes.json() : null;
        const summaryExtract = typeof summary?.extract === "string" ? summary.extract.trim() : "";
        const hasUsableSummary = summaryExtract.length >= 80 && summary?.type !== "disambiguation";
        
        const wdUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&pageids=${pageId}&format=json&origin=*`;
        const wdRes = await fetch(wdUrl, { headers: { "User-Agent": "AkashicGlobe/1.0" } });
        const wdData = wdRes.ok ? await wdRes.json() : null;
        const wdId = wdData?.query?.pages?.[pageId]?.pageprops?.wikibase_item;
        let wikidata: Record<string, unknown> | null = null;
        if (wdId) {
            
            
            const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${wdId}&props=P1082|P2046|P2044|P421|P856|P18|P625&format=json&origin=*`;
            const claimsRes = await fetch(claimsUrl, { headers: { "User-Agent": "AkashicGlobe/1.0" } });
            if (claimsRes.ok) {
                const claimsData = await claimsRes.json();
                const claims = claimsData?.claims || {};
                const getAmount = (pid: string): number | null => {
                    const c = claims[pid];
                    if (!c || !c[0]?.mainsnak?.datavalue?.value?.amount) return null;
                    return parseFloat(c[0].mainsnak.datavalue.value.amount);
                };
                const getString = (pid: string): string | null => {
                    const c = claims[pid];
                    if (!c || !c[0]?.mainsnak?.datavalue?.value) return null;
                    const v = c[pid === "P856" ? 0 : 0].mainsnak.datavalue.value;
                    if (typeof v === "string") return v;
                    return null;
                };
                
                let population: number | null = null;
                const popClaims = claims["P1082"];
                if (popClaims && popClaims.length > 0) {
                    
                    const last = popClaims[popClaims.length - 1];
                    const amt = last?.mainsnak?.datavalue?.value?.amount;
                    if (amt) population = parseFloat(amt);
                }
                const areaSqKm = getAmount("P2046");
                const elevationM = getAmount("P2044");
                
                let timezone: string | null = null;
                const tzClaims = claims["P421"];
                if (tzClaims?.[0]?.mainsnak?.datavalue?.value?.id) {
                    const tzId = tzClaims[0].mainsnak.datavalue.value.id;
                    
                    try {
                        const tzLabelUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${tzId}&props=labels&languages=en&format=json&origin=*`;
                        const tzLabelRes = await fetch(tzLabelUrl, { headers: { "User-Agent": "AkashicGlobe/1.0" } });
                        if (tzLabelRes.ok) {
                            const tzLabelData = await tzLabelRes.json();
                            timezone = tzLabelData?.entities?.[tzId]?.labels?.en?.value || null;
                        }
                    } catch {  }
                }
                
                const officialWebsite = getString("P856");
                
                let imageUrl: string | null = null;
                const imgClaims = claims["P18"];
                if (imgClaims?.[0]?.mainsnak?.datavalue?.value) {
                    const filename = imgClaims[0].mainsnak.datavalue.value;
                    if (typeof filename === "string") {
                        imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=640`;
                    }
                }
                wikidata = {
                    wikidataId: wdId,
                    population,
                    areaSqKm: areaSqKm ? Math.round(areaSqKm * 100) / 100 : null,
                    elevationM: elevationM ? Math.round(elevationM) : null,
                    timezone,
                    officialWebsite,
                    imageUrl,
                };
            }
        }
        return NextResponse.json({
            name: decodedName,
            country,
            iso,
            wiki: hasUsableSummary ? {
                title: summary.title,
                extract: summaryExtract,
                thumbnail: summary.thumbnail?.source || null,
                pageUrl: summary.content_urls?.desktop?.page || null,
            } : null,
            wikidata,
        });
    } catch (err: unknown) {
        console.error("[city API]", err);
        return NextResponse.json(
            { name: decodedName, country, iso, wiki: null, wikidata: null, error: "Failed to fetch city data" },
            { status: 200 } 
        );
    }
}

