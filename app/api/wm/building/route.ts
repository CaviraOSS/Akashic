import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";

function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
    const r = 6371000;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLon = (b.lon - a.lon) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function elementCenter(element: any): { lat: number; lon: number } | null {
    if (Number.isFinite(element?.lat) && Number.isFinite(element?.lon)) return { lat: element.lat, lon: element.lon };
    if (Number.isFinite(element?.center?.lat) && Number.isFinite(element?.center?.lon)) return { lat: element.center.lat, lon: element.center.lon };
    return null;
}

function bestOverpassElement(elements: any[] | undefined, target: { lat: number; lon: number }, nominatim: any): any | null {
    if (!Array.isArray(elements) || elements.length === 0) return null;
    const osmId = Number(nominatim?.osm_id);
    const osmType = String(nominatim?.osm_type || "").toLowerCase();
    const matched = elements.find((element) => {
        if (!Number.isFinite(osmId) || element.id !== osmId) return false;
        if (!osmType) return true;
        return osmType.startsWith(String(element.type || "").toLowerCase()[0]);
    });
    if (matched) return matched;
    return elements
        .map((element) => ({ element, center: elementCenter(element) }))
        .filter((entry) => entry.center)
        .sort((a, b) => distanceMeters(target, a.center!) - distanceMeters(target, b.center!))[0]?.element || elements[0];
}

function quietFetchReason(error: unknown): string {
    const anyError = error as any;
    const code = anyError?.cause?.code || anyError?.code;
    if (code === "ENOTFOUND") return "dns unavailable";
    if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") return "timeout";
    if (error instanceof Error) return error.message;
    return "fetch failed";
}

function archdaily_search_url(name: string, address: string | null | undefined): string | null {
    const query = [name !== "Unknown Building" ? name : "", address?.split(",")[0] || ""].filter(Boolean).join(" ").trim();
    if (!query) return null;
    return `https://www.archdaily.com/search/projects?text=${encodeURIComponent(query)}`;
}

function is_archdaily_url(value: string): boolean {
    try {
        const url = new URL(value);
        return (url.hostname === "archdaily.com" || url.hostname === "www.archdaily.com")
            && /^\/(?:[a-z]{2}\/)?\d+\//i.test(url.pathname);
    } catch {
        return false;
    }
}

function discover_archdaily_url(discoveries: Array<{ title: string; snippet: string; link: string }>): string | null {
    for (const discovery of discoveries) {
        if (is_archdaily_url(discovery.link || "")) return discovery.link;
    }
    return null;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
        return NextResponse.json({ error: "Missing lat/lon parameters" }, { status: 400 });
    }

    try {

        const overpassQuery = `
            [out:json][timeout:5];
            (
                way["building"](around:25, ${lat}, ${lon});
                relation["building"](around:25, ${lat}, ${lon});
            );
            out center tags;
        `;

        const [wikiGeo, nominatim, overpass] = await Promise.allSettled([
            fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gsradius=60&gscoord=${lat}|${lon}&format=json`, {
                headers: { "User-Agent": "Akashic/1.0" }
            }).then(r => r.json()),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1&extratags=1`, {
                headers: { "User-Agent": "Akashic/1.0" }
            }).then(r => r.json()),
            fetch(OVERPASS_URL, {
                method: "POST",
                body: `data=${encodeURIComponent(overpassQuery)}`,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Akashic/1.0"
                }
            }).then(r => r.json())
        ]);

        const wikiData = wikiGeo.status === "fulfilled" ? wikiGeo.value : null;
        const nomData = nominatim.status === "fulfilled" ? nominatim.value : null;
        const opData = overpass.status === "fulfilled" ? overpass.value : null;


        let baseName = "Unknown Building";
        let baseType = "building";
        let baseAddress = "";
        let baseLevels = null;
        let baseHeight = null;
        let baseArchitect = null;
        let wikidataId = null;
        let wikipediaTitle = null;

        const opElement = bestOverpassElement(opData?.elements, { lat: Number(lat), lon: Number(lon) }, nomData);
        const opBuilding = opElement?.tags || {};
        const nomExtratags = nomData?.extratags || {};

        if (nomData?.display_name) baseAddress = nomData.display_name;
        if (opBuilding["building:levels"] || nomExtratags["building:levels"]) baseLevels = opBuilding["building:levels"] || nomExtratags["building:levels"];
        if (opBuilding.height || nomExtratags.height) baseHeight = opBuilding.height || nomExtratags.height;
        if (opBuilding.architect || nomExtratags.architect) baseArchitect = opBuilding.architect || nomExtratags.architect;
        if (nomData?.type) baseType = nomData.type;
        if (opBuilding.building && opBuilding.building !== "yes") baseType = opBuilding.building;


        if (opBuilding.name || opBuilding["name:en"]) baseName = opBuilding["name:en"] || opBuilding.name;
        if (nomData?.name) baseName = nomData.name;


        if (nomExtratags.wikidata) wikidataId = nomExtratags.wikidata;
        if (nomExtratags.wikipedia) wikipediaTitle = nomExtratags.wikipedia;


        let closestWiki = null;
        if (wikiData?.query?.geosearch?.length > 0) {
            closestWiki = wikiData.query.geosearch[0];
            baseName = closestWiki.title;
            wikipediaTitle = closestWiki.title;
        }

        const result: any = {
            found: true,
            source: [],
            name: baseName,
            address: baseAddress,
            levels: baseLevels,
            height: baseHeight,
            architect: baseArchitect,
            type: baseType,
            operator: opBuilding.operator || nomExtratags.operator || null,
            amenity: opBuilding.amenity || nomExtratags.amenity || null,
            wikidata: wikidataId,
            wikipedia: wikipediaTitle,
            lat: Number(lat),
            lon: Number(lon),
            wikiImage: null,
            description: null,
            structuralDetails: null,
            rankedDeepScanUrl: null,
            rankedDeepScanSource: null,
            webDiscoveries: []
        };

        if (nomData) result.source.push("Nominatim");
        if (closestWiki) result.source.push("Wikipedia");
        if (opData?.elements?.length > 0) result.source.push("Overpass");


        if (wikipediaTitle) {
            const cleanTitle = wikipediaTitle.includes(":") ? wikipediaTitle.split(":")[1] : wikipediaTitle;
            try {
                const [extractRes, propsRes] = await Promise.all([
                    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`, { headers: { "User-Agent": "Akashic/1.0" } }).then(r => r.json()),
                    fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&titles=${encodeURIComponent(cleanTitle)}&format=json`, { headers: { "User-Agent": "Akashic/1.0" } }).then(r => r.json())
                ]);

                if (extractRes.extract) result.description = extractRes.extract;
                if (extractRes.thumbnail?.source) result.wikiImage = extractRes.thumbnail.source;

                if (!wikidataId && propsRes?.query?.pages) {
                    const pages = Object.values(propsRes.query.pages) as any[];
                    if (pages.length > 0 && pages[0].pageprops?.wikibase_item) {
                        wikidataId = pages[0].pageprops.wikibase_item;
                        result.wikidata = wikidataId;
                    }
                }
            } catch (err) {
                console.error("Wikipedia detail fetch error:", err);
            }
        }

        if (wikidataId) {
            result.source.push("Wikidata");
            const sparqlQuery = `
                SELECT ?image ?architectLabel ?materialsLabel ?inception ?floors ?height ?website ?styleLabel ?engineerLabel ?contractorLabel ?cost ?elevators WHERE {
                  OPTIONAL { wd:${wikidataId} wdt:P18 ?image. }
                  OPTIONAL { wd:${wikidataId} wdt:P84 ?architect. }
                  OPTIONAL { wd:${wikidataId} wdt:P186 ?materials. }
                  OPTIONAL { wd:${wikidataId} wdt:P571 ?inception. }
                  OPTIONAL { wd:${wikidataId} wdt:P1101 ?floors. }
                  OPTIONAL { wd:${wikidataId} wdt:P2048 ?height. }
                  OPTIONAL { wd:${wikidataId} wdt:P856 ?website. }
                  OPTIONAL { wd:${wikidataId} wdt:P149 ?style. }
                  OPTIONAL { wd:${wikidataId} wdt:P631 ?engineer. }
                  OPTIONAL { wd:${wikidataId} wdt:P193 ?contractor. }
                  OPTIONAL { wd:${wikidataId} wdt:P2130 ?cost. }
                  OPTIONAL { wd:${wikidataId} wdt:P1301 ?elevators. }
                  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
                }
                LIMIT 1
            `;

            try {
                const wikiRes = await fetch(`${WIKIDATA_SPARQL_URL}?query=${encodeURIComponent(sparqlQuery)}`, {
                    headers: {
                        "Accept": "application/sparql-results+json",
                        "User-Agent": "Akashic/1.0"
                    }
                });

                if (wikiRes.ok) {
                    const wikiData = await wikiRes.json();
                    if (wikiData.results?.bindings?.length > 0) {
                        const b = wikiData.results.bindings[0];
                        if (b.image?.value && !result.wikiImage) result.wikiImage = b.image.value;

                        result.structuralDetails = {
                            architect: b.architectLabel?.value || result.architect,
                            materials: b.materialsLabel?.value || null,
                            inception: b.inception?.value ? new Date(b.inception.value).getFullYear().toString() : null,
                            floors: b.floors?.value || result.levels,
                            height: b.height?.value || result.height,
                            website: b.website?.value || null,
                            style: b.styleLabel?.value || null,
                            engineer: b.engineerLabel?.value || null,
                            contractor: b.contractorLabel?.value || null,
                            cost: b.cost?.value ? `+${b.cost.value}` : null,
                            elevators: b.elevators?.value || null,
                        };


                    }
                }
            } catch (err) {
                console.warn(`[BuildingPanel] Wikidata unavailable; continuing without Wikidata enrichment (${quietFetchReason(err)}).`);
            }
        }


        if ((result.name !== "Unknown Building" || result.address) && (!result.description || !result.wikiImage || !result.structuralDetails)) {
            try {
                let baseQuery = '';
                if (result.name !== "Unknown Building") {
                    baseQuery = `${result.name} ${result.address ? result.address.split(',')[0] : ''}`.trim();
                } else {
                    baseQuery = result.address ? result.address.split(',').slice(0, 2).join(',').trim() : '';
                    if (baseQuery) result.name = baseQuery;
                }

                if (baseQuery) {
                    const searchQuery = `${baseQuery} site:archdaily.com building architecture plan section elevation`;
                    const ddgUrl = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(searchQuery);
                    const ddgRes = await fetch(ddgUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
                    if (ddgRes.ok) {
                        const html = await ddgRes.text();
                        const $ = cheerio.load(html);
                        const discoveries: any[] = [];

                        $('.result__body').each((i, el) => {
                            if (i < 8) {
                                let link = $(el).find('.result__url').attr('href') || '';
                                if (link.startsWith('//duckduckgo.com/l/?')) {
                                    const urlParams = new URLSearchParams(link.split('?')[1]);
                                    if (urlParams.has('uddg')) link = decodeURIComponent(urlParams.get('uddg')!);
                                }
                                discoveries.push({
                                    title: $(el).find('.result__title').text().trim(),
                                    snippet: $(el).find('.result__snippet').text().trim(),
                                    link
                                });
                            }
                        });

                        result.webDiscoveries = discoveries
                            .filter(d => d.title && d.link)
                            .sort((a, b) => Number(is_archdaily_url(b.link)) - Number(is_archdaily_url(a.link)));

                        if (!result.rankedDeepScanUrl) {
                            const archdaily_url = discover_archdaily_url(result.webDiscoveries);
                            if (archdaily_url) {
                                result.rankedDeepScanUrl = archdaily_url;
                                result.rankedDeepScanSource = "archdaily";
                            }
                        }


                        if (result.webDiscoveries.length > 0) {
                            try {
                                const topUrl = result.webDiscoveries.find((discovery: { link: string }) => is_archdaily_url(discovery.link))?.link;
                                if (!topUrl) throw new Error("no allowed architecture source found");
                                const siteRes = await fetch(topUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
                                if (siteRes.ok) {
                                    const siteHtml = await siteRes.text();
                                    const $site = cheerio.load(siteHtml);

                                    const extractedFacts: Record<string, string> = {};
                                    $site('th, dt, .label, strong').each((i, el) => {
                                        const label = $site(el).text().trim().replace(/[:#]/g, "");
                                        let valEl = $site(el).next();
                                        if (!valEl.length && el.tagName.toLowerCase() === 'th') valEl = $site(el).parent().find('td');
                                        if (!valEl.length && el.tagName.toLowerCase() === 'strong') valEl = $site(el).next('span');

                                        if (label && valEl.length) {
                                            const val = valEl.text().trim().replace(/\s+/g, ' ');
                                            if (val && label.length > 2 && label.length < 35 && val.length > 0 && val.length < 100) {
                                                if (!['search', 'menu', 'login'].includes(label.toLowerCase())) {
                                                    extractedFacts[label] = val;
                                                }
                                            }
                                        }
                                    });

                                    if (Object.keys(extractedFacts).length > 0) {
                                        result.structuralDetails = { ...(result.structuralDetails || {}), ...extractedFacts };
                                        result.source.push("Auto-Extracted OSINT");
                                    }

                                    if (!result.description) {
                                        const p = $site('p').first().text().trim();
                                        if (p.length > 40) result.description = p;
                                    }
                                }
                            } catch (e) { }
                        }


                        if (!result.wikiImage) {
                            try {
                                const res1 = await fetch('https://duckduckgo.com/?q=' + encodeURIComponent(baseQuery + " building"), { headers: { 'User-Agent': 'Mozilla/5.0' } });
                                if (res1.ok) {
                                    const text1 = await res1.text();
                                    const vqdMatch = text1.match(/vqd=([\'\"]?)([a-zA-Z0-9\-\_]+)\1/);
                                    if (vqdMatch) {
                                        const vqd = vqdMatch[2];
                                        const res2 = await fetch('https://duckduckgo.com/i.js?q=' + encodeURIComponent(baseQuery + " building") + '&o=json&p=1&s=0&u=bing&f=,,,,,&l=us-en&vqd=' + vqd, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                                        if (res2.ok) {
                                            const json = await res2.json();
                                            if (json.results && json.results.length > 0) {
                                                result.wikiImage = json.results[0].image;
                                                result.source.push("OSINT Image Search");
                                            }
                                        }
                                    }
                                }
                            } catch (e) { }
                        }

                        if (result.webDiscoveries.length > 0) result.source.push("Web OSINT");
                    }
                }
            } catch (err) {
                console.error("OSINT Web Discovery error:", err);
            }
        }

        if (!result.rankedDeepScanUrl) {
            const archdaily_url = archdaily_search_url(result.name, result.address);
            if (archdaily_url) {
                result.rankedDeepScanUrl = archdaily_url;
                result.rankedDeepScanSource = "archdaily search";
            }
        }

        result.source = result.source.join(" + ");
        if (!result.source) result.source = "Unknown";
        if (result.name === "Unknown Building" && result.source === "Unknown") {
            return NextResponse.json({ found: false, message: "No building structure found at these coordinates." });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Building API Fatal Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
