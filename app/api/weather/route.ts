export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
interface RainViewerResponse {
    host?: unknown;
    radar?: {
        past?: Array<{ time?: unknown; path?: unknown }>;
        nowcast?: Array<{ time?: unknown; path?: unknown }>;
    };
}
interface OpenMeteoResponse {
    latitude?: number;
    longitude?: number;
    timezone?: string;
    current?: Record<string, unknown>;
    current_units?: Record<string, unknown>;
    hourly?: Record<string, unknown>;
    hourly_units?: Record<string, unknown>;
    daily?: Record<string, unknown>;
    daily_units?: Record<string, unknown>;
    minutely_15?: Record<string, unknown>;
    minutely_15_units?: Record<string, unknown>;
}
const WEATHER_MAPS_URL = "https://api.rainviewer.com/public/weather-maps.json";
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
const OPEN_METEO_AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const OPEN_METEO_FLOOD_URL = "https://flood-api.open-meteo.com/v1/flood";
const OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const OPEN_METEO_REVERSE_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/reverse";
const str = (v: unknown) => typeof v === "string" && v.trim() ? v.trim() : null;
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const CACHE_TTL_MS = 10 * 60_000;
let weatherCache = new Map<string, { ts: number; payload: unknown }>();
const getJson = async (url: string) => {
    const res = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": "akashic/0.1", Accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
};
const OPEN_METEO_CURRENT = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "is_day",
    "precipitation",
    "rain",
    "showers",
    "snowfall",
    "weather_code",
    "cloud_cover",
    "pressure_msl",
    "surface_pressure",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "visibility",
    "cape",
    "freezing_level_height",
].join(",");
const OPEN_METEO_HOURLY = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "apparent_temperature",
    "precipitation_probability",
    "precipitation",
    "rain",
    "showers",
    "snowfall",
    "snow_depth",
    "weather_code",
    "pressure_msl",
    "surface_pressure",
    "cloud_cover",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "visibility",
    "evapotranspiration",
    "et0_fao_evapotranspiration",
    "vapour_pressure_deficit",
    "wind_speed_10m",
    "wind_speed_80m",
    "wind_speed_120m",
    "wind_speed_180m",
    "wind_direction_10m",
    "wind_direction_80m",
    "wind_direction_120m",
    "wind_direction_180m",
    "wind_gusts_10m",
    "soil_temperature_0cm",
    "soil_temperature_6cm",
    "soil_temperature_18cm",
    "soil_temperature_54cm",
    "soil_moisture_0_to_1cm",
    "soil_moisture_1_to_3cm",
    "soil_moisture_3_to_9cm",
    "soil_moisture_9_to_27cm",
    "soil_moisture_27_to_81cm",
].join(",");
const OPEN_METEO_DAILY = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
    "sunrise",
    "sunset",
    "daylight_duration",
    "sunshine_duration",
    "uv_index_max",
    "uv_index_clear_sky_max",
    "rain_sum",
    "showers_sum",
    "snowfall_sum",
    "precipitation_sum",
    "precipitation_hours",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "wind_direction_10m_dominant",
    "shortwave_radiation_sum",
    "et0_fao_evapotranspiration",
].join(",");
const OPEN_METEO_MIN15 = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "precipitation",
    "rain",
    "snowfall",
    "weather_code",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "visibility",
].join(",");
const OPEN_METEO_MARINE_HOURLY = [
    "wave_height",
    "wave_direction",
    "wave_period",
    "wind_wave_height",
    "wind_wave_direction",
    "wind_wave_period",
    "swell_wave_height",
    "swell_wave_direction",
    "swell_wave_period",
    "sea_surface_temperature",
    "ocean_current_velocity",
    "ocean_current_direction",
].join(",");
const OPEN_METEO_AIR_HOURLY = [
    "pm10",
    "pm2_5",
    "carbon_monoxide",
    "nitrogen_dioxide",
    "sulphur_dioxide",
    "ozone",
    "aerosol_optical_depth",
    "dust",
    "uv_index",
    "uv_index_clear_sky",
    "european_aqi",
    "us_aqi",
].join(",");
const OPEN_METEO_FLOOD_DAILY = [
    "river_discharge",
    "river_discharge_mean",
    "river_discharge_max",
    "river_discharge_min",
].join(",");
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const latRaw = Number(url.searchParams.get("lat") ?? "0");
        const lonRaw = Number(url.searchParams.get("lon") ?? "0");
        const lat = Number.isFinite(latRaw) ? clamp(latRaw, -90, 90) : 0;
        const lon = Number.isFinite(lonRaw) ? clamp(lonRaw, -180, 180) : 0;
        const key = `${lat.toFixed(2)}|${lon.toFixed(2)}`;
        const cached = weatherCache.get(key);
        const now = Date.now();
        if (cached && now - cached.ts < CACHE_TTL_MS) {
            return NextResponse.json(cached.payload);
        }
        const [rvRes, forecastJson, marineJson, airQualityJson, floodJson, elevationJson, reverseGeoJson] = await Promise.all([
            fetch(WEATHER_MAPS_URL, {
                cache: "no-store",
                headers: { "User-Agent": "akashic/0.1", Accept: "application/json" },
            }),
            getJson(`${OPEN_METEO_URL}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=${encodeURIComponent(OPEN_METEO_CURRENT)}&hourly=${encodeURIComponent(OPEN_METEO_HOURLY)}&daily=${encodeURIComponent(OPEN_METEO_DAILY)}&minutely_15=${encodeURIComponent(OPEN_METEO_MIN15)}&wind_speed_unit=kmh&precipitation_unit=mm&timezone=auto&forecast_days=7&forecast_hours=48`),
            getJson(`${OPEN_METEO_MARINE_URL}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=${encodeURIComponent(OPEN_METEO_MARINE_HOURLY)}&timezone=auto&forecast_days=7`),
            getJson(`${OPEN_METEO_AIR_QUALITY_URL}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=${encodeURIComponent(OPEN_METEO_AIR_HOURLY)}&timezone=auto&forecast_days=5`),
            getJson(`${OPEN_METEO_FLOOD_URL}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&daily=${encodeURIComponent(OPEN_METEO_FLOOD_DAILY)}&timezone=auto&forecast_days=7`),
            getJson(`${OPEN_METEO_ELEVATION_URL}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`),
            getJson(`${OPEN_METEO_REVERSE_GEOCODE_URL}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&language=en&count=1`),
        ]);
        if (!rvRes.ok) return NextResponse.json({ error: "weather upstream unavailable" }, { status: 502 });
        const raw = await rvRes.json() as RainViewerResponse;
        const host = str(raw.host) || "https://tilecache.rainviewer.com";
        const past = Array.isArray(raw.radar?.past) ? raw.radar?.past : [];
        const nowcast = Array.isArray(raw.radar?.nowcast) ? raw.radar?.nowcast : [];
        const frames = [...past, ...nowcast]
            .map((x) => ({ time: num(x.time), path: str(x.path) }))
            .filter((x) => x.time !== null && x.path);
        if (!frames.length) return NextResponse.json({ error: "weather frames unavailable" }, { status: 502 });
        const latest = frames.sort((a, b) => (b.time || 0) - (a.time || 0))[0];
        const tileTemplate = `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
        const forecast = forecastJson as OpenMeteoResponse | null;
        const openMeteo = {
            
            current: forecast?.current ?? null,
            current_units: forecast?.current_units ?? null,
            hourly: forecast?.hourly ?? null,
            hourly_units: forecast?.hourly_units ?? null,
            daily: forecast?.daily ?? null,
            daily_units: forecast?.daily_units ?? null,
            minutely_15: forecast?.minutely_15 ?? null,
            minutely_15_units: forecast?.minutely_15_units ?? null,
            
            forecast: forecast ?? null,
            marine: marineJson ?? null,
            airQuality: airQualityJson ?? null,
            flood: floodJson ?? null,
            elevation: elevationJson ?? null,
            reverseGeocode: reverseGeoJson ?? null,
            availableApis: [
                "forecast-api",
                "marine-weather-api",
                "air-quality-api",
                "flood-api",
                "elevation-api",
                "geocoding-reverse-api",
                "historical-weather-api",
                "historical-forecast-api",
                "previous-runs-api",
                "ensemble-api",
                "seasonal-forecast-api",
                "climate-api",
                "satellite-radiation-api",
            ],
        };
        const payload = {
            fetchedAt: new Date().toISOString(),
            source: "rainviewer+open-meteo",
            cached: false,
            location: { lat, lon },
            latestUnix: latest.time,
            tileTemplate,
            attribution: "RainViewer, Open-Meteo",
            openMeteo,
        };
        weatherCache.set(key, { ts: now, payload });
        return NextResponse.json(payload);
    } catch {
        return NextResponse.json({ error: "weather fetch failed" }, { status: 500 });
    }
}
