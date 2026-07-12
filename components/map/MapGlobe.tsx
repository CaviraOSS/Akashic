"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Deck, MapView, _GlobeView } from "@deck.gl/core";
import { IconLayer, ScatterplotLayer, TextLayer, PathLayer, GeoJsonLayer } from "@deck.gl/layers";
import * as satellite from "satellite.js";
import { StreetViewMap } from "./StreetViewMap";
import type { TacticalCamera } from "@/lib/live/cameras";
import { type world_monitor_layer_state, type world_monitor_layer_id } from "@/components/layout/WorldMonitorDeck";
import { weather_canvas_segments, weather_color, weather_field_blur_px, weather_particle_x, weather_particle_y, weather_value, weather_value_label, weather_visuals, type weather_grid, type weather_mode, type weather_vector } from "@/lib/weather/map-core";
import type { sigint_cell, sigint_evidence_class, sigint_finding, sigint_severity } from "@/lib/sigint/core";
import type { aviation_report, network_context, news_report, place_context, swpc_context } from "@/lib/sigint/sources";
import type { source_health } from "@/lib/live/adsb-live";
import type { recon_map_point } from "@/lib/recon/core";



export type GlobeUiCommand = { id: number; type: "zoomIn" | "zoomOut" | "resetView" | "focusSelection" | "screenshot" } | { id: number; type: "flyTo"; lat: number; lon: number; altitude: number };
export type ImageryLayerId = "aerial" | "aerial_labels" | "dark" | "terrain_topo" | "natgeo" | "nightlights" | "hybrid" | "blue_marble" | "streetside" | "light_gray" | "3d_imagery";
export type radar_filter = "all" | "mil" | "ladd" | "pia";
export interface TacticalViewMetrics { cameraKm: number; scaleKm: number; }
export type GilTier = 1 | 2 | 3 | 4 | 5;
export interface GilCity { name: string; country: string; iso: string; lat: number; lon: number; pop: number; capital: boolean; tier?: GilTier; }
export interface TacticalFlight { icao24: string; callsign: string; registration: string | null; modelType: string | null; description: string | null; squawk: string | null; category: string; longitude: number; latitude: number; baroAltitude: number | null; velocity: number | null; trueTrack: number | null; verticalRate: number | null; onGround: boolean; lastContact: number | null; }
export interface TacticalQuake { id: string; mag: number | null; place: string | null; time: number | null; updated: number | null; longitude: number; latitude: number; depth_km: number | null; mag_type: string | null; felt_reports: number | null; tsunami: boolean; significance: number | null; cdi: number | null; mmi: number | null; alert: string | null; status: string | null; event_type: string | null; title: string | null; detail_url: string | null; event_url: string | null; dmin: number | null; gap: number | null; danger_level: string; expected_damage: string; }
export interface TacticalRadio { id: string; name: string; country: string | null; countryCode: string | null; state: string | null; language: string | null; tags: string | null; codec: string | null; bitrate: number | null; streamUrl: string; homepage: string | null; favicon: string | null; votes: number | null; clickCount: number | null; online: boolean; lat: number; lon: number; frequencyMHz: number | null; source: "radio.garden" | "radio-browser"; channel_id: string | null; place_id: string | null; station_url: string | null; stream_host: string | null; secure: boolean | null; preroll: boolean | null; utc_offset: number | null; place_size: number | null; nowPlaying?: string | null; }
export interface TacticalPositionFix { mgrs: string; lat: number; lon: number; altMeters: number; accuracyMeters: number; fixType: string; sats: string; }
export type SatCategory = "space-station" | "weather" | "navigation" | "comms" | "earth-obs" | "science" | "military" | "debris" | "unknown";
export interface TacticalSatellite { id: string; name: string; line1: string; line2: string; category: SatCategory; operator: string | null; purpose: string | null; }
export interface TacticalCityIntel { id: string; type: string; lat: number; lng: number; title: string; status: string; severity?: string; city?: string; story?: string; }
export interface TacticalGdacsEvent { id: string; title: string; event_type: string; alert: string; severity: string; lat: number; lon: number; country: string | null; date: string | null; url: string | null; source: string; }
export interface TacticalAirQualityPoint { id: string; city: string; country: string; lat: number; lon: number; aqi: number | null; european_aqi: number | null; pm25: number | null; pm10: number | null; no2: number | null; ozone: number | null; time: string | null; severity: string; source: string; }
export type tactical_sigint_finding = sigint_finding;
export type tactical_sigint_cell = sigint_cell;
export type tactical_sigint_selection = { type: "finding"; data: tactical_sigint_finding } | { type: "cell"; data: tactical_sigint_cell };
export type sigint_filters = {
    tab: "overview" | "navigation" | "transponder" | "space" | "network" | "evidence" | "sources";
    severity: sigint_severity;
    confidence: number;
    evidence: "all" | sigint_evidence_class;
    cells: boolean;
    points: boolean;
    labels: boolean;
};
export type sigint_response = {
    generated_at: string;
    observed_from: string;
    observed_to: string;
    cold_start: boolean;
    degraded?: boolean;
    findings: tactical_sigint_finding[];
    cells: tactical_sigint_cell[];
    stats: {
        total: number;
        critical: number;
        high: number;
        navigation: number;
        transponder: number;
        active_cells: number;
        affected_aircraft: number;
        healthy_sources?: number;
        degraded_sources?: number;
    };
    context?: {
        space_weather?: swpc_context;
        constellations?: { systems?: Array<{ id: string; count: number }> };
        aviation?: aviation_report[];
        news?: news_report[];
        network?: network_context | null;
        place?: place_context | null;
    };
    sources?: source_health[];
};

interface Props { activeStyle: string; activeImagery?: string; isGlobe?: boolean; streetViewMode?: boolean; enabledLayers: Record<string, boolean>; radarFilter?: radar_filter; reconLocations?: recon_map_point[]; weatherMode?: weather_mode; sigintFilters?: sigint_filters; uiCommand?: GlobeUiCommand | null; onFlightSelect?: (flight: TacticalFlight | null) => void; onAirportSelect?: (airport: any | null) => void; onSatelliteSelect?: (satellite: TacticalSatellite | null) => void; onQuakeSelect?: (quake: TacticalQuake | null) => void; onRadioSelect?: (radio: TacticalRadio | null) => void; onCameraSelect?: (camera: TacticalCamera | null) => void; onIntelSelect?: (intel: TacticalCityIntel | null) => void; onSigintSelect?: (sigint: tactical_sigint_selection | null) => void; onSigintData?: (data: sigint_response | null) => void; onCitySelect?: (city: GilCity | null) => void; onCountrySelect?: (iso: string | null) => void; onRadarCount?: (count: number) => void; onUsgsCount?: (count: number) => void; onRadioCount?: (count: number) => void; onSigintCount?: (count: number) => void; onGdacsCount?: (count: number) => void; onAirqCount?: (count: number) => void; onGilCount?: (count: number) => void; onPositionFix?: (fix: TacticalPositionFix) => void; onViewMetrics?: (metrics: TacticalViewMetrics) => void; onStreetViewPick?: (url: string) => void; worldMonitorLayers?: world_monitor_layer_state; onWmCounts?: (counts: Partial<Record<world_monitor_layer_id, number>>) => void; onBuildingSelect?: (coord: { lat: number, lon: number, name?: string } | null) => void; }


interface Airport { iata: string; icao?: string; name: string; lat: number | string; lon: number | string; size: "large" | "medium" | "small" | null; type: string; }
interface TacticalResponse { flights?: TacticalFlight[]; }
interface PanoramaPoint { id: number; lat: number; lon: number; handle: string; title: string; thumbUrl: string; embedUrl: string; pageUrl: string; }
interface PanoramaResponse { items?: PanoramaPoint[]; }
interface TleSatellite { id: string; name: string; line1: string; line2: string; }
interface CelestrakResponse { satellites?: TleSatellite[]; }
interface UsgsResponse { events?: TacticalQuake[]; }
interface RadioStation { id: string; name: string; country: string | null; countryCode: string | null; state: string | null; language: string | null; tags: string | null; codec: string | null; bitrate: number | null; streamUrl: string; homepage: string | null; favicon: string | null; votes: number | null; clickCount: number | null; online: boolean; lat: number; lon: number; frequencyMHz: number | null; source: "radio.garden" | "radio-browser"; channel_id: string | null; place_id: string | null; station_url: string | null; stream_host: string | null; secure: boolean | null; preroll: boolean | null; utc_offset: number | null; place_size: number | null; }
interface RadioResponse { stations?: RadioStation[]; }
interface CameraResponse { cameras?: TacticalCamera[]; configured?: boolean; error?: string; }
interface GdacsResponse { events?: TacticalGdacsEvent[]; }
interface AirQualityResponse { points?: TacticalAirQualityPoint[]; }
interface SatelliteTrackRecord { id: string; name: string; line1: string; line2: string; satrec: satellite.SatRec; category: SatCategory; operator: string | null; purpose: string | null; lat: number; lon: number; }
interface GilCityRecord extends GilCity { id: string; tier: GilTier; score: number; }

const wm_point_layers = [
    "conflicts", "wars", "civil_unrest", "violence", "humanitarian",
    "nuclear", "bases", "sanctions",
    "radiation_watch", "spaceports", "chokepoints", "climate_anomalies",
    "internet_disruptions", "cyber_threats", "gps_jamming", "iran_attacks",
    "intel_hotspots", "critical_minerals", "economic_centers",
    "orbital_surveillance", "storage_facilities",
    "ucdp_events", "displacement", "disease_outbreaks", "data_centers",
    "fuel_shortages", "live_tankers", "stock_exchanges", "financial_centers",
    "central_banks", "commodity_hubs", "gulf_investments", "startup_hubs",
    "cloud_regions", "accelerators", "tech_hqs", "tech_events",
    "positive_events", "kindness", "happiness", "species_recovery",
    "renewable_installations", "mining_sites", "processing_plants",
    "commodity_ports", "irradiators", "resilience_score", "day_night",
] as const;

const wm_color = (id: string, a = 220): [number, number, number, number] => {
    if (id === "conflicts" || id === "wars" || id === "iran_attacks") return [239, 68, 68, a];
    if (id === "civil_unrest") return [245, 158, 11, a];
    if (id === "violence" || id === "wildfires" || id === "natural_events" || id === "climate_anomalies") return [249, 115, 22, a];
    if (id === "humanitarian" || id === "internet_disruptions") return [6, 182, 212, a];
    if (id === "nuclear" || id === "radiation_watch") return [217, 70, 239, a];
    if (id === "irradiators") return [250, 204, 21, a];
    if (id === "bases") return [16, 185, 129, a];
    if (id === "sanctions") return [220, 38, 38, a];
    if (id === "spaceports" || id === "orbital_surveillance") return [168, 85, 247, a];
    if (id === "chokepoints" || id === "gps_jamming") return [59, 130, 246, a];
    if (id === "trade_routes" || id === "live_tankers" || id === "commodity_ports") return [56, 189, 248, a];
    if (id === "critical_minerals" || id === "cyber_threats" || id === "mining_sites" || id === "processing_plants") return [99, 102, 241, a];
    if (id === "economic_centers" || id === "central_banks" || id === "happiness") return [234, 179, 8, a];
    if (id === "stock_exchanges" || id === "financial_centers" || id === "positive_events" || id === "kindness" || id === "species_recovery" || id === "renewable_installations" || id === "resilience_score") return [34, 197, 94, a];
    if (id === "data_centers" || id === "startup_hubs" || id === "cloud_regions" || id === "accelerators" || id === "tech_hqs" || id === "tech_events") return [34, 211, 238, a];
    if (id === "disease_outbreaks") return [132, 204, 22, a];
    if (id === "storage_facilities") return [120, 113, 108, a];
    return [34, 211, 238, a];
};

const wm_radius = (id: string, sev?: string) => {
    const s = sev === "critical" ? 1.9 : sev === "high" ? 1.45 : sev === "elevated" ? 1.2 : 1;
    const base = id === "conflicts" || id === "wars" || id === "iran_attacks" ? 24000
        : id === "chokepoints" || id === "gps_jamming" ? 18000
            : id === "stock_exchanges" || id === "financial_centers" || id === "central_banks" || id === "data_centers" ? 12000
                : id === "bases" || id === "economic_centers" || id === "critical_minerals" ? 8500
                    : id === "nuclear" || id === "radiation_watch" ? 12000
                        : 10000;
    return base * s;
};


const RADAR_REFRESH_MS = 60_000;
const USGS_REFRESH_MS = 5 * 60_000;
const FLIGHT_STALE_AFTER_MS = 4 * 60_000;
const SATELLITE_CATALOG_REFRESH_MS = 30 * 60_000;
const SATELLITE_POSITION_REFRESH_MS = 20_000;
const WEATHER_REFRESH_MS = 10 * 60_000;
const RADIO_REFRESH_MS = 15 * 60_000;
const SIGINT_REFRESH_MS = 30_000;
const GDACS_REFRESH_MS = 15 * 60_000;
const AIRQ_REFRESH_MS = 30 * 60_000;
const PATH_MAX_POINTS = 80;
const PATH_RECORD_INTERVAL_MS = 5_000;
const sigint_severity_rank: Record<sigint_severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const sigint_color = (severity: sigint_severity, alpha: number): [number, number, number, number] =>
    severity === "critical" ? [248, 113, 113, alpha] :
        severity === "high" ? [251, 146, 60, alpha] :
            severity === "medium" ? [250, 204, 21, alpha] :
                [45, 212, 191, alpha];

const event_color = (severity: string, alpha: number): [number, number, number, number] =>
    severity === "critical" ? [239, 68, 68, alpha] :
        severity === "high" ? [249, 115, 22, alpha] :
            severity === "elevated" ? [250, 204, 21, alpha] :
                [45, 212, 191, alpha];

const airq_color = (aqi: number | null, alpha: number): [number, number, number, number] =>
    aqi === null ? [148, 163, 184, alpha] :
        aqi >= 201 ? [239, 68, 68, alpha] :
            aqi >= 151 ? [249, 115, 22, alpha] :
                aqi >= 101 ? [250, 204, 21, alpha] :
                    [34, 197, 94, alpha];


function mkSvg(c: string, s = 96): string {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='" + s + "' height='" + s + "' viewBox='0 0 " + s + " " + s + "'>" + c + "</svg>");
}

function planeIcon(fill: string, stroke: string, path: string, glow = true): string {
    const filter = glow ? "<defs><filter id='gl'><feGaussianBlur stdDeviation='3' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter></defs>" : "";
    const filterAttr = glow ? " filter='url(#gl)'" : "";
    return mkSvg(`${filter}<g transform='translate(48,48)'${filterAttr}><path d='${path}' fill='${fill}' stroke='${stroke}' stroke-width='1.5' stroke-linejoin='round'/></g>`);
}

const P_WIDE = "M0,-30 L6,-16 L6,-2 L34,8 L34,14 L6,8 L6,18 L0,18 L-6,18 L-6,8 L-34,14 L-34,8 L-6,-2 L-6,-16 Z";
const P_AIRLINER = "M0,-32 L3,-20 L3,-8 L22,3 L22,7 L3,3 L3,18 L10,23 L10,26 L0,22 L-10,26 L-10,23 L-3,18 L-3,3 L-22,7 L-22,3 L-3,-8 L-3,-20 Z";
const P_REGIONAL = "M0,-24 L2,-16 L2,-5 L16,3 L16,6 L2,3 L2,14 L7,19 L7,21 L0,18 L-7,21 L-7,19 L-2,14 L-2,3 L-16,6 L-16,3 L-2,-5 L-2,-16 Z";
const P_BIZJET = "M0,-30 L1.5,-20 L1.5,-10 L14,0 L14,3 L4,1 L4,16 L9,21 L9,23 L0,20 L-9,23 L-9,21 L-4,16 L-4,1 L-14,3 L-14,0 L-1.5,-10 L-1.5,-20 Z";
const P_GA = "M0,-14 L1,-8 L1,4 L16,2 L16,5 L1,6 L1,12 L4,16 L0,14 L-4,16 L-1,12 L-1,6 L-16,5 L-16,2 L-1,4 L-1,-8 Z";
const P_HELI = "M-20,-3 L20,-3 L20,2 L4,2 L4,20 L7,24 L0,22 L-7,24 L-4,20 L-4,2 L-20,2 Z M-22,-8 L-14,-8 L-14,-3 L-22,-3 Z M14,-8 L22,-8 L22,-3 L14,-3 Z";
const P_FIGHTER = "M0,-30 L5,-8 L20,4 L16,8 L6,4 L2,16 L8,22 L2,22 L0,16 L-2,22 L-8,22 L-2,16 L-6,4 L-16,8 L-20,4 L-5,-8 Z";
const P_TRANSPORT = "M0,-22 L4,-12 L4,-2 L22,8 L28,8 L28,13 L22,10 L4,10 L4,20 L11,25 L11,28 L0,25 L-11,28 L-11,25 L-4,20 L-4,10 L-22,10 L-28,13 L-28,8 L-22,8 L-4,-2 L-4,-12 Z";
const P_TANKER = "M0,-24 L4,-14 L4,-3 L24,5 L30,5 L30,10 L24,7 L4,7 L4,18 L12,23 L12,26 L0,23 L-12,26 L-12,23 L-4,18 L-4,7 L-24,7 L-30,10 L-30,5 L-24,5 L-4,-3 L-4,-14 Z M0,26 L0,32 L2,32 L2,26 Z";
const P_DRONE = "M0,-6 L6,-12 L14,-14 L14,-10 L8,-6 L8,6 L14,10 L14,14 L6,12 L0,6 L-6,12 L-14,14 L-14,10 L-8,6 L-8,-6 L-14,-10 L-14,-14 L-6,-12 Z";
const P_SEAPLANE = "M0,-20 L2,-12 L2,-3 L18,5 L18,8 L2,5 L2,14 L8,18 L8,20 L0,18 L-8,20 L-8,18 L-2,14 L-2,5 L-18,8 L-18,5 L-2,-3 L-2,-12 Z M-12,20 Q0,28 12,20 Q8,24 -8,24 Z";
const P_TILT = "M0,-16 L4,-4 L22,-10 L24,-6 L10,2 L6,16 L-6,16 L-10,2 L-24,-6 L-22,-10 L-4,-4 Z M18,-14 L22,-14 L22,-6 L18,-6 Z M-22,-14 L-18,-14 L-18,-6 L-22,-6 Z";

type IconPreset = { fill: string; stroke: string; path: string; };
const ICON_WIDE_BODY: IconPreset = { fill: "#000000", stroke: "#444444", path: P_WIDE };
const ICON_AIRLINER: IconPreset = { fill: "#000000", stroke: "#3a3a3a", path: P_AIRLINER };
const ICON_REGIONAL: IconPreset = { fill: "#111111", stroke: "#555555", path: P_REGIONAL };
const ICON_BIZJET: IconPreset = { fill: "#78350f", stroke: "#fde68a", path: P_BIZJET };
const ICON_GA: IconPreset = { fill: "#14532d", stroke: "#4ade80", path: P_GA };
const ICON_HELI: IconPreset = { fill: "#831843", stroke: "#f9a8d4", path: P_HELI };
const ICON_MIL_FIGHTER: IconPreset = { fill: "#ef4444", stroke: "#fca5a5", path: P_FIGHTER };
const ICON_MIL_TRANSPORT: IconPreset = { fill: "#ea580c", stroke: "#fed7aa", path: P_TRANSPORT };
const ICON_MIL_TANKER: IconPreset = { fill: "#b45309", stroke: "#fde68a", path: P_TANKER };
const ICON_LADD: IconPreset = { fill: "#4c1d95", stroke: "#c4b5fd", path: P_BIZJET };
const ICON_PIA: IconPreset = { fill: "#581c87", stroke: "#e879f9", path: P_REGIONAL };
const ICON_DRONE: IconPreset = { fill: "#0e7490", stroke: "#67e8f9", path: P_DRONE };
const ICON_SEAPLANE: IconPreset = { fill: "#075985", stroke: "#7dd3fc", path: P_SEAPLANE };
const ICON_TILTROTOR: IconPreset = { fill: "#78350f", stroke: "#fbbf24", path: P_TILT };
const ICON_GROUND: IconPreset = { fill: "#1c1c1c", stroke: "#555555", path: P_AIRLINER };

function iconForType(t: string | null, category: string, onGround: boolean): IconPreset {
    if (onGround) return ICON_GROUND;
    if (category === "MILITARY") {
        if (!t) return ICON_MIL_TRANSPORT;
        const tu = t.toUpperCase();
        if (/^(F1[56789]|F2[02]|F3[56]|EF[79][0-9]|MIG|SU[0-9]|JA3[79]|B2|F22|F35|FA18|F16)/.test(tu)) return ICON_MIL_FIGHTER;
        if (/^(KC|E[38]|P[38]|EP|RC|AWAC)/.test(tu)) return ICON_MIL_TANKER;
        return ICON_MIL_TRANSPORT;
    }
    if (category === "LADD") return ICON_LADD;
    if (category === "PIA") return ICON_PIA;
    if (!t) return ICON_AIRLINER;
    const tu = t.toUpperCase();
    if (/^(B74[47]|B77[237W]|B78[89]|A3[34][023]|A34[05]|A35[09]|A38[08])/.test(tu)) return ICON_WIDE_BODY;
    if (/^(B7[23][678]|B737|B738|B739|A31[89]|A32[01NEP]|A220|A32[12]|E19[05])/.test(tu)) return ICON_AIRLINER;
    if (/^(CONC|TU1[34][46])/.test(tu)) return ICON_AIRLINER;
    if (/^(E1[37][05]|CRJ|E7[05]|DH8|AT[57][23]|SF34|F50|F7[02])/.test(tu)) return ICON_REGIONAL;
    if (/^(GLF|C56|C68|FA[57][0-9]|HA4T|CL[36]|GLEX|G[56][0-9][0-9]|BE40|C25|PC24|BE[19])/.test(tu)) return ICON_BIZJET;
    if (/^(EC[0-9]|H[16][025]|S[076][0-9]|B06|B07|R22|R44|AW[139]|UH1|CH[45])/.test(tu)) return ICON_HELI;
    if (/^(GLOBA|RQ[0-9]|MQ[0-9]|PRED|REAP|UAV)/.test(tu)) return ICON_DRONE;
    if (/^(DHC[23]|C2[358]|BN2)/.test(tu)) return ICON_SEAPLANE;
    if (/^(V22|MV22|BA609|V280)/.test(tu)) return ICON_TILTROTOR;
    if (/^(C1[72][2568]|C1[89][0-9]|PA2[48]|PA3[46]|DA4[02]|SR2[02]|TB2|P28)/.test(tu)) return ICON_GA;
    return ICON_AIRLINER;
}

const iconCache = new Map<string, string>();
function resolveIcon(t: string | null, category: string, onGround: boolean): string {
    const key = `${t}|${category}|${onGround}`;
    if (iconCache.has(key)) return iconCache.get(key)!;
    const preset = iconForType(t, category, onGround);
    const ico = planeIcon(preset.fill, preset.stroke, preset.path);
    iconCache.set(key, ico);
    return ico;
}

const RADIO_ICON = mkSvg("<g transform='translate(48,48)'><line x1='0' y1='-26' x2='0' y2='14' stroke='#60a5fa' stroke-width='3' stroke-linecap='round'/><circle cx='0' cy='18' r='4' fill='#93c5fd'/><path d='M-3,-22 Q0,-29 3,-22' fill='none' stroke='#93c5fd' stroke-width='1.8' stroke-linecap='round'/><path d='M-10,-16 Q0,-30 10,-16' fill='none' stroke='#60a5fa' stroke-width='2' stroke-linecap='round'/><path d='M-17,-10 Q0,-31 17,-10' fill='none' stroke='#38bdf8' stroke-width='2.2' stroke-linecap='round'/></g>");
const SATELLITE_ICON = mkSvg("<g transform='translate(48,48)'><polyline points='-14,-6 -14,-14 -6,-14' fill='none' stroke='#38bdf8' stroke-width='2'/><polyline points='6,-14 14,-14 14,-6' fill='none' stroke='#38bdf8' stroke-width='2'/><polyline points='14,6 14,14 6,14' fill='none' stroke='#38bdf8' stroke-width='2'/><polyline points='-6,14 -14,14 -14,6' fill='none' stroke='#38bdf8' stroke-width='2'/><circle cx='0' cy='0' r='3' fill='#e0f2fe'/></g>");
const MILITARY_SATELLITE_ICON = mkSvg("<g transform='translate(48,48)'><polyline points='-14,-6 -14,-14 -6,-14' fill='none' stroke='#ef4444' stroke-width='2'/><polyline points='6,-14 14,-14 14,-6' fill='none' stroke='#ef4444' stroke-width='2'/><polyline points='14,6 14,14 6,14' fill='none' stroke='#ef4444' stroke-width='2'/><polyline points='-6,14 -14,14 -14,6' fill='none' stroke='#ef4444' stroke-width='2'/><circle cx='0' cy='0' r='3' fill='#fee2e2'/></g>");
const QUAKE_ICON = mkSvg("<g transform='translate(48,48)'><circle cx='0' cy='0' r='16' fill='#ef4444' opacity='0.14'/><circle cx='0' cy='0' r='9' fill='#f97316' opacity='0.3'/><circle cx='0' cy='0' r='4' fill='#fde68a' stroke='#7c2d12' stroke-width='1.4'/></g>");
const SPACE_STATION_ICON = mkSvg("<g transform='translate(48,48)'><rect x='-30' y='-6' width='20' height='12' rx='2' fill='#fde68a' stroke='#92400e' stroke-width='1.5'/><rect x='10' y='-6' width='20' height='12' rx='2' fill='#fde68a' stroke='#92400e' stroke-width='1.5'/><rect x='-11' y='-11' width='22' height='22' rx='3' fill='#fef9c3' stroke='#92400e' stroke-width='2'/><rect x='-6' y='-6' width='12' height='12' rx='2' fill='#fcd34d' stroke='#92400e' stroke-width='1'/><line x1='-11' y1='0' x2='-30' y2='0' stroke='#92400e' stroke-width='1.5'/><line x1='11' y1='0' x2='30' y2='0' stroke='#92400e' stroke-width='1.5'/></g>");
const CAMERA_ICON = mkSvg("<g transform='translate(48,48)'><rect x='-12' y='-8' width='24' height='16' rx='3' fill='#334155' stroke='#94a3b8' stroke-width='1.5'/><circle cx='0' cy='0' r='5' fill='#38bdf8' opacity='0.7'/><circle cx='0' cy='0' r='2' fill='#e0f2fe'/><polygon points='12,-4 18,-8 18,8 12,4' fill='#475569' stroke='#94a3b8' stroke-width='1'/></g>");
const SHOOTING_ICON = mkSvg("<g transform='translate(48,48)'><circle cx='0' cy='0' r='24' fill='#ef4444' opacity='0.15'/><circle cx='0' cy='0' r='18' fill='none' stroke='#ef4444' stroke-width='1.5' stroke-dasharray='4,2'/><circle cx='0' cy='0' r='6' fill='#ef4444'/><circle cx='0' cy='0' r='2' fill='#fee2e2'/><path d='M-24,0 L-10,0 M24,0 L10,0 M0,-24 L0,-10 M0,24 L0,10' stroke='#f87171' stroke-width='2'/></g>");
const INTEL_ICON = mkSvg("<g transform='translate(48,48)'><polygon points='0,-22 19,-11 19,11 0,22 -19,11 -19,-11' fill='#10b981' opacity='0.15'/><polygon points='0,-22 19,-11 19,11 0,22 -19,11 -19,-11' fill='none' stroke='#34d399' stroke-width='1.5'/><polygon points='0,-10 8,-5 8,5 0,10 -8,5 -8,-5' fill='#10b981'/><circle cx='0' cy='0' r='2' fill='#d1fae5'/></g>");
const PANO_ICON = mkSvg("<defs><filter id='pglow'><feGaussianBlur stdDeviation='2.5' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter></defs><g transform='translate(48,48)' filter='url(#pglow)'><circle cx='0' cy='0' r='16' fill='#7c3aed' opacity='0.22'/><circle cx='0' cy='0' r='13' fill='#1e1b4b' stroke='#a78bfa' stroke-width='2'/><ellipse cx='0' cy='0' rx='12' ry='5' fill='none' stroke='#c4b5fd' stroke-width='1.5'/><ellipse cx='0' cy='0' rx='5' ry='12' fill='none' stroke='#c4b5fd' stroke-width='1.5'/><circle cx='0' cy='0' r='2.4' fill='#ede9fe'/></g>");

function mkTower(large: boolean): string {
    const sc = large ? 1.0 : 0.75;
    const svg = `<defs><filter id='gla'><feGaussianBlur stdDeviation='3' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter></defs>
    <g transform='translate(48,48) scale(${sc})' filter='url(#gla)'>
        <line x1='0' y1='-42' x2='0' y2='42' stroke='#94a3b8' stroke-width='3' stroke-linecap='round'/>
        <rect x='-12' y='-18' width='24' height='16' rx='2' fill='#1e3a5f' stroke='#38bdf8' stroke-width='1.5'/>
        <rect x='-10' y='-16' width='20' height='5' rx='1' fill='#38bdf8' opacity='0.7'/>
        <rect x='-5' y='6' width='10' height='36' rx='2' fill='#64748b' stroke='#475569' stroke-width='1'/>
        <rect x='-14' y='2' width='28' height='5' rx='2' fill='#475569'/>
        <circle cx='0' cy='-42' r='4' fill='#ef4444' opacity='0.9'/>
        <circle cx='0' cy='-42' r='6' fill='#ef4444' opacity='0.3'/>
    </g>`;
    return mkSvg(svg);
}

const AIRPORT_ICON_LARGE = mkTower(true);
const AIRPORT_ICON_SMALL = mkTower(false);


function classifySatellite(name: string): { category: SatCategory; operator: string | null; purpose: string | null } {
    const u = name.toUpperCase();
    if (u.includes("ISS") || u.includes("ZARYA") || u.includes("TIANGONG") || u.includes("TIANHE") || u.includes("WENTIAN") || u.includes("MENGTIAN")) return { category: "space-station", operator: u.includes("ISS") || u.includes("ZARYA") ? "international consortium" : "CNSA", purpose: "crewed space station" };
    if (u.match(/^GPS\b/) || u.includes("NAVSTAR")) return { category: "navigation", operator: "US Space Force", purpose: "global positioning system" };
    if (u.includes("GLONASS")) return { category: "navigation", operator: "Roscosmos", purpose: "global navigation system" };
    if (u.includes("GALILEO")) return { category: "navigation", operator: "ESA", purpose: "global navigation system" };
    if (u.includes("BEIDOU") || u.includes("COMPASS")) return { category: "navigation", operator: "CNSA", purpose: "chinese navigation system" };
    if (u.includes("NOAA") || u.includes("GOES") || u.includes("METEOSAT") || u.includes("METEOR-") || u.includes("HIMAWARI") || u.includes("FY-") || u.includes("FENGYUN")) return { category: "weather", operator: u.includes("NOAA") || u.includes("GOES") ? "NOAA" : u.includes("METEOSAT") ? "EUMETSAT" : u.includes("HIMAWARI") ? "JMA" : "CNSA", purpose: "meteorological observation" };
    if (u.includes("STARLINK")) return { category: "comms", operator: "SpaceX", purpose: "broadband internet constellation" };
    if (u.includes("ONEWEB")) return { category: "comms", operator: "OneWeb", purpose: "broadband internet constellation" };
    if (u.includes("INTELSAT")) return { category: "comms", operator: "Intelsat", purpose: "communications satellite" };
    if (u.includes("SES-") || u.includes("ASTRA")) return { category: "comms", operator: "SES", purpose: "communications satellite" };
    if (u.includes("IRIDIUM")) return { category: "comms", operator: "Iridium", purpose: "mobile satellite communications" };
    if (u.includes("ORBCOMM")) return { category: "comms", operator: "ORBCOMM", purpose: "IoT/M2M data communications" };
    if (u.includes("LANDSAT") || u.includes("SENTINEL") || u.includes("SPOT ") || u.includes("TERRA") || u.includes("AQUA") || u.includes("WORLDVIEW") || u.includes("GEOEYE") || u.includes("PLEIADES")) return { category: "earth-obs", operator: u.includes("SENTINEL") ? "ESA" : u.includes("WORLDVIEW") || u.includes("GEOEYE") || u.includes("PLEIADES") ? "commercial" : "civil remote sensing", purpose: "earth observation / remote sensing" };
    if (u.includes("HUBBLE") || u.includes("HST")) return { category: "science", operator: "space telescope consortium", purpose: "space telescope" };
    if (u.includes("CHANDRA")) return { category: "science", operator: "science mission", purpose: "x-ray observatory" };
    if (u.includes("USA-") || u.includes("NROL") || u.includes("LACROSSE") || u.includes("KH-")) return { category: "military", operator: "NRO/US DoD", purpose: "classified reconnaissance" };
    if (u.includes("COSMOS") && !u.includes("COSMOSKY")) return { category: "military", operator: "Russian MoD", purpose: "classified military" };
    if (u.includes(" DEB") || u.includes("DEB)") || u.includes("R/B") || u.includes("ROCKET BODY") || u.includes("BOOSTER")) return { category: "debris", operator: null, purpose: "orbital debris / rocket body" };
    return { category: "unknown", operator: null, purpose: null };
}

function satPos(sr: satellite.SatRec, t: Date): { lat: number; lon: number } | null {
    const p = satellite.propagate(sr, t);
    if (!p || !p.position) return null;
    const g = satellite.gstime(t);
    const gd = satellite.eciToGeodetic(p.position, g);
    const lon = satellite.degreesLong(gd.longitude);
    const lat = satellite.degreesLat(gd.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    return { lat, lon };
}


function destPoint(lat: number, lon: number, brngRad: number, dMeters: number) {
    const R = 6371e3;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dMeters / R) + Math.cos(lat1) * Math.sin(dMeters / R) * Math.cos(brngRad));
    const lon2 = lon1 + Math.atan2(Math.sin(brngRad) * Math.sin(dMeters / R) * Math.cos(lat1), Math.cos(dMeters / R) - Math.sin(lat1) * Math.sin(lat2));
    return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
}

const FLIGHT_VISUAL_PROJECTION = 4;
const flight_render_lag_ms = 1000;

function projectedFlightPositionAt(flight: Pick<TacticalFlight, "latitude" | "longitude" | "velocity" | "trueTrack" | "onGround"> & { _drStartMs?: number }, atMs: number) {
    const base = { lat: flight.latitude, lon: flight.longitude };
    const started = flight._drStartMs || atMs;
    const sec = Math.min((atMs - started) / 1000, 55);
    const velocity = Number(flight.velocity ?? 0);
    const track = Number(flight.trueTrack);
    if (!Number.isFinite(velocity) || velocity <= 0 || !Number.isFinite(track) || flight.onGround || sec <= 0) return base;
    return destPoint(flight.latitude, flight.longitude, track * Math.PI / 180, velocity * sec * FLIGHT_VISUAL_PROJECTION);
}

function projectedFlightPosition(flight: Pick<TacticalFlight, "latitude" | "longitude" | "velocity" | "trueTrack" | "onGround"> & { _drStartMs?: number }) {
    return projectedFlightPositionAt(flight, Date.now());
}

function rendered_flight_position(flight: Pick<TacticalFlight, "latitude" | "longitude" | "velocity" | "trueTrack" | "onGround"> & { _drStartMs?: number }) {
    return projectedFlightPositionAt(flight, Date.now() - flight_render_lag_ms);
}

function pseudoMgrs(lat: number, lon: number): string {
    const bands = "CDEFGHJKLMNPQRSTUVWX";
    const zone = Math.max(1, Math.min(60, Math.floor((lon + 180) / 6) + 1));
    const band = bands[Math.max(0, Math.min(19, Math.floor((lat + 80) / 8)))] || "N";
    const latScaled = Math.floor(Math.abs(lat) * 1000) % 100000;
    const lonScaled = Math.floor(Math.abs(lon) * 1000) % 100000;
    return `${zone}${band} AA ${String(lonScaled).padStart(5, "0")} ${String(latScaled).padStart(5, "0")}`;
}

function pointInRing(x: number, y: number, ring: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}

function collectLngLatPairs(value: any, out: [number, number][] = []): [number, number][] {
    if (!Array.isArray(value)) return out;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number" && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
        out.push([value[0], value[1]]);
        return out;
    }
    value.forEach((child) => collectLngLatPairs(child, out));
    return out;
}

function buildingFeatureCenter(feature: any, fallback: [number, number]): [number, number] {
    const pairs = collectLngLatPairs(feature?.geometry?.coordinates);
    if (!pairs.length) return fallback;
    const sum = pairs.reduce((acc, pair) => [acc[0] + pair[0], acc[1] + pair[1]] as [number, number], [0, 0]);
    return [sum[0] / pairs.length, sum[1] / pairs.length];
}

function buildingFeatureName(feature: any): string | undefined {
    const props = feature?.properties || {};
    return props["name:en"] || props.name || props.ref || props.type || undefined;
}

function gilTierFor(city: Pick<GilCity, "pop" | "capital">): GilTier {
    if (city.pop >= 10_000_000) return 5;
    if (city.pop >= 1_000_000) return 4;
    if (city.pop >= 500_000 || city.capital) return 3;
    if (city.pop >= 100_000) return 2;
    return 1;
}

function toNum(v: unknown): number | null { if (typeof v === "number" && Number.isFinite(v)) return v; if (typeof v === "string" && v.trim() !== "") { const p = Number(v); return Number.isFinite(p) ? p : null; } return null; }

// ── basemap tile urls ───────────────────────────────────────────────────────
const BASEMAP_STYLES: Record<string, { tiles: string[]; attribution?: string; maxzoom?: number; overlayOn?: string }> = {
    aerial_labels: { tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"], attribution: "Esri", maxzoom: 19 },
    aerial: { tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Esri", maxzoom: 19 },
    streetside: { tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"], attribution: "Esri", maxzoom: 19 },
    dark: { tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"], attribution: "CartoDB", maxzoom: 19 },
    light_gray: { tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"], attribution: "CartoDB", maxzoom: 19 },
    terrain_topo: { tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"], attribution: "Esri", maxzoom: 19 },
    natgeo: { tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"], attribution: "Esri, NatGeo", maxzoom: 12 },
    nightlights: { tiles: ["https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg"], attribution: "NASA GIBS", maxzoom: 8 },
    hybrid: { tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Esri", maxzoom: 19 },
    "3d_imagery": { tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], attribution: "Esri", maxzoom: 19 },
};


interface DRFlight extends TacticalFlight {
    _drStartMs: number;
    _drIcon: string;
}


export default function MapGlobe({ activeStyle, activeImagery, isGlobe, streetViewMode, enabledLayers, radarFilter = "all", reconLocations = [], weatherMode = "wind", sigintFilters, uiCommand, onFlightSelect, onAirportSelect, onSatelliteSelect, onQuakeSelect, onRadioSelect, onCameraSelect, onIntelSelect, onSigintSelect, onSigintData, onCitySelect, onCountrySelect, onRadarCount, onUsgsCount, onRadioCount, onSigintCount, onGdacsCount, onAirqCount, onGilCount, onPositionFix, onViewMetrics, onStreetViewPick, worldMonitorLayers, onWmCounts, onBuildingSelect }: Props) {
    const [streetViewPos, setStreetViewPos] = useState({ lat: 0, lon: 0, zoom: 13 });
    const [snapshot, setSnapshot] = useState<{ url: string; lat: number; lon: number; mgrs: string; altKm: number; zoom: number; style: string; utc: string } | null>(null);
    const [selectedPano, setSelectedPano] = useState<PanoramaPoint | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const deckRef = useRef<any>(null);
    const layersRef = useRef(enabledLayers);
    const prevLayersRef = useRef(enabledLayers);
    const wmLayersRef = useRef(worldMonitorLayers);
    const radarFilterRef = useRef<radar_filter>(radarFilter);
    const reconLocationsRef = useRef<recon_map_point[]>(reconLocations);


    const fData = useRef<Map<string, DRFlight>>(new Map());
    const fDataArr = useRef<DRFlight[]>([]);
    const fSeen = useRef<Map<string, number>>(new Map());
    const qData = useRef<TacticalQuake[]>([]);
    const gdacsData = useRef<TacticalGdacsEvent[]>([]);
    const airqData = useRef<TacticalAirQualityPoint[]>([]);
    const sRecs = useRef<SatelliteTrackRecord[]>([]);
    const rData = useRef<Map<string, TacticalRadio>>(new Map());
    const cData = useRef<Map<string, TacticalCamera>>(new Map());
    const airportData = useRef<Airport[]>([]);
    const airportsLoaded = useRef(false);
    const flightAnimationTick = useRef(0);
    const satsTickRef = useRef(0);
    const gilCities = useRef<GilCityRecord[]>([]);
    const gilLoaded = useRef(false);
    const gilSelectedCity = useRef<GilCityRecord | null>(null);
    const cameraCityKey = useRef("");
    const intelCityKey = useRef("");
    const cityIntelData = useRef<any[]>([]);

    // UI state for bottom dashboard
    const intelMarkers = useRef<maplibregl.Marker[]>([]);
    const countriesGeoRef = useRef<any>(null);
    const trackedId = useRef<string | null>(null);
    const flightHudRef = useRef<HTMLDivElement | null>(null);
    const flightHudTextRef = useRef<HTMLSpanElement | null>(null);
    const panoData = useRef<PanoramaPoint[]>([]);
    const panoFetchKey = useRef("");
    const panoTimer = useRef<number | null>(null);
    const pathPoints = useRef<[number, number][]>([]);
    const pathTimer = useRef<number | null>(null);
    const wmInfraData = useRef<any>(null);
    const wmMilitaryData = useRef<any>(null);
    const wmGeoIntelData = useRef<any>(null);
    const wmSanctionsData = useRef<any>(null);
    const wmFeedData = useRef<any>(null);
    const sigintData = useRef<sigint_response | null>(null);
    const sigintFiltersRef = useRef<sigint_filters>(sigintFilters || {
        tab: "overview", severity: "low", confidence: 0, evidence: "all", cells: true, points: true, labels: true,
    });


    const weatherWindVectors = useRef<weather_vector[]>([]);
    const weatherGrid = useRef<weather_grid | null>(null);
    const weatherGridFetchedAt = useRef(0);
    const weatherFxCanvas = useRef<HTMLCanvasElement | null>(null);
    const weatherBaseCanvas = useRef<HTMLCanvasElement | null>(null);
    const weather_segment_canvases = useRef<Record<"west" | "east", HTMLCanvasElement | null>>({ west: null, east: null });
    const weatherFxTimer = useRef<number | null>(null);
    const weatherWindParticles = useRef<Array<{ x: number; y: number; age: number; ttl: number }>>([]);
    const weatherModeRef = useRef<weather_mode>(weatherMode);


    const refreshRadarNowRef = useRef<(() => void) | null>(null);
    const refreshUsgsNowRef = useRef<(() => void) | null>(null);
    const refreshTleNowRef = useRef<(() => void) | null>(null);
    const refreshRadioNowRef = useRef<(() => void) | null>(null);
    const refreshCameraNowRef = useRef<(() => void) | null>(null);
    const refreshWeatherNowRef = useRef<(() => void) | null>(null);
    const refreshSigintNowRef = useRef<(() => void) | null>(null);
    const refreshGdacsNowRef = useRef<(() => void) | null>(null);
    const refreshAirqNowRef = useRef<(() => void) | null>(null);
    const refreshGilNowRef = useRef<(() => void) | null>(null);
    const refreshWmInfraNowRef = useRef<(() => void) | null>(null);
    const refreshWmMilitaryNowRef = useRef<(() => void) | null>(null);
    const refreshWmGeoIntelNowRef = useRef<(() => void) | null>(null);
    const refreshWmSanctionsNowRef = useRef<(() => void) | null>(null);
    const refreshWmFeedNowRef = useRef<(() => void) | null>(null);
    const rebuildLayersRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        wmLayersRef.current = worldMonitorLayers;
        if (worldMonitorLayers && Object.values(worldMonitorLayers).some(Boolean)) {
            if (!wmFeedData.current && refreshWmFeedNowRef.current) refreshWmFeedNowRef.current();
        }
        rebuildLayersRef.current?.();
    }, [worldMonitorLayers]);


    const timersRef = useRef<{ radar: number | null; usgs: number | null; satelliteCatalog: number | null; satelliteTick: number | null; radioRefresh: number | null; weatherRefresh: number | null; sigintRefresh: number | null; gdacsRefresh: number | null; airqRefresh: number | null; flightTick: number | null }>({ radar: null, usgs: null, satelliteCatalog: null, satelliteTick: null, radioRefresh: null, weatherRefresh: null, sigintRefresh: null, gdacsRefresh: null, airqRefresh: null, flightTick: null });


    useEffect(() => {
        const prev = prevLayersRef.current;
        layersRef.current = enabledLayers;

        if (!enabledLayers["gil"]) onGilCount?.(0);
        if (!enabledLayers["gdacs"]) { gdacsData.current = []; onGdacsCount?.(0); }
        if (!enabledLayers["airq"]) { airqData.current = []; onAirqCount?.(0); }
        if (!enabledLayers["sigint"]) {
            sigintData.current = null;
            onSigintCount?.(0);
            onSigintData?.(null);
            onSigintSelect?.(null);
        }

        if (prev["radar"] === false && enabledLayers["radar"] !== false) refreshRadarNowRef.current?.();
        if (prev["usgs"] === false && enabledLayers["usgs"] !== false) refreshUsgsNowRef.current?.();
        if (prev["tle"] === false && enabledLayers["tle"] !== false) refreshTleNowRef.current?.();
        if (prev["radio"] === false && enabledLayers["radio"] !== false) refreshRadioNowRef.current?.();
        if (prev["camera"] !== true && enabledLayers["camera"] === true) refreshCameraNowRef.current?.();
        if (prev["noaa"] !== enabledLayers["noaa"]) refreshWeatherNowRef.current?.();
        if (prev["sigint"] !== true && enabledLayers["sigint"] === true) refreshSigintNowRef.current?.();
        if (prev["gdacs"] !== true && enabledLayers["gdacs"] === true) refreshGdacsNowRef.current?.();
        if (prev["airq"] !== true && enabledLayers["airq"] === true) refreshAirqNowRef.current?.();
        if (prev["gil"] !== true && enabledLayers["gil"] === true) refreshGilNowRef.current?.();

        prevLayersRef.current = enabledLayers;
        rebuildLayersRef.current?.();
    }, [enabledLayers, onAirqCount, onCameraSelect, onGdacsCount, onGilCount, onSigintCount, onSigintData, onSigintSelect]);

    useEffect(() => {
        weatherModeRef.current = weatherMode;
        refreshWeatherNowRef.current?.();
    }, [weatherMode]);

    useEffect(() => {
        radarFilterRef.current = radarFilter;
        fData.current.clear();
        fDataArr.current = [];
        fSeen.current.clear();
        onRadarCount?.(0);
        onFlightSelect?.(null);
        rebuildLayersRef.current?.();
        if (layersRef.current["radar"] !== false) refreshRadarNowRef.current?.();
    }, [radarFilter, onFlightSelect, onRadarCount]);

    useEffect(() => {
        reconLocationsRef.current = reconLocations;
        rebuildLayersRef.current?.();
    }, [reconLocations]);

    useEffect(() => {
        if (sigintFilters) sigintFiltersRef.current = sigintFilters;
        rebuildLayersRef.current?.();
    }, [sigintFilters]);


    useEffect(() => {
        const map = mapRef.current;
        if (!map || !activeImagery) return;
        const cfg = BASEMAP_STYLES[activeImagery] || BASEMAP_STYLES["hybrid"];

        if (map.getLayer("basemap-overlay-layer")) map.removeLayer("basemap-overlay-layer");
        if (map.getSource("basemap-overlay")) map.removeSource("basemap-overlay");
        if (map.getLayer("basemap-layer")) map.removeLayer("basemap-layer");
        if (map.getSource("basemap")) map.removeSource("basemap");

        const baseCfg = cfg.overlayOn ? (BASEMAP_STYLES[cfg.overlayOn] || BASEMAP_STYLES["dark"]) : cfg;

        map.addSource("basemap", { type: "raster", tiles: baseCfg.tiles, tileSize: 256, attribution: baseCfg.attribution || "", maxzoom: baseCfg.maxzoom || 19 });
        map.addLayer({ id: "basemap-layer", type: "raster", source: "basemap", paint: {} }, map.getLayer("rain-layer") ? "rain-layer" : undefined);

        if (cfg.overlayOn) {
            map.addSource("basemap-overlay", { type: "raster", tiles: cfg.tiles, tileSize: 256, attribution: cfg.attribution || "", maxzoom: cfg.maxzoom || 19 });
            map.addLayer({ id: "basemap-overlay-layer", type: "raster", source: "basemap-overlay", paint: {} }, map.getLayer("rain-layer") ? "rain-layer" : undefined);
        }


        if (activeImagery === "hybrid" || activeImagery === "aerial_labels") {
            if (!map.getSource("hybrid-labels")) {
                map.addSource("hybrid-labels", { type: "raster", tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 19 });
                map.addLayer({ id: "hybrid-labels-layer", type: "raster", source: "hybrid-labels", paint: { "raster-opacity": 0.95 } });
            }
        } else {
            if (map.getLayer("hybrid-labels-layer")) map.removeLayer("hybrid-labels-layer");
            if (map.getSource("hybrid-labels")) map.removeSource("hybrid-labels");
        }

        if (activeImagery === "3d_imagery") {
            if (!map.getSource("terrainSource")) {
                map.addSource("terrainSource", {
                    type: "raster-dem",
                    tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
                    encoding: "terrarium",
                    tileSize: 256,
                    maxzoom: 15
                });
            }
            map.setTerrain({ source: "terrainSource", exaggeration: 1 });

            if (!map.getLayer("hills")) {
                map.addLayer({
                    id: "hills",
                    type: "hillshade",
                    source: "terrainSource",
                    layout: { visibility: "visible" },
                    paint: { "hillshade-shadow-color": "#473B24" }
                });
            }

            if (!map.getSource("openfreemap")) {
                map.addSource("openfreemap", {
                    url: "https://tiles.openfreemap.org/planet",
                    type: "vector",
                });
            }
            if (!map.getLayer("3d-buildings")) {
                map.addLayer({
                    id: "3d-buildings",
                    source: "openfreemap",
                    "source-layer": "building",
                    type: "fill-extrusion",
                    minzoom: 15,
                    filter: ["!=", ["get", "hide_3d"], true],
                    paint: {
                        "fill-extrusion-color": [
                            "interpolate",
                            ["linear"],
                            ["get", "render_height"], 0, "lightgray", 200, "royalblue", 400, "lightblue"
                        ],
                        "fill-extrusion-height": [
                            "interpolate",
                            ["linear"],
                            ["zoom"],
                            15, 0,
                            16, ["get", "render_height"]
                        ],
                        "fill-extrusion-base": ["case",
                            [">=", ["get", "zoom"], 16],
                            ["get", "render_min_height"], 0
                        ]
                    }
                });
            }
        } else {
            if (map.getLayer("3d-buildings")) map.removeLayer("3d-buildings");
            if (map.getSource("openfreemap")) map.removeSource("openfreemap");
            if (map.getLayer("hills")) map.removeLayer("hills");
            map.setTerrain(null);
            if (map.getSource("terrainSource")) map.removeSource("terrainSource");
        }
    }, [activeImagery]);


    const captureSnapshot = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        map.triggerRepaint();
        requestAnimationFrame(() => {
            const mapCanvas = map.getCanvas();
            const deckCanvas = document.getElementById("deck-canvas") as HTMLCanvasElement | null;
            const w = mapCanvas.width, h = mapCanvas.height;
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = w;
            tempCanvas.height = h;
            const ctx = tempCanvas.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(mapCanvas, 0, 0);
            if (deckCanvas) ctx.drawImage(deckCanvas, 0, 0, w, h);
            const center = map.getCenter();
            const zoom = map.getZoom();
            const camKm = Math.max(0.1, 40000 / Math.pow(2, zoom));
            setSnapshot({
                url: tempCanvas.toDataURL("image/png"),
                lat: center.lat,
                lon: center.lng,
                mgrs: pseudoMgrs(center.lat, center.lng),
                altKm: Math.round(camKm * 10) / 10,
                zoom: Math.round(zoom * 10) / 10,
                style: activeStyle,
                utc: new Date().toISOString().replace("T", " ").slice(0, 19) + "Z",
            });
        });
    }, [activeStyle]);


    useEffect(() => {
        if (!uiCommand) return;
        const map = mapRef.current;
        if (!map) return;
        if (uiCommand.type === "zoomIn") { map.zoomIn({ duration: 300 }); return; }
        if (uiCommand.type === "zoomOut") { map.zoomOut({ duration: 300 }); return; }
        if (uiCommand.type === "resetView") { map.flyTo({ center: [0, 20], zoom: 2, duration: 900 }); return; }
        if (uiCommand.type === "screenshot") {
            captureSnapshot();
            return;
        }
        if (uiCommand.type === "focusSelection") {
            const tracked = trackedId.current;
            if (tracked) {
                const fl = fData.current.get(tracked);
                if (fl) {
                    const pos = rendered_flight_position(fl);
                    map.flyTo({ center: [pos.lon, pos.lat], zoom: 8, duration: 800 });
                }
            } else {
                map.flyTo({ center: [0, 20], zoom: 2, duration: 800 });
            }
        }
        if (uiCommand.type === "flyTo") {

            const targetZoom = uiCommand.altitude ? Math.max(2, 20 - Math.log2(uiCommand.altitude / 100)) : 14;
            map.flyTo({ center: [uiCommand.lon, uiCommand.lat], zoom: targetZoom, duration: 1500 });
        }
    }, [uiCommand]);


    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const initialBasemap = BASEMAP_STYLES[activeImagery || "hybrid"] || BASEMAP_STYLES["hybrid"];
        const baseCfg = initialBasemap.overlayOn ? (BASEMAP_STYLES[initialBasemap.overlayOn] || BASEMAP_STYLES["dark"]) : initialBasemap;

        const map = new maplibregl.Map({
            container: containerRef.current,
            // @ts-ignore - exists in maplibre but types might be outdated
            preserveDrawingBuffer: true,
            style: {
                version: 8,
                sources: {
                    basemap: { type: "raster", tiles: baseCfg.tiles, tileSize: 256, attribution: baseCfg.attribution || "", maxzoom: baseCfg.maxzoom || 19 },
                    ...(initialBasemap.overlayOn ? {
                        "basemap-overlay": { type: "raster", tiles: initialBasemap.tiles, tileSize: 256, attribution: initialBasemap.attribution || "", maxzoom: initialBasemap.maxzoom || 19 }
                    } : {})
                },
                layers: [
                    { id: "basemap-layer", type: "raster" as const, source: "basemap", paint: {} },
                    ...(initialBasemap.overlayOn ? [
                        { id: "basemap-overlay-layer", type: "raster" as const, source: "basemap-overlay", paint: {} }
                    ] : [])
                ],
                glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
            },
            center: [0, 20],
            zoom: 2,
            attributionControl: false,
            maxZoom: 20,
        });
        mapRef.current = map;


        const deckCanvas = document.createElement("canvas");
        deckCanvas.id = "deck-canvas";
        deckCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;";
        containerRef.current.appendChild(deckCanvas);

        let isFlyingToTarget = false;

        const handleDeckClick = (info: any, coordinate: [number, number] | null) => {
            if (!info || !info.object) {

                trackedId.current = null;
                pathPoints.current = [];
                if (pathTimer.current !== null) { window.clearInterval(pathTimer.current); pathTimer.current = null; }
                gilSelectedCity.current = null;
                cameraCityKey.current = "";
                cData.current.clear();
                intelMarkers.current.forEach(m => m.remove());
                intelMarkers.current = [];
                cityIntelData.current = [];
                intelCityKey.current = "";
                onFlightSelect?.(null);
                onAirportSelect?.(null);
                onSatelliteSelect?.(null);
                onQuakeSelect?.(null);
                onRadioSelect?.(null);
                onCameraSelect?.(null);
                onSigintSelect?.(null);
                onCitySelect?.(null);
                onBuildingSelect?.(null);

                if (countriesGeoRef.current && coordinate && map.getZoom() < 10) {
                    const [lon, lat] = coordinate;
                    const geo = countriesGeoRef.current;
                    let foundIso: string | null = null;
                    for (const feat of geo.features) {
                        const props = feat.properties;
                        const geom = feat.geometry;
                        if (!geom) continue;
                        const rings: number[][][][] = geom.type === "Polygon" ? [geom.coordinates as number[][][]] : geom.type === "MultiPolygon" ? (geom.coordinates as number[][][][]) : [];
                        for (const poly of rings) {
                            const outer = poly[0] as number[][];
                            if (outer && pointInRing(lon, lat, outer)) {
                                foundIso = props.iso_a3 || props.iso_a2 || null;
                                break;
                            }
                        }
                        if (foundIso) break;
                    }
                    if (foundIso) {
                        onCountrySelect?.(foundIso);
                        return;
                    }
                }

                rebuildLayersRef.current?.();
                return;
            }
            const obj = info.object as any;
            const lid = info.layer?.id || "";

            if (lid.startsWith("sigint-cells")) {
                const cell = obj.properties?.cell as tactical_sigint_cell | undefined;
                if (cell) onSigintSelect?.({ type: "cell", data: cell });
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onCitySelect?.(null);
            } else if (lid.startsWith("sigint-findings")) {
                onSigintSelect?.({ type: "finding", data: obj as tactical_sigint_finding });
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onCitySelect?.(null);
            } else if (lid.startsWith("flights")) {
                trackedId.current = "flight-" + obj.icao24;
                isFlyingToTarget = true;
                const pos = rendered_flight_position(obj);
                map.flyTo({ center: [pos.lon, pos.lat], zoom: 14, pitch: 45, duration: 2000 });
                map.once("moveend", () => { isFlyingToTarget = false; });
                onFlightSelect?.(obj);
                onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null);
            } else if (lid.startsWith("satellites")) {
                onSatelliteSelect?.({ id: obj.id, name: obj.name, line1: obj.line1, line2: obj.line2, category: obj.category, operator: obj.operator, purpose: obj.purpose });
                onFlightSelect?.(null); onAirportSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null);
            } else if (lid.startsWith("quakes")) {
                onQuakeSelect?.(obj);
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null);
            } else if (lid.startsWith("gdacs")) {
                onIntelSelect?.({
                    id: obj.id,
                    type: "gdacs",
                    lat: obj.lat,
                    lng: obj.lon,
                    title: obj.title,
                    status: obj.event_type || obj.alert,
                    severity: obj.severity,
                    story: `${obj.source || "gdacs"}${obj.country ? ` | ${obj.country}` : ""}${obj.date ? ` | ${obj.date}` : ""}${obj.url ? `\n\n[source](${obj.url})` : ""}`,
                });
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null);
            } else if (lid.startsWith("airq")) {
                onIntelSelect?.({
                    id: obj.id,
                    type: "air-quality",
                    lat: obj.lat,
                    lng: obj.lon,
                    title: `${obj.city} air quality`,
                    status: obj.aqi === null ? "aqi unavailable" : `us aqi ${obj.aqi}`,
                    severity: obj.severity === "unknown" ? "low" : obj.severity,
                    city: obj.city,
                    story: `source: ${obj.source}\n\npm2.5: ${obj.pm25 ?? "n/a"} ug/m3\npm10: ${obj.pm10 ?? "n/a"} ug/m3\nno2: ${obj.no2 ?? "n/a"} ug/m3\nozone: ${obj.ozone ?? "n/a"} ug/m3${obj.time ? `\nupdated: ${obj.time}` : ""}`,
                });
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null);
            } else if (lid.startsWith("radio")) {
                onRadioSelect?.(obj);
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null);
            } else if (lid.startsWith("recon")) {
                onIntelSelect?.({
                    id: obj.id,
                    type: "recon",
                    lat: obj.lat,
                    lng: obj.lon,
                    title: `${obj.source}: ${obj.location}`,
                    status: obj.category || "public-source",
                    story: obj.label || obj.url,
                });
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null); onBuildingSelect?.(null);
            } else if (lid.startsWith("city-intel-webcam")) {
                onCameraSelect?.({
                    id: obj.id,
                    name: obj.title,
                    status: "active",
                    lat: obj.lat,
                    lon: obj.lng,
                    city: gilSelectedCity.current?.name || "",
                    region: "",
                    country: gilSelectedCity.current?.country || "",
                    categories: ["city-intel"],
                    distanceKm: null,
                    thumbnailUrl: null,
                    embedUrl: obj.url || null,
                    pageUrl: obj.url || null,
                    lastUpdated: null,
                });
                onIntelSelect?.(null);
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onSigintSelect?.(null); onBuildingSelect?.(null);
            } else if (lid.startsWith("panoramas")) {
                setSelectedPano(obj as PanoramaPoint);
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null); onBuildingSelect?.(null); onIntelSelect?.(null);
            } else if (lid.startsWith("cameras")) {
                onCameraSelect?.(obj as TacticalCamera);
                onIntelSelect?.(null);
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null); onBuildingSelect?.(null);
            } else if (lid.startsWith("city-intel-shooting") || lid.startsWith("city-intel-intel")) {
                onIntelSelect?.({
                    id: obj.id,
                    type: obj.type || "city-intel",
                    lat: obj.lat,
                    lng: obj.lng,
                    title: obj.title || obj.name || (obj.type === "shooting" ? "Shooting report" : "City intelligence"),
                    status: obj.status || obj.severity || obj.type || "public-source",
                    severity: obj.severity,
                    story: obj.story || obj.summary || obj.description || obj.url || "Public city-intelligence signal",
                });
                onCameraSelect?.(null);
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null); onBuildingSelect?.(null);
            } else if (lid.startsWith("airports")) {
                onAirportSelect?.(obj);
                onFlightSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null);
            } else if (lid.startsWith("wm-") && !obj.city) {
                onIntelSelect?.({
                    id: obj.id,
                    type: obj.layer_id || "worldmonitor",
                    lat: obj.lat,
                    lng: obj.lng ?? obj.lon,
                    title: obj.title,
                    status: obj.severity || "info",
                    severity: obj.severity,
                    story: obj.summary,
                });
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null);
            } else if (lid.startsWith("gil") || lid.startsWith("wm")) {
                const cityObj = lid.startsWith("wm") ? (obj.city as GilCityRecord) : (obj as GilCityRecord);
                if (!cityObj) return;
                onCitySelect?.(cityObj);
                onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null);
                gilSelectedCity.current = cityObj;
                void refreshCamerasForCity(cityObj);
                void refreshCityIntel(cityObj);
                setStreetViewPos({ lat: cityObj.lat, lon: cityObj.lon, zoom: 15 });
                map.flyTo({ center: [cityObj.lon, cityObj.lat], zoom: 15, pitch: 45, duration: 2500 });
            }
            rebuildLayersRef.current?.();
        };

        const deck = new Deck({
            canvas: deckCanvas,
            // @ts-ignore - glOptions is valid but may be missing from types
            glOptions: { preserveDrawingBuffer: true },
            width: "100%",
            height: "100%",
            views: [isGlobe ? new _GlobeView() : new MapView({ repeat: true })],
            initialViewState: { longitude: 0, latitude: 20, zoom: 2 } as any,
            controller: false,
            layers: [],
            getTooltip: () => null,
            getCursor: ({ isHovering }) => isHovering ? "pointer" : "grab",
        });
        deckRef.current = deck;

        map.on("click", (e) => {
            const info = deck.pickObject({ x: e.point.x, y: e.point.y, radius: 14 });
            const coordinate: [number, number] = [e.lngLat.lng, e.lngLat.lat];
            if (info?.object) {
                handleDeckClick(info, coordinate);
                return;
            }

            if (map.getLayer("3d-buildings")) {
                const exact = map.queryRenderedFeatures(e.point, { layers: ["3d-buildings"] });
                const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [[e.point.x - 2, e.point.y - 2], [e.point.x + 2, e.point.y + 2]];
                const nearby = exact.length ? exact : map.queryRenderedFeatures(bbox, { layers: ["3d-buildings"] });
                const building = nearby[0];
                if (building) {
                    const [lon, lat] = buildingFeatureCenter(building, [e.lngLat.lng, e.lngLat.lat]);
                    onBuildingSelect?.({ lat, lon, name: buildingFeatureName(building) });
                    onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onCitySelect?.(null); onSigintSelect?.(null); onIntelSelect?.(null);
                    return;
                }
            }
            handleDeckClick(info, coordinate);
        });

        let trackingFrame: number;
        const trackLoop = () => {
            const hud = flightHudRef.current;
            const tracked = trackedId.current;
            if (tracked && tracked.startsWith("flight-")) {
                const fl = fData.current.get(tracked);
                if (fl) {
                    const pos = rendered_flight_position(fl);
                    if (!isFlyingToTarget) map.setCenter([pos.lon, pos.lat]);
                    if (hud) {
                        const pt = map.project([pos.lon, pos.lat]);
                        const cs = (fl.callsign || fl.icao24 || "UNKNOWN").trim() || "UNKNOWN";
                        const kts = fl.velocity ? Math.round(fl.velocity * 1.94384) : 0;
                        const fl100 = fl.baroAltitude != null ? Math.round((fl.baroAltitude * 3.28084) / 100) : null;
                        const hdg = fl.trueTrack != null ? Math.round(fl.trueTrack) : null;
                        const parts = [cs];
                        if (fl100 != null) parts.push("FL" + String(fl100).padStart(3, "0"));
                        parts.push(kts + " kts");
                        if (hdg != null) parts.push("HDG " + String(hdg).padStart(3, "0") + "\u00B0");
                        if (flightHudTextRef.current) flightHudTextRef.current.textContent = parts.join("  \u00B7  ");
                        hud.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
                        hud.style.opacity = "1";
                    }
                } else if (hud) {
                    hud.style.opacity = "0";
                }
            } else if (hud) {
                hud.style.opacity = "0";
            }
            trackingFrame = requestAnimationFrame(trackLoop);
        };
        trackLoop();


        const syncDeck = () => {
            const center = map.getCenter();
            const bearing = map.getBearing();
            const pitch = map.getPitch();
            deck.setProps({
                viewState: {
                    longitude: center.lng,
                    latitude: center.lat,
                    zoom: map.getZoom(),
                    bearing,
                    pitch,
                } as any,
            });
        };
        map.on("move", syncDeck);
        map.on("resize", syncDeck);


        map.on("mousemove", (e) => {
            const lat = e.lngLat.lat;
            const lon = e.lngLat.lng;
            const zoom = map.getZoom();
            const camKm = Math.max(0.1, 40000 / Math.pow(2, zoom));
            const accuracyMeters = Math.max(2, Math.round(camKm * 1000 / 30));
            onPositionFix?.({
                mgrs: pseudoMgrs(lat, lon),
                lat,
                lon,
                altMeters: 0,
                accuracyMeters,
                fixType: "3D-DGPS",
                sats: "12/14",
            });
        });


        let lastViewEmit = 0;
        const reportView = () => {
            const now = performance.now();
            if (now - lastViewEmit < 220) return;
            lastViewEmit = now;
            const zoom = map.getZoom();
            const camKm = Math.max(0.1, 40000 / Math.pow(2, zoom));
            const bounds = map.getBounds();
            const widthDeg = bounds.getEast() - bounds.getWest();
            const scaleKm = Math.max(0.02, widthDeg * 111.32 * Math.cos(map.getCenter().lat * Math.PI / 180) / 10);
            onViewMetrics?.({ cameraKm: Math.round(camKm * 10) / 10, scaleKm: Math.round(scaleKm * 100) / 100 });

            const center = map.getCenter();
            const svZoom = Math.max(8, Math.min(18, Math.round(17 - Math.log2(camKm / 6))));
            setStreetViewPos((prev) => (
                Math.abs(prev.lat - center.lat) < 0.0001 && Math.abs(prev.lon - center.lng) < 0.0001 && prev.zoom === svZoom
                    ? prev
                    : { lat: center.lat, lon: center.lng, zoom: svZoom }
            ));
        };
        const PANO_MIN_ZOOM = 11;
        const refreshPanoramas = async () => {
            if (layersRef.current["panorama"] === false) {
                if (panoData.current.length) { panoData.current = []; panoFetchKey.current = ""; rebuildLayersRef.current?.(); }
                return;
            }
            const zoom = map.getZoom();
            if (zoom < PANO_MIN_ZOOM) {
                if (panoData.current.length) { panoData.current = []; panoFetchKey.current = ""; rebuildLayersRef.current?.(); }
                return;
            }
            const b = map.getBounds();
            const c = map.getCenter();
            const key = [b.getSouth(), b.getNorth(), b.getWest(), b.getEast()].map((v) => v.toFixed(2)).join(",");
            if (key === panoFetchKey.current) return;
            panoFetchKey.current = key;
            try {
                const url = `/api/panoramas?latS=${b.getSouth()}&latN=${b.getNorth()}&lngW=${b.getWest()}&lngE=${b.getEast()}&lat=${c.lat}&lng=${c.lng}&zoom=${Math.round(zoom)}`;
                const res = await fetch(url, { cache: "no-store" });
                if (!res.ok) return;
                const data = (await res.json()) as PanoramaResponse;
                panoData.current = Array.isArray(data.items) ? data.items : [];
                rebuildLayersRef.current?.();
            } catch (err) {
                console.warn("[WORLDVIEW] Panoramas:", err);
            }
        };
        const schedulePanoRefresh = () => {
            if (panoTimer.current) window.clearTimeout(panoTimer.current);
            panoTimer.current = window.setTimeout(() => { void refreshPanoramas(); }, 500);
        };
        map.on("moveend", reportView);
        map.on("moveend", schedulePanoRefresh);
        map.on("zoom", () => {

        });

        map.on("zoomend", () => {
            reportView();
            schedulePanoRefresh();
        });


        map.on("contextmenu", (e) => {
            e.preventDefault();

            trackedId.current = null;
            pathPoints.current = [];
            gilSelectedCity.current = null;
            cameraCityKey.current = "";
            cData.current.clear();
            intelMarkers.current.forEach(m => m.remove());
            intelMarkers.current = [];
            cityIntelData.current = [];
            onFlightSelect?.(null); onAirportSelect?.(null); onSatelliteSelect?.(null); onQuakeSelect?.(null); onRadioSelect?.(null); onCameraSelect?.(null); onSigintSelect?.(null); onCitySelect?.(null); onCountrySelect?.(null);
            rebuildLayersRef.current?.();
        });

        // ── build deck.gl layers ────────────────────────────────────────────
        const buildLayers = () => {
            const layers: any[] = [];
            const ll = layersRef.current;
            const zoom = map.getZoom();
            const weather_grid = weatherGrid.current;
            const weather_mode = weatherModeRef.current;
            if (ll["noaa"] === true && weather_grid && zoom >= 1.5 && weather_mode !== "radar") {
                const stride = zoom >= 5 ? 2 : zoom >= 3 ? 3 : 4;
                const labels = weatherWindVectors.current.filter((_, i) => {
                    const row = Math.floor(i / weather_grid.cols);
                    const col = i % weather_grid.cols;
                    return row % stride === 0 && col % stride === 0;
                });
                layers.push(new TextLayer<weather_vector>({
                    id: "weather-model-labels",
                    data: labels,
                    pickable: false,
                    billboard: true,
                    getPosition: d => [d.lon, d.lat],
                    getText: d => weather_value_label(weather_mode, d),
                    getColor: [245, 252, 255, 255],
                    getSize: zoom >= 5 ? 14 : 12,
                    getTextAnchor: "middle",
                    getAlignmentBaseline: "center",
                    outlineColor: [3, 10, 18, 255],
                    outlineWidth: 4,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontWeight: 700,
                    fontSettings: { sdf: true, fontSize: 64, buffer: 8 },
                    sizeUnits: "pixels",
                }));
            }
            const wm = (wmLayersRef.current || {}) as Partial<world_monitor_layer_state>;
            const wmFeed = wmFeedData.current;

            if (wmFeed && Object.values(wm).some(Boolean)) {
                const activeWm = new Set(Object.entries(wm).filter(([, on]) => on === true).map(([id]) => id));
                const activeScores = wmFeed.country_scores || {};
                if (countriesGeoRef.current && Object.keys(activeScores).length > 0) {
                    const pulse = Math.sin(Date.now() / 350);
                    layers.push(new GeoJsonLayer({
                        id: "wm-country-score-zones",
                        data: countriesGeoRef.current,
                        pickable: false,
                        stroked: true,
                        filled: true,
                        extruded: false,
                        lineWidthMinPixels: 1,
                        getFillColor: (f: any) => {
                            const p = f.properties || {};
                            const iso2 = String(p["ISO3166-1-Alpha-2"] || p.iso_a2 || p.ISO_A2 || "").toLowerCase();
                            const rec = activeScores[iso2];
                            if (!rec || !Object.keys(rec.layers || {}).some(k => activeWm.has(k))) return [0, 0, 0, 0];
                            const score = Math.min(100, Number(rec.score || 0));
                            const col = wm_color(rec.max_severity === "critical" ? "conflicts" : "intel_hotspots", Math.floor(35 + score * 1.4 + pulse * 18));
                            return [col[0], col[1], col[2], col[3]];
                        },
                        getLineColor: (f: any) => {
                            const p = f.properties || {};
                            const iso2 = String(p["ISO3166-1-Alpha-2"] || p.iso_a2 || p.ISO_A2 || "").toLowerCase();
                            const rec = activeScores[iso2];
                            if (!rec || !Object.keys(rec.layers || {}).some(k => activeWm.has(k))) return [0, 0, 0, 0];
                            return wm_color(rec.max_severity === "critical" ? "conflicts" : "intel_hotspots", 180);
                        },
                        updateTriggers: {
                            getFillColor: [flightAnimationTick.current, wmFeed],
                            getLineColor: [flightAnimationTick.current, wmFeed],
                        },
                    }));
                }

                const pathRows = Array.isArray(wmFeed.paths) ? wmFeed.paths : [];
                for (const lid of ["cables", "pipelines", "trade_routes"] as const) {
                    if (!activeWm.has(lid)) continue;
                    const rows = pathRows.filter((x: any) => x.layer_id === lid);
                    if (!rows.length) continue;
                    layers.push(new PathLayer({
                        id: `wm-${lid}-unified`,
                        data: rows,
                        getPath: (d: any) => d.points,
                        getColor: (d: any) => wm_color(d.layer_id, lid === "cables" ? 190 : 220),
                        getWidth: lid === "pipelines" ? 2200 : lid === "trade_routes" ? 2600 : 1600,
                        widthMinPixels: 1.5,
                        widthMaxPixels: lid === "pipelines" ? 6 : 5,
                        pickable: true,
                    }));
                }

                const pointRows = Array.isArray(wmFeed.points) ? wmFeed.points : [];
                for (const lid of wm_point_layers) {
                    if (!activeWm.has(lid)) continue;
                    const rows = pointRows.filter((x: any) => x.layer_id === lid);
                    if (!rows.length) continue;
                    layers.push(new ScatterplotLayer({
                        id: `wm-${lid}-unified`,
                        data: rows,
                        getPosition: (d: any) => [Number(d.lng ?? d.lon), Number(d.lat)],
                        getRadius: (d: any) => wm_radius(d.layer_id, d.severity),
                        getFillColor: (d: any) => wm_color(d.layer_id, d.severity === "critical" ? 245 : 215),
                        getLineColor: [0, 0, 0, 235],
                        lineWidthMinPixels: 1,
                        stroked: true,
                        pickable: true,
                        radiusMinPixels: lid === "conflicts" || lid === "wars" || lid === "iran_attacks" ? 8 : 4,
                        radiusMaxPixels: lid === "conflicts" || lid === "wars" || lid === "iran_attacks" ? 34 : 18,
                    }));
                }
            }


            if (!wmFeedData.current && countriesGeoRef.current && (wm.conflicts || wm.wars) && wmGeoIntelData.current) {
                const events = Array.isArray(wmGeoIntelData.current.events) ? wmGeoIntelData.current.events : [];
                const activeIso3 = new Set<string>();
                for (const ev of events) {
                    if (ev.country_iso3) activeIso3.add(ev.country_iso3.toUpperCase());
                    else if (gilCities.current && gilCities.current.length > 0) {
                        let nearest = null;
                        let minDist = Infinity;
                        for (const c of gilCities.current) {
                            const d = Math.pow(c.lat - ev.lat, 2) + Math.pow(c.lon - ev.lng, 2);
                            if (d < minDist) { minDist = d; nearest = c; }
                        }
                        if (nearest && nearest.iso) activeIso3.add(nearest.iso.toUpperCase());
                    }
                }
                const pulse = Math.sin(Date.now() / 250);
                const fillAlpha = Math.floor(100 + 80 * pulse);
                const lineAlpha = Math.floor(150 + 100 * pulse);

                layers.push(new GeoJsonLayer({
                    id: "wm-conflict-zones",
                    data: countriesGeoRef.current,
                    pickable: false,
                    stroked: true,
                    filled: true,
                    extruded: false,
                    lineWidthMinPixels: 1,
                    getFillColor: (f: any) => {
                        const iso3 = (f.properties?.["iso_a3"] || f.properties?.["adm0_a3"] || "").toUpperCase();
                        return activeIso3.has(iso3) ? [239, 68, 68, fillAlpha] : [0, 0, 0, 0];
                    },
                    getLineColor: (f: any) => {
                        const iso3 = (f.properties?.["iso_a3"] || f.properties?.["adm0_a3"] || "").toUpperCase();
                        return activeIso3.has(iso3) ? [248, 113, 113, lineAlpha] : [0, 0, 0, 0];
                    },
                    updateTriggers: {
                        getFillColor: [flightAnimationTick.current, wmGeoIntelData.current],
                        getLineColor: [flightAnimationTick.current, wmGeoIntelData.current]
                    }
                }));
            }

            if (!wmFeedData.current && wm.sanctions && wmSanctionsData.current && wmSanctionsData.current.sanctions) {
                layers.push(
                    new ScatterplotLayer({
                        id: 'wm-sanctions-scatter',
                        data: wmSanctionsData.current.sanctions,
                        getPosition: (d: any) => [d.lon, d.lat],
                        getFillColor: [239, 68, 68, 220],
                        getLineColor: [127, 29, 29, 255],
                        lineWidthMinPixels: 1,
                        getRadius: 60000,
                        radiusMinPixels: 4,
                        radiusMaxPixels: 14,
                        pickable: true,
                        onClick: (info: any) => {
                            if (info.object) {
                                console.log("Sanction target:", info.object);
                            }
                        }
                    })
                );
            }

            // sigint electronic environment
            if (ll["sigint"] === true && sigintData.current) {
                const cfg = sigintFiltersRef.current;
                const navKinds = new Set(["gps_loss", "navigation_degradation", "position_stale", "integrity_drop", "impossible_movement"]);
                const transKinds = new Set(["emergency", "unlawful_interference", "radio_failure", "identity_change"]);
                const findings = sigintData.current.findings.filter((d) => {
                    if (sigint_severity_rank[d.severity] < sigint_severity_rank[cfg.severity] || d.confidence < cfg.confidence) return false;
                    if (cfg.evidence !== "all" && d.evidence_class !== cfg.evidence) return false;
                    if (cfg.tab === "navigation" && !navKinds.has(d.kind)) return false;
                    if (cfg.tab === "transponder" && !transKinds.has(d.kind)) return false;
                    return true;
                });
                const cells = sigintData.current.cells.filter((d) =>
                    sigint_severity_rank[d.severity] >= sigint_severity_rank[cfg.severity] && d.confidence >= cfg.confidence
                );
                if (cfg.cells && cells.length) {
                    layers.push(new GeoJsonLayer({
                        id: "sigint-cells",
                        data: {
                            type: "FeatureCollection",
                            features: cells.map(cell => ({ ...cell.polygon, properties: { id: cell.id, cell } })),
                        },
                        pickable: true,
                        filled: true,
                        stroked: true,
                        lineWidthMinPixels: 1,
                        getFillColor: (d: any) => {
                            const cell = d.properties.cell as tactical_sigint_cell;
                            return sigint_color(cell.severity, Math.round(28 + cell.confidence * 0.78));
                        },
                        getLineColor: (d: any) => {
                            const cell = d.properties.cell as tactical_sigint_cell;
                            return sigint_color(cell.severity, 220);
                        },
                    }));
                }
                if (cfg.points && findings.length) {
                    layers.push(new ScatterplotLayer<tactical_sigint_finding>({
                        id: "sigint-findings",
                        data: findings,
                        getPosition: d => [d.lon, d.lat],
                        getRadius: d => d.severity === "critical" ? 58000 : d.severity === "high" ? 40000 : d.severity === "medium" ? 28000 : 18000,
                        getFillColor: d => sigint_color(d.severity, 155),
                        getLineColor: d => sigint_color(d.severity, 255),
                        lineWidthMinPixels: 2,
                        stroked: true,
                        pickable: true,
                        radiusMinPixels: 5,
                        radiusMaxPixels: 28,
                    }));
                }
                if (cfg.labels && zoom > 3 && findings.length) {
                    layers.push(new TextLayer<tactical_sigint_finding>({
                        id: "sigint-findings-labels",
                        data: findings.slice(0, 90),
                        getPosition: d => [d.lon, d.lat],
                        getText: d => `${d.kind.replace(/_/g, " ")} ${d.confidence}%`,
                        getSize: 10,
                        getColor: d => sigint_color(d.severity, 245),
                        getPixelOffset: [0, -18],
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: "700",
                        fontSettings: { sdf: true },
                        outlineColor: [0, 0, 0, 255],
                        outlineWidth: 3,
                        sizeMinPixels: 8,
                        billboard: true,
                    }));
                }
            }


            const reconRows = reconLocationsRef.current;
            if (reconRows.length) {
                layers.push(new ScatterplotLayer<recon_map_point>({
                    id: "recon-locations",
                    data: reconRows,
                    getPosition: d => [d.lon, d.lat],
                    getRadius: 18000,
                    radiusMinPixels: 7,
                    radiusMaxPixels: 24,
                    getFillColor: [34, 211, 238, 170],
                    getLineColor: [255, 255, 255, 220],
                    lineWidthMinPixels: 1,
                    stroked: true,
                    filled: true,
                    pickable: true,
                }));
                if (zoom > 3) {
                    layers.push(new TextLayer<recon_map_point>({
                        id: "recon-labels",
                        data: reconRows.slice(0, 80),
                        getPosition: d => [d.lon, d.lat],
                        getText: d => d.source,
                        getSize: 10,
                        getColor: [224, 242, 254, 230],
                        getPixelOffset: [0, -18],
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: "700",
                        fontSettings: { sdf: true },
                        outlineColor: [0, 0, 0, 255],
                        outlineWidth: 3,
                        billboard: true,
                    }));
                }
            }


            if (ll["radar"] !== false) {
                const aircraftScale = zoom < 5 ? 1 : Math.min(2.35, 1 + (zoom - 5) * 0.2);
                layers.push(new IconLayer({
                    id: "flights-icons",
                    data: fDataArr.current,
                    getPosition: (d: any) => {
                        const pos = projectedFlightPosition(d);
                        return [pos.lon, pos.lat];
                    },
                    getIcon: (d: any) => ({ url: d._drIcon, width: 96, height: 96, anchorX: 48, anchorY: 48 }),
                    getSize: (d: any) => d.category === "MILITARY" ? 28 : 24,
                    sizeUnits: "pixels",
                    getAngle: (d: any) => -(d.trueTrack ?? 0),
                    sizeScale: aircraftScale,
                    sizeMinPixels: 10,
                    sizeMaxPixels: 92,
                    pickable: true,
                    billboard: true,
                    loadOptions: { image: { type: "imagebitmap" } } as any,
                    updateTriggers: {
                        getPosition: flightAnimationTick.current,
                    },
                    transitions: {
                        getPosition: {
                            duration: flight_render_lag_ms,
                            easing: (t: number) => t
                        }
                    }
                }));

                if (airportsLoaded.current && zoom > 4) {
                    const minZoom = { large: 6, medium: 8, small: 10 };
                    const visibleAirports = airportData.current.filter(a => {
                        const th = minZoom[a.size || "small"] || 10;
                        return zoom >= th;
                    });
                    layers.push(new IconLayer({
                        id: "airports-icons",
                        data: visibleAirports,
                        getPosition: (d: any) => [Number(d.lon), Number(d.lat)],
                        getIcon: (d: any) => ({ url: d.size === "large" ? AIRPORT_ICON_LARGE : AIRPORT_ICON_SMALL, width: 96, height: 96, anchorX: 48, anchorY: 96 }),
                        getSize: (d: any) => d.size === "large" ? 48 : d.size === "medium" ? 36 : 26,
                        sizeMinPixels: 10,
                        sizeMaxPixels: 60,
                        pickable: true,
                        loadOptions: { image: { type: "imagebitmap" } } as any,
                    }));
                    if (zoom > 5) {
                        layers.push(new TextLayer({
                            id: "airports-labels",
                            data: visibleAirports.filter(a => a.size === "large" || (a.size === "medium" && zoom > 7) || zoom > 10),
                            getPosition: (d: any) => [Number(d.lon), Number(d.lat)],
                            getText: (d: any) => d.iata,
                            getSize: (d: any) => d.size === "large" ? 13 : d.size === "medium" ? 11 : 9,
                            getColor: (d: any) => d.size === "large" ? [251, 191, 36, 240] : d.size === "medium" ? [56, 189, 248, 240] : [148, 163, 184, 220],
                            getPixelOffset: [0, -40],
                            fontFamily: "'Space Mono', monospace",
                            fontWeight: "bold",
                            fontSettings: { sdf: true },
                            outlineColor: [0, 0, 0, 240],
                            outlineWidth: 3,
                            sizeMinPixels: 8,
                            billboard: true,
                        }));
                    }
                }
            }


            if (ll["usgs"] !== false) {
                layers.push(new ScatterplotLayer({
                    id: "quakes-scatter",
                    data: qData.current,
                    getPosition: (d: TacticalQuake) => [d.longitude, d.latitude],
                    getRadius: (d: TacticalQuake) => (d.mag !== null && d.mag >= 6 ? 80000 : d.mag !== null && d.mag >= 4 ? 50000 : 30000),
                    getFillColor: (d: TacticalQuake) => d.mag !== null && d.mag >= 6 ? [239, 68, 68, 200] : d.mag !== null && d.mag >= 4 ? [249, 115, 22, 200] : [251, 191, 36, 180],
                    getLineColor: [69, 26, 3, 220],
                    lineWidthMinPixels: 2,
                    stroked: true,
                    pickable: true,
                    radiusMinPixels: 4,
                    radiusMaxPixels: 30,
                }));
                if (zoom > 3) {
                    layers.push(new IconLayer({
                        id: "quakes-icons",
                        data: qData.current,
                        getPosition: (d: TacticalQuake) => [d.longitude, d.latitude],
                        getIcon: () => ({ url: QUAKE_ICON, width: 96, height: 96, anchorX: 48, anchorY: 48 }),
                        getSize: (d: TacticalQuake) => (d.mag !== null && d.mag >= 6 ? 32 : d.mag !== null && d.mag >= 4 ? 24 : 18),
                        sizeMinPixels: 8,
                        sizeMaxPixels: 40,
                        pickable: true,
                        loadOptions: { image: { type: "imagebitmap" } } as any,
                    }));
                }
            }


            if (ll["gdacs"] === true) {
                layers.push(new ScatterplotLayer<TacticalGdacsEvent>({
                    id: "gdacs-alerts",
                    data: gdacsData.current,
                    getPosition: d => [d.lon, d.lat],
                    getRadius: d => d.severity === "critical" ? 78000 : d.severity === "high" ? 56000 : 34000,
                    getFillColor: d => event_color(d.severity, 155),
                    getLineColor: d => event_color(d.severity, 255),
                    lineWidthMinPixels: 2,
                    stroked: true,
                    pickable: true,
                    radiusMinPixels: 6,
                    radiusMaxPixels: 32,
                }));
            }


            if (ll["airq"] === true) {
                layers.push(new ScatterplotLayer<TacticalAirQualityPoint>({
                    id: "airq-points",
                    data: airqData.current,
                    getPosition: d => [d.lon, d.lat],
                    getRadius: d => d.aqi === null ? 22000 : Math.min(72000, 18000 + d.aqi * 230),
                    getFillColor: d => airq_color(d.aqi, 165),
                    getLineColor: d => airq_color(d.aqi, 245),
                    lineWidthMinPixels: 2,
                    stroked: true,
                    pickable: true,
                    radiusMinPixels: 5,
                    radiusMaxPixels: 28,
                }));
                if (zoom > 3) {
                    layers.push(new TextLayer<TacticalAirQualityPoint>({
                        id: "airq-labels",
                        data: airqData.current,
                        getPosition: d => [d.lon, d.lat],
                        getText: d => `${d.city} ${d.aqi ?? "n/a"}`,
                        getSize: 9,
                        getColor: d => airq_color(d.aqi, 230),
                        getPixelOffset: [0, -18],
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: "700",
                        fontSettings: { sdf: true },
                        outlineColor: [0, 0, 0, 255],
                        outlineWidth: 3,
                        sizeMinPixels: 7,
                        billboard: true,
                    }));
                }
            }


            if (ll["tle"] !== false) {
                layers.push(new IconLayer({
                    id: "satellites-icons",
                    data: sRecs.current,
                    getPosition: (d: SatelliteTrackRecord) => [d.lon, d.lat],
                    getIcon: (d: SatelliteTrackRecord) => ({ url: d.category === "space-station" ? SPACE_STATION_ICON : d.category === "military" ? MILITARY_SATELLITE_ICON : SATELLITE_ICON, width: 96, height: 96, anchorX: 48, anchorY: 48 }),
                    getSize: (d: SatelliteTrackRecord) => d.category === "space-station" ? 38 : 28,
                    sizeMinPixels: 10,
                    sizeMaxPixels: 50,
                    pickable: true,
                    loadOptions: { image: { type: "imagebitmap" } } as any,
                    updateTriggers: {
                        getPosition: satsTickRef.current,
                    },
                    transitions: {
                        getPosition: {
                            duration: 1000,
                            easing: (t: number) => t
                        }
                    }
                }));
                if (zoom > 2) {
                    layers.push(new TextLayer({
                        id: "satellites-labels",
                        data: sRecs.current,
                        getPosition: (d: SatelliteTrackRecord) => [d.lon, d.lat],
                        getText: (d: SatelliteTrackRecord) => d.name || ("SAT-" + d.id),
                        getSize: 9,
                        getColor: (d: SatelliteTrackRecord) => d.category === "military" ? [248, 113, 113, 200] : [125, 211, 252, 200],
                        getPixelOffset: [0, -16],
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: "600",
                        fontSettings: { sdf: true },
                        outlineColor: [12, 74, 110, 240],
                        outlineWidth: 2,
                        sizeMinPixels: 7,
                        billboard: true,
                        updateTriggers: {
                            getPosition: satsTickRef.current,
                        },
                        transitions: {
                            getPosition: {
                                duration: 1000,
                                easing: (t: number) => t
                            }
                        }
                    }));
                }
            }


            if (ll["radio"] !== false) {
                const radioArr = Array.from(rData.current.values());
                const icon_count = zoom > 3 ? Math.min(700, radioArr.length) : 0;
                if (zoom > 3) {
                    layers.push(new IconLayer({
                        id: "radio-icons",
                        data: radioArr.slice(0, icon_count),
                        getPosition: (d: TacticalRadio) => [d.lon, d.lat],
                        getIcon: () => ({ url: RADIO_ICON, width: 96, height: 96, anchorX: 48, anchorY: 48 }),
                        getSize: 22,
                        sizeMinPixels: 8,
                        sizeMaxPixels: 32,
                        pickable: true,
                        loadOptions: { image: { type: "imagebitmap" } } as any,
                    }));
                }
                if (radioArr.length > icon_count) {
                    layers.push(new ScatterplotLayer({
                        id: "radio-points",
                        data: radioArr.slice(icon_count),
                        getPosition: (d: TacticalRadio) => [d.lon, d.lat],
                        getRadius: 15000,
                        getFillColor: (d: TacticalRadio) => d.source === "radio.garden" ? [56, 189, 248, 220] : [52, 211, 153, 210],
                        getLineColor: [15, 23, 42, 220],
                        lineWidthMinPixels: 2,
                        stroked: true,
                        pickable: true,
                        radiusMinPixels: 3,
                        radiusMaxPixels: 8,
                    }));
                }
            }


            if (ll["panorama"] !== false && zoom >= 11 && panoData.current.length > 0) {
                layers.push(new IconLayer<PanoramaPoint>({
                    id: "panoramas-icons",
                    data: panoData.current,
                    getPosition: (d: PanoramaPoint) => [d.lon, d.lat],
                    getIcon: () => ({ url: PANO_ICON, width: 96, height: 96, anchorX: 48, anchorY: 48 }),
                    getSize: 30,
                    sizeMinPixels: 14,
                    sizeMaxPixels: 44,
                    pickable: true,
                    billboard: true,
                    loadOptions: { image: { type: "imagebitmap" } } as any,
                }));
                if (zoom >= 13 && panoData.current.length <= 40) {
                    layers.push(new TextLayer<PanoramaPoint>({
                        id: "panoramas-labels",
                        data: panoData.current,
                        getPosition: (d: PanoramaPoint) => [d.lon, d.lat],
                        getText: (d: PanoramaPoint) => d.title.slice(0, 46),
                        getSize: 8,
                        getColor: [221, 214, 254, 230],
                        getPixelOffset: [0, -20],
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: "600",
                        fontSettings: { sdf: true },
                        outlineColor: [30, 27, 75, 240],
                        outlineWidth: 2,
                        sizeMinPixels: 7,
                        billboard: true,
                    }));
                }
            }


            if (ll["camera"] !== false && zoom >= 5) {
                const cameraArr = Array.from(cData.current.values());
                layers.push(new IconLayer({
                    id: "cameras-icons",
                    data: cameraArr,
                    getPosition: (d: TacticalCamera) => [d.lon, d.lat],
                    getIcon: () => ({ url: CAMERA_ICON, width: 96, height: 96, anchorX: 48, anchorY: 48 }),
                    getSize: 24,
                    sizeMinPixels: 8,
                    sizeMaxPixels: 36,
                    pickable: true,
                    billboard: true,
                    loadOptions: { image: { type: "imagebitmap" } } as any,
                }));
                if (zoom > 10 && cameraArr.length <= 12) {
                    layers.push(new TextLayer({
                        id: "cameras-labels",
                        data: cameraArr,
                        getPosition: (d: TacticalCamera) => [d.lon, d.lat],
                        getText: (d: TacticalCamera) => d.name.toUpperCase().slice(0, 56),
                        getSize: 8,
                        getColor: [186, 230, 253, 220],
                        getPixelOffset: [0, -18],
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: "600",
                        fontSettings: { sdf: true },
                        outlineColor: [8, 47, 73, 240],
                        outlineWidth: 2,
                        sizeMinPixels: 7,
                        billboard: true,
                    }));
                }
            }


            if (cityIntelData.current.length > 0) {
                layers.push(new IconLayer({
                    id: "city-intel-webcam",
                    data: cityIntelData.current.filter(d => d.type === "webcam"),
                    getPosition: (d: any) => [d.lng, d.lat],
                    getIcon: () => ({ url: CAMERA_ICON, width: 96, height: 96, anchorX: 48, anchorY: 48 }),
                    getSize: 32,
                    sizeMinPixels: 10,
                    sizeMaxPixels: 40,
                    pickable: true,
                    billboard: true,
                    loadOptions: { image: { type: "imagebitmap" } } as any,
                }));
                layers.push(new IconLayer({
                    id: "city-intel-shooting",
                    data: cityIntelData.current.filter(d => d.type === "shooting"),
                    getPosition: (d: any) => [d.lng, d.lat],
                    getIcon: () => ({ url: SHOOTING_ICON, width: 96, height: 96, anchorX: 48, anchorY: 48 }),
                    getSize: 54,
                    sizeMinPixels: 18,
                    sizeMaxPixels: 64,
                    pickable: true,
                    billboard: true,
                    loadOptions: { image: { type: "imagebitmap" } } as any,
                }));
                layers.push(new IconLayer({
                    id: "city-intel-intel",
                    data: cityIntelData.current.filter(d => d.type === "intel"),
                    getPosition: (d: any) => [d.lng, d.lat],
                    getIcon: () => ({ url: INTEL_ICON, width: 96, height: 96, anchorX: 48, anchorY: 48 }),
                    getSize: 48,
                    sizeMinPixels: 16,
                    sizeMaxPixels: 58,
                    pickable: true,
                    billboard: true,
                    loadOptions: { image: { type: "imagebitmap" } } as any,
                }));
            }


            if (ll["gil"] === true) {
                const cities = gilCities.current;
                const minTier = zoom > 10 ? 1 : zoom > 6 ? 1 : zoom > 4 ? 2 : zoom > 2 ? 3 : 4;
                const visible = cities.filter(c => c.tier >= minTier).slice(0, 26000);

                const activeWmCities = new Set<string>();
                const wmActive = wmLayersRef.current && Object.values(wmLayersRef.current).some(Boolean);
                const activePoints: Array<{
                    city: GilCityRecord;
                    activeIncidents: any[];
                    maxSeverity: "critical" | "high" | "moderate" | "low";
                    color: number[];
                    glowColor: string;
                }> = [];

                const wmEventRows = Array.isArray(wmFeedData.current?.points)
                    ? wmFeedData.current.points
                    : Array.isArray(wmGeoIntelData.current?.events)
                        ? wmGeoIntelData.current.events
                        : [];

                if (wmActive && wmLayersRef.current && wmEventRows.length > 0) {
                    const wmLayers = wmLayersRef.current;
                    for (const ev of wmEventRows) {
                        const lid = ev.layer_id as world_monitor_layer_id;
                        if (wmLayers[lid] || wmLayers.conflicts) {
                            let nearest = null;
                            let minDist = Infinity;
                            for (const c of gilCities.current) {
                                const evLng = ev.lng ?? ev.lon;
                                const d = Math.pow(c.lat - ev.lat, 2) + Math.pow(c.lon - evLng, 2);
                                if (d < minDist) { minDist = d; nearest = c; }
                            }
                            if (nearest) {
                                activeWmCities.add(nearest.id);
                                activePoints.push({
                                    city: nearest,
                                    activeIncidents: [ev],
                                    maxSeverity: ev.severity === "critical" ? "critical" : ev.severity === "elevated" ? "high" : "moderate",
                                    color: wm_color(lid, 255),
                                    glowColor: "rgba(239, 68, 68, 0.4)",
                                });
                            }
                        }
                    }
                }


                const dots = visible.filter(c => c.tier < 4 && !activeWmCities.has(c.id));
                layers.push(new ScatterplotLayer({
                    id: "gil-dots",
                    data: dots,
                    getPosition: (d: GilCityRecord) => [d.lon, d.lat],
                    getRadius: (d: GilCityRecord) => d.tier >= 3 ? 8000 : d.tier >= 2 ? 5000 : 3000,
                    getFillColor: (d: GilCityRecord) => d.tier >= 3 ? [165, 243, 252, 255] : d.tier >= 2 ? [103, 232, 249, 255] : [34, 211, 238, 255],
                    getLineColor: (d: GilCityRecord) => d.tier >= 4 ? [17, 24, 39, 240] : d.tier === 3 ? [69, 10, 10, 240] : [2, 6, 23, 240],
                    lineWidthMinPixels: 1,
                    stroked: true,
                    pickable: true,
                    radiusMinPixels: 2,
                    radiusMaxPixels: 12,
                }));


                const metros = visible.filter(c => c.tier >= 4 && !activeWmCities.has(c.id));
                layers.push(new ScatterplotLayer({
                    id: "gil-metros",
                    data: metros,
                    getPosition: (d: GilCityRecord) => [d.lon, d.lat],
                    getRadius: (d: GilCityRecord) => d.tier === 5 ? 15000 : 10000,
                    getFillColor: (d: GilCityRecord) => d.tier >= 5 ? [207, 250, 254, 255] : [165, 243, 252, 255],
                    getLineColor: [17, 24, 39, 240],
                    lineWidthMinPixels: 2,
                    stroked: true,
                    pickable: true,
                    radiusMinPixels: 4,
                    radiusMaxPixels: 16,
                }));


                if (activePoints.length > 0) {
                    const pulseScale = 1 + 0.3 * Math.sin(Date.now() / 250);


                    layers.push(new ScatterplotLayer({
                        id: "wm-glow-layer",
                        data: activePoints,
                        getPosition: (d: any) => [d.city.lon, d.city.lat],
                        getRadius: (d: any) => {
                            const baseRadius = d.maxSeverity === "critical" ? 35000 : d.maxSeverity === "high" ? 24000 : 16000;
                            return baseRadius * pulseScale;
                        },
                        getFillColor: (d: any) => [d.color[0], d.color[1], d.color[2], 60] as [number, number, number, number],
                        pickable: false,
                        radiusMinPixels: 10,
                        radiusMaxPixels: 35,
                        updateTriggers: {
                            getRadius: flightAnimationTick.current,
                        }
                    }));


                    layers.push(new ScatterplotLayer({
                        id: "wm-core-layer",
                        data: activePoints,
                        getPosition: (d: any) => [d.city.lon, d.city.lat],
                        getRadius: (d: any) => d.maxSeverity === "critical" ? 10000 : d.maxSeverity === "high" ? 7000 : 5000,
                        getFillColor: (d: any) => d.color as [number, number, number, number],
                        getLineColor: [0, 0, 0, 240],
                        lineWidthMinPixels: 1.5,
                        stroked: true,
                        pickable: true,
                        radiusMinPixels: 5,
                        radiusMaxPixels: 15,
                    }));
                }


                if (!wmFeedData.current && wmInfraData.current) {
                    const infra = wmInfraData.current;
                    if (wmLayersRef.current?.nuclear && infra.nuclear) {
                        layers.push(new ScatterplotLayer({
                            id: "wm-nuclear-facilities",
                            data: infra.nuclear,
                            getPosition: (d: any) => [d.lon, d.lat],
                            getRadius: 12000,
                            getFillColor: [217, 70, 239, 220],
                            getLineColor: [100, 10, 150, 255],
                            lineWidthMinPixels: 1.5,
                            stroked: true,
                            pickable: true,
                            radiusMinPixels: 6,
                            radiusMaxPixels: 20,
                        }));
                    }
                    if (wmLayersRef.current?.cables && infra.cables) {
                        layers.push(new PathLayer({
                            id: "wm-cables",
                            data: infra.cables,
                            getPath: (d: any) => d.points,
                            getColor: [14, 165, 233, 220],
                            getWidth: 2000,
                            widthMinPixels: 2,
                            widthMaxPixels: 6,
                            pickable: true,
                        }));
                    }
                    if (wmLayersRef.current?.pipelines && infra.pipelines) {
                        layers.push(new PathLayer({
                            id: "wm-pipelines",
                            data: infra.pipelines,
                            getPath: (d: any) => d.points,
                            getColor: (d: any) => d.type === "gas" ? [245, 158, 11, 220] : [217, 119, 6, 220],
                            getWidth: 2000,
                            widthMinPixels: 2,
                            widthMaxPixels: 6,
                            pickable: true,
                        }));
                    }
                }

                if (!wmFeedData.current && wmMilitaryData.current) {
                    const mil = wmMilitaryData.current;
                    if (wmLayersRef.current?.bases && mil.bases) {
                        layers.push(new ScatterplotLayer({
                            id: "wm-military-bases",
                            data: mil.bases,
                            getPosition: (d: any) => [d.lon, d.lat],
                            getRadius: 8000,
                            getFillColor: [16, 185, 129, 220],
                            getLineColor: [6, 78, 59, 255],
                            lineWidthMinPixels: 1.5,
                            stroked: true,
                            pickable: true,
                            radiusMinPixels: 5,
                            radiusMaxPixels: 15,
                        }));
                    }
                    if (wmLayersRef.current?.conflicts && mil.conflicts) {
                        layers.push(new ScatterplotLayer({
                            id: "wm-conflicts",
                            data: mil.conflicts,
                            getPosition: (d: any) => d.center ? d.center : [0, 0],
                            getRadius: 25000,
                            getFillColor: [220, 38, 38, 180],
                            getLineColor: [153, 27, 27, 255],
                            lineWidthMinPixels: 2,
                            stroked: true,
                            pickable: true,
                            radiusMinPixels: 10,
                            radiusMaxPixels: 40,
                        }));
                    }
                }


                if (zoom > 2) {
                    const labeled = visible.filter(c => {
                        if (zoom > 8) return c.tier >= 3 || (c.capital && c.pop >= 80_000);
                        if (zoom > 5) return c.tier >= 3;
                        if (zoom > 3) return c.tier >= 4 || (c.capital && c.pop >= 500_000);
                        return c.tier === 5 || (c.capital && c.pop >= 3_000_000);
                    }).slice(0, 180);
                    layers.push(new TextLayer({
                        id: "gil-labels",
                        data: labeled,
                        getPosition: (d: GilCityRecord) => [d.lon, d.lat],
                        getText: (d: GilCityRecord) => `${d.name}${d.capital ? " CAP" : ""}`,
                        getSize: (d: GilCityRecord) => d.tier >= 5 ? 12 : d.tier >= 4 ? 11 : 9,
                        getColor: (d: GilCityRecord) => d.tier >= 4 ? [254, 243, 199, 255] : [254, 202, 202, 255],
                        getPixelOffset: [0, -12],
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: "700",
                        fontSettings: { sdf: true },
                        outlineColor: [0, 0, 0, 255],
                        outlineWidth: 3,
                        sizeMinPixels: 7,
                        billboard: true,
                    }));
                }

                onGilCount?.(visible.length);
            }


            if (trackedId.current && pathPoints.current.length >= 2) {
                layers.push(new PathLayer({
                    id: "tracked-path",
                    data: [{ path: pathPoints.current }],
                    getPath: (d: any) => d.path,
                    getWidth: 2,
                    getColor: [56, 189, 248, 200],
                    widthMinPixels: 2,
                    capRounded: true,
                    jointRounded: true,
                }));
            }


            if (onWmCounts) {
                const newCounts: any = { conflicts: 0, wars: 0, civil_unrest: 0, violence: 0, humanitarian: 0, nuclear: 0, bases: 0, pipelines: 0, cables: 0, sanctions: 0 };
                if (wmFeedData.current?.counts) {
                    Object.assign(newCounts, wmFeedData.current.counts);
                } else if (wmGeoIntelData.current?.events) {
                    for (const ev of wmGeoIntelData.current.events) {
                        if (ev.layer_id === "conflicts" || ev.layer_id === "wars") { newCounts.conflicts++; if (ev.severity === "critical") newCounts.wars++; }
                        else if (ev.layer_id === "civil_unrest") newCounts.civil_unrest++;
                        else if (ev.layer_id === "violence") newCounts.violence++;
                        else if (ev.layer_id === "humanitarian") newCounts.humanitarian++;
                    }
                }
                if (!wmFeedData.current && wmInfraData.current) {
                    newCounts.nuclear = wmInfraData.current.nuclear?.length || 0;
                    newCounts.pipelines = wmInfraData.current.pipelines?.length || 0;
                    newCounts.cables = wmInfraData.current.cables?.length || 0;
                }
                if (!wmFeedData.current && wmMilitaryData.current) {
                    newCounts.bases = wmMilitaryData.current.bases?.length || 0;
                }
                if (!wmFeedData.current && wmSanctionsData.current) {
                    newCounts.sanctions = wmSanctionsData.current.sanctions?.length || 0;
                }
                const currentCountsStr = JSON.stringify(newCounts);
                if ((deckRef as any)._lastWmCounts !== currentCountsStr) {
                    (deckRef as any)._lastWmCounts = currentCountsStr;
                    setTimeout(() => onWmCounts(newCounts), 0);
                }
            }

            deck.setProps({ layers });
        };
        rebuildLayersRef.current = buildLayers;


        map.on("zoomend", () => buildLayers());


        const refreshFlights = async () => {
            if (layersRef.current["radar"] === false) { onRadarCount?.(0); return; }
            if (!airportsLoaded.current) void loadAirports();
            try {
                const activeFilter = radarFilterRef.current;
                const res = await fetch(`/api/radar?filter=${encodeURIComponent(activeFilter)}`, { cache: "no-store" });
                if (!res.ok) throw new Error("" + res.status);
                const data = (await res.json()) as TacticalResponse;
                if (activeFilter !== radarFilterRef.current) return;
                const flights = Array.isArray(data.flights) ? data.flights : [];
                const now = Date.now();
                onRadarCount?.(flights.length);
                for (const fl of flights) {
                    if (!fl.icao24) continue;
                    const lon = toNum(fl.longitude), lat = toNum(fl.latitude);
                    if (lon === null || lat === null) continue;
                    const id = "flight-" + fl.icao24;
                    fSeen.current.set(id, now);
                    fData.current.set(id, { ...fl, longitude: lon, latitude: lat, _drStartMs: now, _drIcon: resolveIcon(fl.modelType, fl.category, fl.onGround) });
                }
                // prune stale
                for (const [eid, ls] of fSeen.current.entries()) {
                    if (now - ls > FLIGHT_STALE_AFTER_MS) { fSeen.current.delete(eid); fData.current.delete(eid); }
                }
                fDataArr.current = Array.from(fData.current.values());
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] Radar:", err); }
        };

        const refreshQuakes = async () => {
            if (layersRef.current["usgs"] === false) { onUsgsCount?.(0); return; }
            try {
                const res = await fetch("/api/usgs", { cache: "no-store" });
                if (!res.ok) throw new Error("" + res.status);
                const data = (await res.json()) as UsgsResponse;
                const events = Array.isArray(data.events) ? data.events : [];
                onUsgsCount?.(events.length);
                qData.current = events;
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] USGS:", err); }
        };

        const refreshSigint = async () => {
            if (layersRef.current["sigint"] !== true) {
                sigintData.current = null;
                onSigintCount?.(0);
                onSigintData?.(null);
                return;
            }
            try {
                const res = await fetch("/api/sigint", { cache: "no-store" });
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json() as sigint_response;
                sigintData.current = data;
                onSigintCount?.(data.stats?.total ?? 0);
                onSigintData?.(data);
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] SIGINT:", err); }
        };

        const refreshGdacs = async () => {
            if (layersRef.current["gdacs"] !== true) { onGdacsCount?.(0); return; }
            try {
                const res = await fetch("/api/gdacs", { cache: "no-store" });
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json() as GdacsResponse;
                const events = Array.isArray(data.events) ? data.events : [];
                gdacsData.current = events.filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));
                onGdacsCount?.(gdacsData.current.length);
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] GDACS:", err); }
        };

        const refreshAirq = async () => {
            if (layersRef.current["airq"] !== true) { onAirqCount?.(0); return; }
            try {
                const res = await fetch("/api/air-quality", { cache: "no-store" });
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json() as AirQualityResponse;
                const points = Array.isArray(data.points) ? data.points : [];
                airqData.current = points.filter(d => Number.isFinite(d.lat) && Number.isFinite(d.lon));
                onAirqCount?.(airqData.current.length);
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] Air quality:", err); }
        };

        const rebuildSats = async () => {
            if (layersRef.current["tle"] === false) { sRecs.current = []; return; }
            try {
                const res = await fetch("/api/celestrak", { cache: "no-store" });
                if (!res.ok) throw new Error("" + res.status);
                const data = (await res.json()) as CelestrakResponse;
                const sats = Array.isArray(data.satellites) ? data.satellites.slice(0, 180) : [];
                const recs: SatelliteTrackRecord[] = [];
                const now = new Date();
                for (const tle of sats) {
                    try {
                        const sr = satellite.twoline2satrec(tle.line1, tle.line2);
                        if (sr.error !== satellite.SatRecError.None) continue;
                        const pos = satPos(sr, now);
                        if (!pos) continue;
                        const cls = classifySatellite(tle.name || "");
                        recs.push({ id: tle.id, name: tle.name, line1: tle.line1, line2: tle.line2, satrec: sr, ...cls, lat: pos.lat, lon: pos.lon });
                    } catch { /* skip malformed tle */ }
                }
                sRecs.current = recs;
                satsTickRef.current++;
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] Satellites:", err); }
        };

        const tickSats = () => {
            const now = new Date();
            const newRecs: SatelliteTrackRecord[] = [];
            for (const r of sRecs.current) {
                const p = satPos(r.satrec, now);
                if (p) { newRecs.push({ ...r, lat: p.lat, lon: p.lon }); }
                else { newRecs.push(r); }
            }
            sRecs.current = newRecs;
            satsTickRef.current++;
        };

        const refreshWmInfra = async () => {
            if (!wmLayersRef.current) return;
            try {
                const res = await fetch("/api/wm/infrastructure", { cache: "no-store" });
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json();
                wmInfraData.current = data;
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] WM Infra:", err); }
        };

        const refreshWmMilitary = async () => {
            if (!wmLayersRef.current) return;
            try {
                const res = await fetch("/api/wm/military", { cache: "no-store" });
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json();
                wmMilitaryData.current = data;
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] WM Military:", err); }
        };

        const refreshWmGeoIntel = async () => {
            if (!wmLayersRef.current) return;
            try {
                const res = await fetch("/api/geo-intelligence", { cache: "no-store" });
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json();
                wmGeoIntelData.current = data;
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] Geo Intel:", err); }
        };

        const refreshWmSanctions = async () => {
            if (!wmLayersRef.current) return;
            try {
                const res = await fetch("/api/wm/sanctions", { cache: "no-store" });
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json();
                wmSanctionsData.current = data;
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] WM Sanctions:", err); }
        };

        const refreshWmFeed = async () => {
            if (!wmLayersRef.current) return;
            try {
                const res = await fetch("/api/wm/geo-intelligence", { cache: "no-store" });
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json();
                wmFeedData.current = data;
                buildLayers();
            } catch (err) { console.warn("[WORLDVIEW] WM Unified:", err); }
        };

        let radio_refresh_generation = 0;
        const refreshRadio = async () => {
            if (layersRef.current["radio"] === false) { onRadioCount?.(0); return; }
            const generation = ++radio_refresh_generation;
            rData.current.clear();
            onRadioCount?.(0);
            buildLayers();
            const seen = new Set<string>();
            const identities = new Set<string>();
            const ingest = (stations: RadioStation[], max: number) => {
                if (generation !== radio_refresh_generation) return;
                let source_added = 0;
                for (const st of stations) {
                    const sid = String(st.id || "").trim();
                    const nm = String(st.name || "").trim();
                    const lat = Number(st.lat);
                    const lon = Number(st.lon);
                    if (!sid || seen.has(sid) || !nm || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
                    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
                    const identity = `${nm.toLowerCase().replace(/[^a-z0-9]+/g, "")}|${lat.toFixed(2)}|${lon.toFixed(2)}`;
                    if (identities.has(identity)) continue;
                    seen.add(sid);
                    identities.add(identity);
                    rData.current.set("radio-" + sid, { ...st, id: sid, name: nm.replace(/[\r\n\t]+/g, " ").slice(0, 56), lat, lon });
                    source_added++;
                    if (source_added >= max) break;
                }
                onRadioCount?.(rData.current.size);
                buildLayers();
            };
            const load_source = async (url: string, max: number) => {
                try {
                    const res = await fetch(url, { cache: "no-store" });
                    if (!res.ok) throw new Error(String(res.status));
                    const data = await res.json() as RadioResponse;
                    ingest(Array.isArray(data.stations) ? data.stations : [], max);
                } catch (err) {
                    console.warn("[WORLDVIEW] Radio source:", err);
                }
            };
            await Promise.allSettled([
                load_source("/api/radio?source=browser&limit=2700", 2700),
                load_source("/api/radio?source=garden&limit=1800&maxPlaces=420", 1800),
            ]);
        };

        const refreshCityIntel = async (city?: GilCityRecord | null) => {
            const target = city ?? gilSelectedCity.current;
            if (!target) {
                intelMarkers.current.forEach(m => m.remove());
                intelMarkers.current = [];
                cityIntelData.current = [];
                intelCityKey.current = "";
                rebuildLayersRef.current?.();
                return;
            }
            const nextKey = `${target.name}|${target.lat.toFixed(3)}`;
            if (intelCityKey.current === nextKey) return;
            intelCityKey.current = nextKey;
            try {
                const res = await fetch(`/api/city-intel/${encodeURIComponent(target.name)}?lat=${target.lat}&lng=${target.lon}`);
                if (!res.ok) throw new Error("intel fetch failed");
                const data = await res.json();

                intelMarkers.current.forEach(m => m.remove());
                intelMarkers.current = [];

                cityIntelData.current = data.markers || [];
                rebuildLayersRef.current?.();
            } catch (err) { console.warn("[WORLDVIEW] Intel:", err); }
        };

        const refreshCamerasForCity = async (city?: GilCityRecord | null) => { return; };

        const loadAirports = async () => {
            if (airportsLoaded.current) return;
            try {
                const res = await fetch("/airports.json");
                if (!res.ok) throw new Error("airports.json " + res.status);
                const data = (await res.json()) as Airport[];
                airportData.current = data.filter(a => a.iata && !isNaN(Number(a.lat)) && !isNaN(Number(a.lon)));
                airportsLoaded.current = true;
                buildLayers();
                console.log("[WORLDVIEW] Airports loaded:", airportData.current.length);
            } catch (err) { console.error("[WORLDVIEW] Airports:", err); }
        };

        const loadCities = async () => {
            if (gilLoaded.current) { buildLayers(); return; }
            try {
                const res = await fetch("/cities.json");
                if (!res.ok) throw new Error("cities.json " + res.status);
                const cities = (await res.json()) as GilCity[];
                const records: GilCityRecord[] = [];
                for (let i = 0; i < cities.length; i++) {
                    const raw = cities[i];
                    const lat = Number(raw.lat);
                    const lon = Number(raw.lon);
                    const pop = Math.max(0, Number(raw.pop) || 0);
                    if (!raw.name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
                    const tier = gilTierFor({ pop, capital: raw.capital === true });
                    records.push({
                        name: raw.name, country: raw.country || "Unknown", iso: raw.iso || "", lat, lon: ((lon + 540) % 360) - 180, pop, capital: raw.capital === true,
                        id: "gil-" + i, tier, score: tier * 100_000_000 + pop + (raw.capital ? 25_000_000 : 0),
                    });
                }
                records.sort((a, b) => b.score - a.score);
                onGilCount?.(records.length);
                gilCities.current = records;
                gilLoaded.current = true;
                buildLayers();
                console.log("[WORLDVIEW] GIL cities indexed:", records.length);
            } catch (err) { console.error("[WORLDVIEW] GIL cities:", err); }
        };

        const loadCountriesGeo = async () => {
            if (countriesGeoRef.current) return;
            try {
                const res = await fetch("/countries.geojson");
                if (res.ok) countriesGeoRef.current = await res.json();
            } catch (err) { console.error("[WORLDVIEW] countries.geojson:", err); }
        };


        const remove_weather_layer = (layer: string, source: string) => {
            if (map.getLayer(layer)) map.removeLayer(layer);
            if (map.getSource(source)) map.removeSource(source);
        };

        const clear_weather = () => {
            if (weatherFxTimer.current !== null) {
                window.clearInterval(weatherFxTimer.current);
                weatherFxTimer.current = null;
            }
            remove_weather_layer("rain-layer", "rain-tiles");
            remove_weather_layer("weather-field-layer", "weather-field");
            remove_weather_layer("weather-field-local-layer", "weather-field-local");
            remove_weather_layer("weather-map-dim-layer", "weather-map-dim");
            for (const segment of weather_canvas_segments) {
                remove_weather_layer(`weather-field-${segment.id}-layer`, `weather-field-${segment.id}`);
                weather_segment_canvases.current[segment.id] = null;
            }
            weatherWindParticles.current = [];
            weatherWindVectors.current = [];
            weatherGrid.current = null;
            weatherGridFetchedAt.current = 0;
            weatherFxCanvas.current = null;
            weatherBaseCanvas.current = null;
        };

        const ensure_weather_canvas = () => {
            const grid = weatherGrid.current;
            if (!grid) return null;
            let canvas = weatherFxCanvas.current;
            if (!canvas) {
                canvas = document.createElement("canvas");
                canvas.width = 1024;
                canvas.height = 640;
                weatherFxCanvas.current = canvas;
            }
            remove_weather_layer("weather-field-layer", "weather-field");
            if (!map.getSource("weather-map-dim")) {
                map.addSource("weather-map-dim", {
                    type: "geojson",
                    data: {
                        type: "Feature",
                        properties: {},
                        geometry: {
                            type: "Polygon",
                            coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]],
                        },
                    },
                });
            }
            if (!map.getLayer("weather-map-dim-layer")) {
                map.addLayer({
                    id: "weather-map-dim-layer",
                    type: "fill",
                    source: "weather-map-dim",
                    paint: {
                        "fill-color": "#020812",
                        "fill-opacity": weather_visuals.map_dim_opacity,
                    },
                });
            }
            const span = grid.bounds.east - grid.bounds.west;
            if (span < 300) {
                for (const segment of weather_canvas_segments) {
                    remove_weather_layer(`weather-field-${segment.id}-layer`, `weather-field-${segment.id}`);
                    weather_segment_canvases.current[segment.id] = null;
                }
                const coordinates = [
                    [grid.bounds.west, grid.bounds.north],
                    [grid.bounds.east, grid.bounds.north],
                    [grid.bounds.east, grid.bounds.south],
                    [grid.bounds.west, grid.bounds.south],
                ] as [[number, number], [number, number], [number, number], [number, number]];
                const source = map.getSource("weather-field-local") as maplibregl.CanvasSource | undefined;
                if (source) source.setCoordinates(coordinates);
                else map.addSource("weather-field-local", {
                    type: "canvas",
                    canvas,
                    animate: true,
                    coordinates,
                });
                if (!map.getLayer("weather-field-local-layer")) {
                    map.addLayer({
                        id: "weather-field-local-layer",
                        type: "raster",
                        source: "weather-field-local",
                        paint: { "raster-opacity": weather_visuals.field_opacity, "raster-fade-duration": 0 },
                    });
                }
            } else {
                remove_weather_layer("weather-field-local-layer", "weather-field-local");
                for (const segment of weather_canvas_segments) {
                    let segment_canvas = weather_segment_canvases.current[segment.id];
                    if (!segment_canvas) {
                        segment_canvas = document.createElement("canvas");
                        segment_canvas.width = canvas.width / 2;
                        segment_canvas.height = canvas.height;
                        weather_segment_canvases.current[segment.id] = segment_canvas;
                    }
                    const source_id = `weather-field-${segment.id}`;
                    const layer_id = `${source_id}-layer`;
                    if (!map.getSource(source_id)) {
                        map.addSource(source_id, {
                            type: "canvas",
                            canvas: segment_canvas,
                            animate: true,
                            coordinates: segment.coordinates.map(([lon, lat]) => [lon, lat]) as [[number, number], [number, number], [number, number], [number, number]],
                        });
                    }
                    if (!map.getLayer(layer_id)) {
                        map.addLayer({
                            id: layer_id,
                            type: "raster",
                            source: source_id,
                            paint: { "raster-opacity": weather_visuals.field_opacity, "raster-fade-duration": 0 },
                        });
                    }
                }
            }
            return canvas;
        };

        const sync_weather_segments = () => {
            const canvas = weatherFxCanvas.current;
            const grid = weatherGrid.current;
            if (!canvas || !grid) return;
            if (grid.bounds.east - grid.bounds.west < 300) {
                map.triggerRepaint();
                return;
            }
            for (const segment of weather_canvas_segments) {
                const segment_canvas = weather_segment_canvases.current[segment.id];
                const ctx = segment_canvas?.getContext("2d");
                if (!segment_canvas || !ctx) continue;
                const sx = Math.round(canvas.width * segment.start);
                const sw = Math.round(canvas.width * (segment.end - segment.start));
                ctx.clearRect(0, 0, segment_canvas.width, segment_canvas.height);
                ctx.drawImage(canvas, sx, 0, sw, canvas.height, 0, 0, segment_canvas.width, segment_canvas.height);
            }
        };

        const sync_weather_layers = () => {
            const mode = weatherModeRef.current;
            const visible = mode !== "radar";
            if (map.getLayer("weather-map-dim-layer")) {
                map.setPaintProperty("weather-map-dim-layer", "fill-opacity", visible ? weather_visuals.map_dim_opacity : 0);
            }
            if (map.getLayer("weather-field-local-layer")) {
                map.setPaintProperty("weather-field-local-layer", "raster-opacity", visible ? (mode === "precipitation" ? weather_visuals.precipitation_opacity : weather_visuals.field_opacity) : 0);
            }
            for (const segment of weather_canvas_segments) {
                const layer_id = `weather-field-${segment.id}-layer`;
                if (map.getLayer(layer_id)) {
                    map.setPaintProperty(layer_id, "raster-opacity", visible ? (mode === "precipitation" ? weather_visuals.precipitation_opacity : weather_visuals.field_opacity) : 0);
                }
            }
            if (map.getLayer("rain-layer")) {
                const opacity = mode === "radar" ? weather_visuals.radar_opacity : mode === "precipitation" ? 0.2 : 0;
                map.setPaintProperty("rain-layer", "raster-opacity", opacity);
            }
        };

        const grid_vector = (row: number, col: number) => {
            const grid = weatherGrid.current;
            if (!grid) return null;
            return weatherWindVectors.current[row * grid.cols + col] || null;
        };

        const sample_weather = (lat: number, lon: number) => {
            const grid = weatherGrid.current;
            if (!grid) return null;
            const { bounds, cols, rows } = grid;
            if (lon < bounds.west || lon > bounds.east || lat < bounds.south || lat > bounds.north) return null;
            const x = (lon - bounds.west) / (bounds.east - bounds.west) * (cols - 1);
            const y = (bounds.north - lat) / (bounds.north - bounds.south) * (rows - 1);
            const col0 = Math.max(0, Math.min(cols - 1, Math.floor(x)));
            const row0 = Math.max(0, Math.min(rows - 1, Math.floor(y)));
            const col1 = Math.min(cols - 1, col0 + 1);
            const row1 = Math.min(rows - 1, row0 + 1);
            const fx = x - col0;
            const fy = y - row0;
            const a = grid_vector(row0, col0);
            const b = grid_vector(row0, col1) || a;
            const c = grid_vector(row1, col0) || a;
            const d = grid_vector(row1, col1) || b || c || a;
            if (!a) return null;
            const mix = (key: keyof weather_vector) => {
                const av = Number(a[key]) || 0;
                const bv = Number((b || a)[key]) || av;
                const cv = Number((c || a)[key]) || av;
                const dv = Number((d || b || c || a)[key]) || av;
                const top = av + (bv - av) * fx;
                const bottom = cv + (dv - cv) * fx;
                return top + (bottom - top) * fy;
            };
            return {
                ...a,
                u_ms: mix("u_ms"),
                v_ms: mix("v_ms"),
                speed_kmh: mix("speed_kmh"),
                gust_kmh: mix("gust_kmh"),
                temperature_c: mix("temperature_c"),
                humidity_pct: mix("humidity_pct"),
                pressure_hpa: mix("pressure_hpa"),
                precipitation_mm: mix("precipitation_mm"),
                cloud_cover_pct: mix("cloud_cover_pct"),
            };
        };

        const render_weather_base = () => {
            const mode = weatherModeRef.current;
            const canvas = ensure_weather_canvas();
            const grid = weatherGrid.current;
            if (!canvas || !grid) return;
            let base = weatherBaseCanvas.current;
            if (!base) {
                base = document.createElement("canvas");
                base.width = canvas.width;
                base.height = canvas.height;
                weatherBaseCanvas.current = base;
            }
            const ctx = base.getContext("2d");
            if (!ctx) return;
            const w = base.width;
            const h = base.height;
            ctx.clearRect(0, 0, w, h);
            if (mode === "radar") return;
            const step = 3;
            for (let y = 0; y < h; y += step) {
                const lat = grid.bounds.north - ((y + step / 2) / h) * (grid.bounds.north - grid.bounds.south);
                for (let x = 0; x < w; x += step) {
                    const lon = grid.bounds.west + ((x + step / 2) / w) * (grid.bounds.east - grid.bounds.west);
                    const sample = sample_weather(lat, lon);
                    if (!sample) continue;
                    const value = weather_value(mode, sample);
                    const [r, g, b] = weather_color(mode, value, 255);
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect(x, y, step, step);
                }
            }
        };

        const draw_weather_frame = () => {
            const canvas = weatherFxCanvas.current;
            const base = weatherBaseCanvas.current;
            const grid = weatherGrid.current;
            if (!canvas || !base || !grid) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);
            ctx.filter = `blur(${weather_field_blur_px}px)`;
            ctx.drawImage(base, -weather_field_blur_px, -weather_field_blur_px, w + weather_field_blur_px * 2, h + weather_field_blur_px * 2);
            ctx.filter = "none";
            const mode = weatherModeRef.current;
            if (mode !== "wind" && mode !== "wind_gusts") {
                sync_weather_segments();
                map.triggerRepaint();
                return;
            }
            const particles = weatherWindParticles.current;
            while (particles.length < weather_visuals.particle_count) {
                particles.push({ x: Math.random() * w, y: Math.random() * h, age: Math.floor(Math.random() * 140), ttl: 70 + Math.floor(Math.random() * 150) });
            }
            ctx.lineCap = "round";
            ctx.shadowColor = "rgba(196,238,255,0.55)";
            ctx.shadowBlur = 2;
            for (const p of particles) {
                if (p.age > p.ttl) {
                    p.x = Math.random() * w;
                    p.y = Math.random() * h;
                    p.age = 0;
                    p.ttl = 70 + Math.floor(Math.random() * 150);
                    continue;
                }
                const lat = grid.bounds.north - (p.y / h) * (grid.bounds.north - grid.bounds.south);
                const lon = grid.bounds.west + (p.x / w) * (grid.bounds.east - grid.bounds.west);
                const v = sample_weather(lat, lon);
                if (!v) {
                    p.age = p.ttl + 1;
                    continue;
                }
                const ox = p.x;
                const oy = p.y;
                const amp = mode === "wind_gusts" ? Math.max(1, v.gust_kmh / Math.max(1, v.speed_kmh)) : 1;
                const dx = (v.u_ms || 0) * weather_visuals.particle_flow_scale * amp;
                const dy = -(v.v_ms || 0) * weather_visuals.particle_flow_scale * amp;
                const x_step = weather_particle_x(p.x, dx, w);
                const y_step = weather_particle_y(p.y, dy, h, Math.random() * h);
                p.x = x_step.x;
                p.y = y_step.y;
                p.age++;
                if (x_step.wrapped || y_step.reset) {
                    p.age = 0;
                    continue;
                }
                const mag = Math.min(1, (mode === "wind_gusts" ? v.gust_kmh : v.speed_kmh) / 120);
                const alpha = weather_visuals.particle_alpha_min + mag * (weather_visuals.particle_alpha_max - weather_visuals.particle_alpha_min);
                ctx.strokeStyle = `rgba(242,251,255,${alpha})`;
                ctx.lineWidth = weather_visuals.particle_width_min + mag * (weather_visuals.particle_width_max - weather_visuals.particle_width_min);
                ctx.beginPath();
                ctx.moveTo(ox - dx * weather_visuals.particle_trail, oy - dy * weather_visuals.particle_trail);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            sync_weather_segments();
            map.triggerRepaint();
        };

        let weather_request_seq = 0;
        const refreshWeather = async () => {
            if (layersRef.current["noaa"] !== true) {
                clear_weather();
                return;
            }
            const mode = weatherModeRef.current;
            const needs_field = mode !== "radar";
            if (needs_field) {
                const bounds = map.getBounds();
                const current = weatherGrid.current;
                const view_span = bounds.getEast() - bounds.getWest();
                const grid_span = current ? current.bounds.east - current.bounds.west : Infinity;
                const covered = !!current
                    && bounds.getWest() >= current.bounds.west
                    && bounds.getEast() <= current.bounds.east
                    && bounds.getSouth() >= current.bounds.south
                    && bounds.getNorth() <= current.bounds.north;
                const detailed = grid_span <= Math.max(1, view_span) * 1.8;
                const fresh = Date.now() - weatherGridFetchedAt.current < 8 * 60_000;
                if (!covered || !detailed || !fresh) {
                    const params = new URLSearchParams();
                    params.set("west", String(bounds.getWest()));
                    params.set("south", String(bounds.getSouth()));
                    params.set("east", String(bounds.getEast()));
                    params.set("north", String(bounds.getNorth()));
                    params.set("zoom", String(map.getZoom()));
                    const seq = ++weather_request_seq;
                    try {
                        const res = await fetch(`/api/wind?${params.toString()}`, { cache: "no-store" });
                        if (res.ok) {
                            const data = await res.json() as { grid?: weather_grid; vectors?: weather_vector[] };
                            if (seq !== weather_request_seq || !data.grid) return;
                            const rows = Array.isArray(data.vectors) ? data.vectors : [];
                            weatherWindVectors.current = rows.filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lon) && Number.isFinite(v.speed_kmh));
                            weatherGrid.current = data.grid;
                            weatherGridFetchedAt.current = Date.now();
                            weatherWindParticles.current = [];
                        }
                    } catch (err) { console.warn("[WORLDVIEW] weather grid:", err); }
                    if (seq !== weather_request_seq) return;
                    if (!weatherGrid.current || weatherWindVectors.current.length === 0) {
                        sync_weather_layers();
                        return;
                    }
                }
            }
            if (needs_field) {
                render_weather_base();
                draw_weather_frame();
            }
            if (mode === "wind" || mode === "wind_gusts") {
                if (weatherFxTimer.current === null) weatherFxTimer.current = window.setInterval(draw_weather_frame, 45);
            } else if (weatherFxTimer.current !== null) {
                window.clearInterval(weatherFxTimer.current);
                weatherFxTimer.current = null;
            }
            if (mode === "radar" || mode === "precipitation") {
                try {
                    const center = map.getCenter();
                    const res = await fetch(`/api/weather?lat=${center.lat.toFixed(4)}&lon=${center.lng.toFixed(4)}`, { cache: "no-store" });
                    if (res.ok) {
                        const data = await res.json() as { tileTemplate?: string };
                        if (data.tileTemplate) {
                            remove_weather_layer("rain-layer", "rain-tiles");
                            map.addSource("rain-tiles", { type: "raster", tiles: [data.tileTemplate], tileSize: 256 });
                            map.addLayer({ id: "rain-layer", type: "raster", source: "rain-tiles", paint: { "raster-opacity": 0 } });
                        }
                    }
                } catch (err) { console.warn("[WORLDVIEW] weather radar:", err); }
            }
            sync_weather_layers();
            rebuildLayersRef.current?.();
        };

        let weather_view_timer: number | null = null;
        const refresh_weather_view = () => {
            const mode = weatherModeRef.current;
            if (layersRef.current["noaa"] !== true || mode === "radar") return;
            if (weather_view_timer !== null) window.clearTimeout(weather_view_timer);
            weather_view_timer = window.setTimeout(() => {
                weather_view_timer = null;
                void refreshWeather();
            }, 450);
        };
        map.on("moveend", refresh_weather_view);


        refreshRadarNowRef.current = () => { void refreshFlights(); };
        refreshUsgsNowRef.current = () => { void refreshQuakes(); };
        refreshTleNowRef.current = () => { void rebuildSats(); };
        refreshRadioNowRef.current = () => { void refreshRadio(); };
        refreshCameraNowRef.current = () => { void refreshCamerasForCity(); };
        refreshWeatherNowRef.current = () => { void refreshWeather(); };
        refreshSigintNowRef.current = () => { void refreshSigint(); };
        refreshGdacsNowRef.current = () => { void refreshGdacs(); };
        refreshAirqNowRef.current = () => { void refreshAirq(); };
        refreshGilNowRef.current = () => { void loadCities(); };
        refreshWmInfraNowRef.current = () => { void refreshWmInfra(); };
        refreshWmMilitaryNowRef.current = () => { void refreshWmMilitary(); };
        refreshWmGeoIntelNowRef.current = () => { void refreshWmGeoIntel(); };
        refreshWmFeedNowRef.current = () => { void refreshWmFeed(); };


        map.on("load", () => {
            syncDeck();
            reportView();
            void refreshFlights();
            void refreshQuakes();
            void refreshRadio();
            void rebuildSats();
            void refreshWeather();
            void refreshSigint();
            void refreshGdacs();
            void refreshAirq();
            void loadCountriesGeo();
            if (enabledLayers["gil"] === true) void loadCities();


            if (wmLayersRef.current && Object.values(wmLayersRef.current).some(Boolean)) void refreshWmFeed();
        });


        const tmrs = timersRef.current;
        tmrs.radar = window.setInterval(() => { void refreshFlights(); }, RADAR_REFRESH_MS);
        tmrs.usgs = window.setInterval(() => { void refreshQuakes(); }, USGS_REFRESH_MS);
        tmrs.radioRefresh = window.setInterval(() => { void refreshRadio(); }, RADIO_REFRESH_MS);
        tmrs.satelliteCatalog = window.setInterval(() => { void rebuildSats(); }, SATELLITE_CATALOG_REFRESH_MS);
        tmrs.satelliteTick = null;
        tmrs.weatherRefresh = window.setInterval(() => { void refreshWeather(); }, WEATHER_REFRESH_MS);
        tmrs.sigintRefresh = window.setInterval(() => { void refreshSigint(); }, SIGINT_REFRESH_MS);
        tmrs.gdacsRefresh = window.setInterval(() => { void refreshGdacs(); }, GDACS_REFRESH_MS);
        tmrs.airqRefresh = window.setInterval(() => { void refreshAirq(); }, AIRQ_REFRESH_MS);
        tmrs.flightTick = window.setInterval(() => { flightAnimationTick.current++; tickSats(); rebuildLayersRef.current?.(); }, 1000);


        const recordPath = () => {
            if (!trackedId.current) return;
            const fl = fData.current.get(trackedId.current);
            if (!fl) return;
            const { lat, lon } = rendered_flight_position(fl);
            pathPoints.current.push([lon, lat]);
            if (pathPoints.current.length > PATH_MAX_POINTS) pathPoints.current.shift();
            buildLayers();
        };
        pathTimer.current = window.setInterval(recordPath, PATH_RECORD_INTERVAL_MS);


        return () => {

            if (trackingFrame) cancelAnimationFrame(trackingFrame);
            if (pathTimer.current !== null) window.clearInterval(pathTimer.current);
            if (tmrs.radar !== null) window.clearInterval(tmrs.radar);
            if (tmrs.usgs !== null) window.clearInterval(tmrs.usgs);
            if (tmrs.satelliteCatalog !== null) window.clearInterval(tmrs.satelliteCatalog);
            if (tmrs.satelliteTick !== null) window.clearInterval(tmrs.satelliteTick);
            if (tmrs.radioRefresh !== null) window.clearInterval(tmrs.radioRefresh);
            if (tmrs.weatherRefresh !== null) window.clearInterval(tmrs.weatherRefresh);
            if (tmrs.sigintRefresh !== null) window.clearInterval(tmrs.sigintRefresh);
            if (tmrs.gdacsRefresh !== null) window.clearInterval(tmrs.gdacsRefresh);
            if (tmrs.airqRefresh !== null) window.clearInterval(tmrs.airqRefresh);
            if (weatherFxTimer.current !== null) window.clearInterval(weatherFxTimer.current);
            if (weather_view_timer !== null) window.clearTimeout(weather_view_timer);
            map.off("moveend", refresh_weather_view);
            refreshRadarNowRef.current = null;
            refreshUsgsNowRef.current = null;
            refreshTleNowRef.current = null;
            refreshRadioNowRef.current = null;
            refreshCameraNowRef.current = null;
            refreshWeatherNowRef.current = null;
            refreshSigintNowRef.current = null;
            refreshGdacsNowRef.current = null;
            refreshAirqNowRef.current = null;
            refreshGilNowRef.current = null;
            refreshWmInfraNowRef.current = null;
            refreshWmMilitaryNowRef.current = null;
            refreshWmGeoIntelNowRef.current = null;
            refreshWmSanctionsNowRef.current = null;
            refreshWmFeedNowRef.current = null;
            rebuildLayersRef.current = null;
            if (deckRef.current) { deckRef.current.finalize(); deckRef.current = null; }
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };

    }, []);


    useEffect(() => {
        if (!mapRef.current || !deckRef.current) return;
        const map = mapRef.current;
        const updateProj = () => {
            if (isGlobe) {
                map.setProjection({ type: "globe" });
                deckRef.current?.setProps({ views: [new _GlobeView()] });
            } else {
                map.setProjection({ type: "mercator" });
                deckRef.current?.setProps({ views: [new MapView({ repeat: true })] });
            }
        };
        if (map.isStyleLoaded()) updateProj();
        else map.once("styledata", updateProj);
    }, [isGlobe]);


    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const updateKarta = () => {
            if (!map.getSource("kartaview")) {
                map.addSource("kartaview", {
                    type: "raster",
                    tiles: ["https://api.openstreetcam.org/2.0/sequence/tiles/{z}/{x}/{y}.png"],
                    tileSize: 256,
                });
            }
            if (!map.getLayer("kartaview-lines")) {
                map.addLayer({
                    id: "kartaview-lines",
                    type: "raster",
                    source: "kartaview",
                    paint: {
                        "raster-opacity": streetViewMode ? 0.8 : 0
                    },
                });
            } else {
                map.setPaintProperty("kartaview-lines", "raster-opacity", streetViewMode ? 0.8 : 0);
            }
        };
        if (map.isStyleLoaded()) updateKarta();
        else map.once("styledata", updateKarta);
    }, [streetViewMode]);


    const styleFilter = activeStyle === "crt"
        ? "saturate(1.15) contrast(1.35) brightness(0.92)"
        : activeStyle === "nightvision"
            ? "grayscale(1) sepia(1) hue-rotate(60deg) saturate(4.5) brightness(1.28) contrast(1.18)"
            : activeStyle === "thermal"
                ? "grayscale(1) contrast(1.7) brightness(1.12)"
                : activeStyle === "radar"
                    ? "grayscale(1) sepia(1) hue-rotate(70deg) saturate(6) brightness(0.42) contrast(1.5)"
                    : activeStyle === "satcom"
                        ? "saturate(0.82) contrast(1.3) brightness(1.03)"
                        : activeStyle === "noir"
                            ? "grayscale(1) contrast(1.6) brightness(0.98)"
                            : "none";

    const NOISE_URL = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

    return (
        <div className="absolute inset-0 w-full h-full bg-black" style={{ filter: selectedPano ? "none" : styleFilter }}>
            <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }} />
            <div className="absolute inset-0 pointer-events-none map-grid opacity-30" />

            {snapshot && (
                <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/85 p-6 backdrop-blur-md" onClick={() => setSnapshot(null)}>
                    <div className="relative flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-stone-950/95 shadow-[0_30px_120px_rgba(0,0,0,0.75)]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                            <div className="flex items-center gap-3">
                                <span className="flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
                                <div>
                                    <div className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.24em] text-cyan-200">Recon Snapshot</div>
                                    <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-amber-300/80">TOP SECRET // SI-TK // NOFORN</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={snapshot.url}
                                    download={`akashic_snapshot_${Date.now()}.png`}
                                    className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-4 py-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-500/25"
                                >
                                    Download PNG
                                </a>
                                <button
                                    onClick={() => setSnapshot(null)}
                                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-stone-300 transition-colors hover:bg-white/10"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="relative flex-1 overflow-hidden bg-black">
                            <img src={snapshot.url} alt="Recon snapshot" className="max-h-[70vh] w-full object-contain" />
                            <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 120px rgba(0,0,0,0.55)" }} />
                            <div className="pointer-events-none absolute left-4 top-4 h-6 w-6 border-l border-t border-cyan-300/70" />
                            <div className="pointer-events-none absolute right-4 top-4 h-6 w-6 border-r border-t border-cyan-300/70" />
                            <div className="pointer-events-none absolute bottom-4 left-4 h-6 w-6 border-b border-l border-cyan-300/70" />
                            <div className="pointer-events-none absolute bottom-4 right-4 h-6 w-6 border-b border-r border-cyan-300/70" />
                            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="h-10 w-10 rounded-full border border-cyan-300/50" />
                                <div className="absolute left-1/2 top-1/2 h-8 w-px -translate-x-1/2 -translate-y-1/2 bg-cyan-300/40" />
                                <div className="absolute left-1/2 top-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 bg-cyan-300/40" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 border-t border-white/10 px-5 py-3 font-mono text-[0.58rem] text-stone-300 sm:grid-cols-4">
                            <div><span className="text-stone-500">SNAPSHOT</span> <span className="text-emerald-400">· OK</span></div>
                            <div><span className="text-stone-500">UTC</span> {snapshot.utc}</div>
                            <div><span className="text-stone-500">MGRS</span> {snapshot.mgrs}</div>
                            <div><span className="text-stone-500">STYLE</span> {snapshot.style.toUpperCase()}</div>
                            <div><span className="text-stone-500">LAT</span> {snapshot.lat.toFixed(4)}</div>
                            <div><span className="text-stone-500">LON</span> {snapshot.lon.toFixed(4)}</div>
                            <div><span className="text-stone-500">ALT</span> {snapshot.altKm.toLocaleString()} KM</div>
                            <div><span className="text-stone-500">ZOOM</span> {snapshot.zoom}</div>
                        </div>
                    </div>
                </div>
            )}

            {selectedPano && (
                <div className="absolute inset-0 z-[130] flex flex-col bg-black">
                    <div className="flex items-center justify-between border-b border-violet-400/25 bg-stone-950/95 px-5 py-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-violet-400/50 bg-violet-500/15 text-violet-200">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><ellipse cx="12" cy="12" rx="10" ry="4.2" /><ellipse cx="12" cy="12" rx="4.2" ry="10" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /></svg>
                            </span>
                            <div>
                                <div className="font-mono text-[0.72rem] font-bold uppercase tracking-[0.22em] text-violet-100">{selectedPano.title}</div>
                                <div className="font-mono text-[0.5rem] uppercase tracking-[0.2em] text-violet-300/70">360° Panorama · 360Cities</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={selectedPano.pageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-stone-300 transition-colors hover:bg-white/10"
                            >
                                Open ↗
                            </a>
                            <button
                                onClick={() => setSelectedPano(null)}
                                className="flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-4 py-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-violet-200 transition-colors hover:bg-violet-500/25"
                            >
                                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                Close
                            </button>
                        </div>
                    </div>
                    <iframe
                        key={selectedPano.handle}
                        src={selectedPano.embedUrl}
                        title={selectedPano.title}
                        className="h-full w-full flex-1 border-0 bg-black"
                        allow="accelerometer; gyroscope; fullscreen; xr-spatial-tracking"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </div>
            )}

            <style>{`
                @keyframes sweep { 100% { transform: rotate(360deg); } }
                .animate-sweep { animation: sweep 3.2s linear infinite; }
                @keyframes fx-flicker { 0%,100% { opacity: 0.9; } 47% { opacity: 0.82; } 52% { opacity: 1; } 70% { opacity: 0.86; } }
                @keyframes fx-scan-roll { 0% { background-position-y: 0; } 100% { background-position-y: 100px; } }
                @keyframes fx-satzoom { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.035); opacity: 1; } }
                @keyframes fx-blip { 0% { opacity: 1; transform: translate(-50%,-50%) scale(1); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(2.4); } }
                @keyframes fx-reticle { 0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.85; } 50% { transform: translate(-50%,-50%) scale(1.12); opacity: 1; } }
                @keyframes fx-reticle-spin { 100% { transform: translate(-50%,-50%) rotate(360deg); } }
            `}</style>

            { }
            <div ref={flightHudRef} className="pointer-events-none absolute left-0 top-0 z-[70]" style={{ opacity: 0, transition: "opacity 180ms ease-out", willChange: "transform" }}>
                <div className="absolute rounded-full border border-cyan-300/70" style={{ width: 96, height: 96, left: 0, top: 0, transform: "translate(-50%,-50%)", boxShadow: "0 0 22px rgba(34,211,238,0.55), inset 0 0 18px rgba(34,211,238,0.28)", animation: "fx-reticle 2.4s ease-in-out infinite" }} />
                <div className="absolute rounded-full border border-dashed border-cyan-200/50" style={{ width: 128, height: 128, left: 0, top: 0, transform: "translate(-50%,-50%)", animation: "fx-reticle-spin 14s linear infinite" }} />
                <div className="absolute bg-cyan-300/80" style={{ width: 1, height: 16, left: 0, top: 0, transform: "translate(-50%,-64px)" }} />
                <div className="absolute bg-cyan-300/80" style={{ width: 1, height: 16, left: 0, top: 0, transform: "translate(-50%,48px)" }} />
                <div className="absolute bg-cyan-300/80" style={{ width: 16, height: 1, left: 0, top: 0, transform: "translate(-64px,-50%)" }} />
                <div className="absolute bg-cyan-300/80" style={{ width: 16, height: 1, left: 0, top: 0, transform: "translate(48px,-50%)" }} />
                <div className="absolute left-0 top-0" style={{ transform: "translate(-50%,-96px)" }}>
                    <span ref={flightHudTextRef} className="whitespace-nowrap rounded-full border border-cyan-300/50 bg-stone-950/85 px-3 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.4)] backdrop-blur-md" />
                </div>
            </div>

            { }
            {(activeStyle === "crt" || activeStyle === "nightvision") && (
                <div className="absolute inset-0 pointer-events-none" style={{
                    zIndex: 4,
                    background: "repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.16) 2px, rgba(0,0,0,0.16) 3px)",
                    backgroundSize: "100% 3px",
                    mixBlendMode: "multiply",
                    animation: "fx-scan-roll 8s linear infinite",
                }} />
            )}

            { }
            {activeStyle !== "standard" && (
                <div className="absolute inset-0 pointer-events-none" style={{
                    zIndex: 5,
                    background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,0,0.55) 100%)",
                }} />
            )}

            { }
            {activeStyle === "crt" && (
                <>
                    <div className="absolute inset-0 pointer-events-none" style={{
                        zIndex: 6,
                        boxShadow: "inset 0 0 140px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,0.6)",
                        background: "radial-gradient(circle at 50% 42%, rgba(120,180,255,0.06), transparent 55%)",
                    }} />
                    <div className="absolute inset-0 pointer-events-none" style={{
                        zIndex: 6,
                        mixBlendMode: "screen",
                        opacity: 0.35,
                        background: "linear-gradient(90deg, rgba(255,0,64,0.10) 0%, transparent 6%, transparent 94%, rgba(0,200,255,0.10) 100%)",
                        animation: "fx-flicker 5s steps(60) infinite",
                    }} />
                </>
            )}

            { }
            {activeStyle === "nightvision" && (
                <>
                    <div className="absolute inset-0 pointer-events-none" style={{
                        zIndex: 5,
                        background: "radial-gradient(circle at center, rgba(0,255,120,0.10) 0%, rgba(0,40,0,0.55) 100%)",
                        mixBlendMode: "screen",
                    }} />
                    <div className="absolute inset-0 pointer-events-none" style={{
                        zIndex: 5,
                        opacity: 0.22,
                        mixBlendMode: "overlay",
                        backgroundImage: NOISE_URL,
                        backgroundSize: "180px 180px",
                    }} />
                </>
            )}

            { }
            {activeStyle === "thermal" && (
                <>
                    <div className="absolute inset-0 pointer-events-none" style={{
                        zIndex: 5,
                        opacity: 0.16,
                        mixBlendMode: "overlay",
                        backgroundImage: NOISE_URL,
                        backgroundSize: "220px 220px",
                    }} />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 6 }}>
                        <div className="border border-white/40 rounded-full" style={{ width: 42, height: 42 }} />
                        <div className="absolute bg-white/40" style={{ width: 1, height: 72 }} />
                        <div className="absolute bg-white/40" style={{ width: 72, height: 1 }} />
                    </div>
                </>
            )}

            { }
            {activeStyle === "radar" && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden" style={{ zIndex: 5 }}>
                    { }
                    <div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, rgba(2,10,4,0) 39vmin, rgba(2,10,4,0.92) 41vmin)" }} />
                    { }
                    <div className="relative rounded-full" style={{ width: "80vmin", height: "80vmin", border: "1px solid rgba(34,197,94,0.55)", boxShadow: "inset 0 0 70px rgba(34,197,94,0.22), 0 0 46px rgba(34,197,94,0.16)" }}>
                        { }
                        <div className="absolute inset-0 rounded-full" style={{ backgroundImage: "repeating-radial-gradient(circle at center, rgba(34,197,94,0) 0, rgba(34,197,94,0) 9.6%, rgba(34,197,94,0.26) 10%, rgba(34,197,94,0) 10.4%)" }} />
                        { }
                        <div className="absolute inset-0 rounded-full" style={{ background: "repeating-conic-gradient(from 0deg, rgba(134,239,172,0.45) 0deg 0.4deg, transparent 0.4deg 5deg)", WebkitMaskImage: "radial-gradient(circle, transparent 46%, #000 47%, #000 50%, transparent 51%)", maskImage: "radial-gradient(circle, transparent 46%, #000 47%, #000 50%, transparent 51%)" }} />
                        { }
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2" style={{ width: 1, background: "rgba(34,197,94,0.32)" }} />
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2" style={{ height: 1, background: "rgba(34,197,94,0.32)" }} />
                        <div className="absolute rounded-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: "50%", height: "50%", border: "1px solid rgba(34,197,94,0.28)" }} />
                        { }
                        <div className="absolute inset-0 rounded-full animate-sweep" style={{ background: "conic-gradient(from 0deg, rgba(74,222,128,0.55) 0deg, rgba(34,197,94,0.16) 22deg, rgba(34,197,94,0) 70deg, rgba(34,197,94,0) 360deg)" }} />
                        { }
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: 7, height: 7, background: "rgba(190,242,180,0.95)", boxShadow: "0 0 10px rgba(34,197,94,0.95)" }} />
                    </div>
                    { }
                    <div className="absolute font-mono uppercase tracking-[0.3em]" style={{ left: "50%", top: "calc(50% - 42vmin)", transform: "translate(-50%,-50%)", color: "rgba(134,239,172,0.85)", fontSize: "0.6rem" }}>PPI · SCAN 30 RPM · RNG 80NM</div>
                </div>
            )}

            { }
            {activeStyle === "satcom" && (
                <>
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5, opacity: 0.12, mixBlendMode: "overlay", backgroundImage: NOISE_URL, backgroundSize: "200px 200px" }} />
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5, background: "radial-gradient(circle at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 100%)", boxShadow: "inset 0 0 180px rgba(0,0,0,0.55)", animation: "fx-satzoom 6s ease-in-out infinite" }} />
                    <div className="absolute pointer-events-none" style={{ zIndex: 6, inset: "5vmin" }}>
                        { }
                        <div className="absolute top-0 left-0" style={{ width: 34, height: 34, borderTop: "2px solid rgba(125,211,252,0.85)", borderLeft: "2px solid rgba(125,211,252,0.85)" }} />
                        <div className="absolute top-0 right-0" style={{ width: 34, height: 34, borderTop: "2px solid rgba(125,211,252,0.85)", borderRight: "2px solid rgba(125,211,252,0.85)" }} />
                        <div className="absolute bottom-0 left-0" style={{ width: 34, height: 34, borderBottom: "2px solid rgba(125,211,252,0.85)", borderLeft: "2px solid rgba(125,211,252,0.85)" }} />
                        <div className="absolute bottom-0 right-0" style={{ width: 34, height: 34, borderBottom: "2px solid rgba(125,211,252,0.85)", borderRight: "2px solid rgba(125,211,252,0.85)" }} />
                        { }
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: "22vmin", height: "22vmin", border: "1px solid rgba(125,211,252,0.4)" }} />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-300/70" style={{ width: 1, height: "12vmin" }} />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-sky-300/70" style={{ height: 1, width: "12vmin" }} />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/80" style={{ width: 14, height: 14 }} />
                    </div>
                    <div className="absolute pointer-events-none font-mono uppercase" style={{ zIndex: 7, left: "6vmin", top: "6vmin", color: "rgba(186,230,253,0.9)", fontSize: "0.58rem", letterSpacing: "0.18em", lineHeight: 1.7 }}>
                        <div className="text-amber-300/90">TOP SECRET // SI-TK // NOFORN</div>
                        <div>SATCOM · KH-11 · OPS-4117</div>
                        <div>TRACK · ZOOM ACTIVE</div>
                    </div>
                    <div className="absolute pointer-events-none font-mono uppercase" style={{ zIndex: 7, right: "6vmin", bottom: "6vmin", color: "rgba(186,230,253,0.9)", fontSize: "0.55rem", letterSpacing: "0.16em", lineHeight: 1.7, textAlign: "right" }}>
                        <div>GSD 0.24M · NIIRS 7.0</div>
                        <div>REC ● BAND PAN · LVL 1A</div>
                    </div>
                </>
            )}

            { }
            {activeStyle === "noir" && (
                <>
                    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5, opacity: 0.18, mixBlendMode: "overlay", backgroundImage: NOISE_URL, backgroundSize: "200px 200px" }} />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden" style={{ zIndex: 6 }}>
                        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 bg-white/45" style={{ width: 1 }} />
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-white/45" style={{ height: 1 }} />
                        <div className="rounded-full border border-white/55" style={{ width: 140, height: 140 }} />
                        <div className="absolute rounded-full border border-white/25" style={{ width: 260, height: 260 }} />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/70" style={{ width: 2, height: 18 }} />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/70" style={{ height: 2, width: 18 }} />
                        <div className="absolute left-1/2 -translate-x-1/2 bg-white/50" style={{ top: "calc(50% - 70px)", width: 1, height: 12 }} />
                        <div className="absolute left-1/2 -translate-x-1/2 bg-white/50" style={{ top: "calc(50% + 58px)", width: 1, height: 12 }} />
                        <div className="absolute top-1/2 -translate-y-1/2 bg-white/50" style={{ left: "calc(50% - 70px)", height: 1, width: 12 }} />
                        <div className="absolute top-1/2 -translate-y-1/2 bg-white/50" style={{ left: "calc(50% + 58px)", height: 1, width: 12 }} />
                    </div>
                </>
            )}

            {streetViewMode && (
                <div className="absolute bottom-16 left-[28rem] w-96 h-96 rounded-lg shadow-2xl border border-slate-600 overflow-hidden z-50">
                    <StreetViewMap
                        initialLat={streetViewPos.lat}
                        initialLon={streetViewPos.lon}
                    />
                </div>
            )}
        </div>
    );
}
