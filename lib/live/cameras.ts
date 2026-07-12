export interface TacticalCamera {
    id: string;
    name: string;
    status: "active" | "inactive";
    lat: number;
    lon: number;
    city: string;
    region: string;
    country: string;
    categories: string[];
    distanceKm: number | null;
    thumbnailUrl: string | null;
    embedUrl: string | null;
    pageUrl: string | null;
    lastUpdated: string | null;
}
