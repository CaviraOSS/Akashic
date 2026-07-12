export interface ViolenceIncident {
    id: string;
    date: string;
    type: "shooting" | "bombing" | "armed_attack" | "civil_unrest" | "other";
    fatalities: number;
    injuries: number;
    location: string;
    description: string;
    source: string;
    severity: "critical" | "high" | "moderate" | "low";
}

export interface CityViolenceResponse {
    city: string;
    country: string;
    riskLevel: "critical" | "high" | "moderate" | "low";
    totalIncidents: number;
    totalFatalities: number;
    totalInjuries: number;
    incidents: ViolenceIncident[];
    sources: string[];
    lastUpdated: string;
}

export async function getCityViolence(cityName: string, countryName: string = "—"): Promise<CityViolenceResponse> {
    const key = cityName.toLowerCase().trim();
    let incidents: ViolenceIncident[] = [];
    
    try {
        const query = encodeURIComponent(`${cityName} (shooting OR violence OR attack OR kill OR murder OR police)`);
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
        
        const Parser = (await import('rss-parser')).default;
        const parser = new Parser();
        const feed = await parser.parseURL(rssUrl);
        
        const newsItems = feed.items.slice(0, 10);
        
        newsItems.forEach((item, i) => {
            const tLow = (item.title || "").toLowerCase();
            const sLow = (item.contentSnippet || "").toLowerCase();
            const combined = tLow + " " + sLow;
            
            let type: ViolenceIncident["type"] = "other";
            if (combined.includes("bomb") || combined.includes("blast")) type = "bombing";
            else if (combined.includes("shoot") || combined.includes("gun")) type = "shooting";
            else if (combined.includes("attack") || combined.includes("clash")) type = "armed_attack";
            else if (combined.includes("protest") || combined.includes("unrest") || combined.includes("riot")) type = "civil_unrest";

            let sev: "critical" | "high" | "moderate" | "low" = "moderate";
            if (combined.includes("kill") || combined.includes("dead") || combined.includes("fatal") || combined.includes("murder")) sev = "critical";
            else if (combined.includes("injur") || combined.includes("wound") || combined.includes("shoot") || combined.includes("shot")) sev = "high";

            let fatalities = 0;
            let injuries = 0;
            
            const killMatch = combined.match(/(\d+)\s*(killed|dead|fatalities|people dead|shot dead)/i);
            if (killMatch) fatalities = parseInt(killMatch[1], 10);
            
            const injMatch = combined.match(/(\d+)\s*(injured|wounded|hurt|shot)/i);
            if (injMatch) injuries = parseInt(injMatch[1], 10);

            if (fatalities > 100) fatalities = 0;
            if (injuries > 200) injuries = 0;

            incidents.push({
                id: `NEWS-${i}`,
                date: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                type,
                fatalities,
                injuries,
                location: cityName,
                description: item.title || "Unknown Incident",
                source: "Google News Feed",
                severity: sev
            });
        });
    } catch (err) {
        console.warn("[CityViolence] Live fetch failed", err);
    }

    let totalFatalities = 0;
    let totalInjuries = 0;
    incidents.forEach(inc => { totalFatalities += inc.fatalities; totalInjuries += inc.injuries; });

    const riskLevel: "critical" | "high" | "moderate" | "low" =
        totalFatalities > 20 ? "critical" :
        totalFatalities > 5 ? "high" :
        totalFatalities > 0 || totalInjuries > 5 ? "moderate" : "low";

    return {
        city: cityName.charAt(0).toUpperCase() + cityName.slice(1),
        country: countryName,
        riskLevel,
        totalIncidents: incidents.length,
        totalFatalities,
        totalInjuries,
        incidents,
        sources: Array.from(new Set(incidents.map(inc => inc.source))),
        lastUpdated: new Date().toISOString()
    };
}
