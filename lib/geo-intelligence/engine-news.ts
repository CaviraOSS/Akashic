import { XMLParser } from 'fast-xml-parser';
import { continent_news_feed, superpower_news_feed, geo_intel_event } from './types';

const parser = new XMLParser();

const fetchRSS = async (query: string): Promise<geo_intel_event[]> => {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) }); 
    const text = await res.text();
    const json = parser.parse(text);
    
    const items = json.rss?.channel?.item || [];
    const mapped = (Array.isArray(items) ? items : [items]).slice(0, 10).map((item: any, i: number) => {
      return {
        id: `news-${query}-${Date.now()}-${i}`,
        title: item.title || "News Alert",
        summary: item.description || "Live intelligence intercept.",
        category: "politics" as const,
        severity: ((item.title?.toLowerCase().includes('war') || item.title?.toLowerCase().includes('crisis')) ? "high" : "elevated") as "high" | "elevated",
        confidence: 0.95,
        location_name: query,
        entities: ["news", "osint"],
        source_name: item.source || "News Outlet",
        source_url: item.link || "",
        published_at: new Date(item.pubDate || Date.now()).toISOString(),
        detected_at: new Date().toISOString()
      }
    });
    return mapped;
  } catch (err) {
    console.error(`RSS fetch failed for ${query}`, err);
    return [];
  }
}

export const fetchLiveContinents = async (): Promise<continent_news_feed[]> => {
  const CONTINENTS = ["North America", "South America", "Europe", "Asia", "Africa", "Oceania", "Middle East"];
  const promises = CONTINENTS.map(async (c) => ({
    continent: c,
    events: await fetchRSS(c)
  }));
  return Promise.all(promises);
}

export const fetchLiveSuperpowers = async (): Promise<superpower_news_feed[]> => {
  const SUPERPOWERS = ["USA geopolitics", "China geopolitics", "Russia geopolitics", "European Union geopolitics"];
  const labels = ["USA", "CHINA", "RUSSIA", "EU"];
  
  const promises = SUPERPOWERS.map(async (s, i) => ({
    entity: labels[i],
    events: await fetchRSS(s)
  }));
  return Promise.all(promises);
}

export const fetchWorldNews = async (): Promise<geo_intel_event[]> => {
  return fetchRSS("Global geopolitics military");
}

export const fetchLiveCountry = async (country: string): Promise<geo_intel_event[]> => {
  return fetchRSS(`${country} latest news politics security economy`);
}
