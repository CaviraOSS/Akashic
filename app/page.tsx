"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";
import dynamic from "next/dynamic";
import FlightDetailsSidebar from "@/components/sidebars/FlightDetailsSidebar";
import AirportDetailsSidebar from "@/components/sidebars/AirportDetailsSidebar";
import SatelliteDetailsSidebar from "@/components/sidebars/SatelliteDetailsSidebar";
import QuakeDetailsSidebar from "@/components/sidebars/QuakeDetailsSidebar";
import RadioDetailsSidebar from "@/components/sidebars/RadioDetailsSidebar";
import CameraDetailsSidebar from "@/components/sidebars/CameraDetailsSidebar";
import CityDetailsSidebar from "@/components/sidebars/CityDetailsSidebar";
import IntelDetailsSidebar from "@/components/sidebars/IntelDetailsSidebar";
import BuildingDetailsSidebar from "@/components/sidebars/BuildingDetailsSidebar";
import { ReconModePanel } from "@/components/intelligence/ReconModePanel";
import CountryDashboard from "@/components/intelligence/CountryDashboard";
import WorldMonitorDeck, { DEFAULT_WM_LAYERS, type world_monitor_layer_id, type world_monitor_layer_state } from "@/components/layout/WorldMonitorDeck";
import { DashboardWorkspace } from "@/components/layout/DashboardWorkspace";
import type { TacticalFlight, TacticalSatellite, TacticalQuake, TacticalRadio, TacticalPositionFix, GlobeUiCommand, TacticalViewMetrics, GilCity, TacticalCityIntel, tactical_sigint_selection, sigint_filters, sigint_response, radar_filter } from "@/components/map/MapGlobe";
import type { TacticalCamera } from "@/lib/live/cameras";
import type { recon_map_point } from "@/lib/recon/core";

import { BottomIntelligenceDeck } from "@/components/layout/BottomIntelligenceDeck";
import type { geo_intel_feed_response } from "@/lib/geo-intelligence/types";
import { WeatherMapControls } from "@/components/map/WeatherMapControls";
import { weather_default_mode, type weather_mode } from "@/lib/weather/map-core";

const MapGlobe = dynamic(() => import("@/components/map/MapGlobe"), { ssr: false });

const DEFAULT_LAYERS: Record<string, boolean> = {
    radar: false,
    usgs: false,
    sigint: false,
    tle: false,
    noaa: false,
    radio: false,
    gdacs: false,
    airq: false,
    camera: false,
    recon: false,
    gil: false,
};

const TABS = ["Overview", "Intelligence", "Signals", "Assets"];
const RADAR_FILTERS: Array<{ id: radar_filter; label: string; sub: string }> = [
    { id: "all", label: "global", sub: "all aircraft" },
    { id: "mil", label: "military", sub: "defense traffic" },
    { id: "ladd", label: "ladd", sub: "blocked list" },
    { id: "pia", label: "pia", sub: "private aircraft" },
];

const STYLE_OPTIONS = [
    { id: "standard", label: "STD" },
    { id: "crt", label: "CRT" },
    { id: "nightvision", label: "NVG" },
    { id: "thermal", label: "FLIR" },
    { id: "radar", label: "RADAR" },
    { id: "satcom", label: "SATCOM" },
    { id: "noir", label: "NOIR" },
];

const IMAGERY_CATALOG = [
    { id: "aerial_labels", label: "Aerial+Labels", sub: "Satellite + city borders", swatch: "linear-gradient(135deg,#0d3260 0%,#1a6080 60%,#0a2840 100%)", badge: "ION", badgeCls: "text-cyan-400" },
    { id: "aerial", label: "Satellite", sub: "Pure orbital imagery", swatch: "linear-gradient(135deg,#0a2a18 0%,#145028 60%,#083820 100%)", badge: "ION", badgeCls: "text-cyan-400" },
    { id: "streetside", label: "Street Side", sub: "Esri street cartography", swatch: "linear-gradient(135deg,#2f2520 0%,#5a4940 60%,#312820 100%)", badge: "ESRI", badgeCls: "text-amber-400" },
    { id: "light_gray", label: "Light Gray", sub: "CartoDB clean basemap", swatch: "linear-gradient(135deg,#555 0%,#888 60%,#666 100%)", badge: "CARTO", badgeCls: "text-slate-300" },
    { id: "dark", label: "Dark Matter", sub: "CartoDB dark political", swatch: "linear-gradient(135deg,#0c1020 0%,#141828 60%,#080c18 100%)", badge: "CARTO", badgeCls: "text-purple-400" },
    { id: "terrain_topo", label: "Topographic", sub: "Esri elevation contours", swatch: "linear-gradient(135deg,#1a3010 0%,#2a4818 60%,#102408 100%)", badge: "ESRI", badgeCls: "text-amber-400" },
    { id: "natgeo", label: "National Geo", sub: "NatGeo cartographic", swatch: "linear-gradient(135deg,#3a2808 0%,#504020 60%,#2c2008 100%)", badge: "ESRI", badgeCls: "text-amber-400" },
    { id: "nightlights", label: "Night Lights", sub: "NASA VIIRS city glow", swatch: "linear-gradient(135deg,#08050a 0%,#1a0828 60%,#0c0414 100%)", badge: "NASA", badgeCls: "text-orange-400" },
    { id: "hybrid", label: "Hybrid", sub: "Satellite + boundaries", swatch: "linear-gradient(135deg,#0f2840 0%,#1c3850 60%,#0a2030 100%)", badge: "ESRI", badgeCls: "text-amber-400" },
    { id: "3d_imagery", label: "3D Imagery", sub: "Photorealistic 3D tiles", swatch: "linear-gradient(135deg,#1a2840 0%,#2850a0 60%,#1a3060 100%)", badge: "3D", badgeCls: "text-sky-400" },
];

function hashCode(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function satelliteImageFor(sat: TacticalSatellite | null): string {
    if (!sat) return "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=960&q=80";
    const n = sat.name.toUpperCase();
    if (n.includes("STARLINK")) return "https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=960&q=80";
    if (n.includes("ISS") || n.includes("ZARYA") || n.includes("TIANGONG")) return "https://images.unsplash.com/photo-1454789548928-9efd52dc4031?auto=format&fit=crop&w=960&q=80";
    if (sat.category === "weather") return "https://images.unsplash.com/photo-1508349937151-22b68b72d5b1?auto=format&fit=crop&w=960&q=80";
    return "https://images.unsplash.com/photo-1446776709462-d6b525c57bd3?auto=format&fit=crop&w=960&q=80";
}

function flightImageFor(flight: TacticalFlight | null): string {
    if (!flight) return "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=960&q=80";
    if (flight.category === "MILITARY") return "https://images.unsplash.com/photo-1569629743817-70d8db6c323b?auto=format&fit=crop&w=960&q=80";
    if (flight.onGround) return "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=960&q=80";
    return "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=960&q=80";
}

function fmtCoord(v: number, lat = true): string {
    const abs = Math.abs(v);
    const d = Math.floor(abs);
    const mFloat = (abs - d) * 60;
    const m = Math.floor(mFloat);
    const s = ((mFloat - m) * 60).toFixed(2).padStart(5, "0");
    const hemi = lat ? (v >= 0 ? "N" : "S") : (v >= 0 ? "E" : "W");
    return `${d}B0${String(m).padStart(2, "0")}'${s}" ${hemi}`;
}

function nowUtcIsoShort(date: Date | null): string {
    if (!date) return "---- -- -- --:--:--Z";
    return date.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

type IntelHeader = {
    title: string;
    threat: string;
    signal: string;
    alt: string;
    image: string;
};

export default function Home() {
    const [activeStyle, setActiveStyle] = useState("standard");
    const [activeImagery, setActiveImagery] = useState<string>("dark");
    const [isGlobe, setIsGlobe] = useState(false);
    const [dashboardMode, setDashboardMode] = useState(false);
    const [geoIntelData, setGeoIntelData] = useState<geo_intel_feed_response | null>(null);
    const [geoIntelLoading, setGeoIntelLoading] = useState(false);
    const [streetViewMode, setStreetViewMode] = useState(false);
    const [showImageryPicker, setShowImageryPicker] = useState(false);
    const [viewMetrics, setViewMetrics] = useState<TacticalViewMetrics>({ cameraKm: 27643, scaleKm: 5000 });
    const [enabledLayers, setEnabledLayers] = useState<Record<string, boolean>>(DEFAULT_LAYERS);
    const [radarFilter, setRadarFilter] = useState<radar_filter>("all");
    const [weatherMode, setWeatherMode] = useState<weather_mode>(weather_default_mode);
    const [activeTab, setActiveTab] = useState("Overview");
    const [globeCommand, setGlobeCommand] = useState<GlobeUiCommand | null>(null);
    const [clock, setClock] = useState<Date | null>(null);
    const [worldMonitorLayers, setWorldMonitorLayers] = useState<world_monitor_layer_state>(DEFAULT_WM_LAYERS);
    const [wmCounts, setWmCounts] = useState<Partial<Record<world_monitor_layer_id, number>>>({});
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedFlight, setSelectedFlight] = useState<TacticalFlight | null>(null);
    const [selectedAirport, setSelectedAirport] = useState<any | null>(null);
    const [selectedSatellite, setSelectedSatellite] = useState<TacticalSatellite | null>(null);
    const [selectedQuake, setSelectedQuake] = useState<TacticalQuake | null>(null);
    const [selectedRadio, setSelectedRadio] = useState<TacticalRadio | null>(null);
    const [selectedCamera, setSelectedCamera] = useState<TacticalCamera | null>(null);
    const [selectedIntel, setSelectedIntel] = useState<TacticalCityIntel | null>(null);
    const [selectedSigint, setSelectedSigint] = useState<tactical_sigint_selection | null>(null);
    const [selectedCity, setSelectedCity] = useState<GilCity | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [selectedBuilding, setSelectedBuilding] = useState<{ lat: number, lon: number, name?: string } | null>(null);

    const [radarCount, setRadarCount] = useState(0);
    const [usgsCount, setUsgsCount] = useState(0);
    const [radioCount, setRadioCount] = useState(0);
    const [reconCount, setReconCount] = useState(0);
    const [reconLocations, setReconLocations] = useState<recon_map_point[]>([]);
    const [sigintCount, setSigintCount] = useState(0);
    const [gdacsCount, setGdacsCount] = useState(0);
    const [airqCount, setAirqCount] = useState(0);
    const [sigintData, setSigintData] = useState<sigint_response | null>(null);
    const [sigintFilters, setSigintFilters] = useState<sigint_filters>({
        tab: "overview",
        severity: "low",
        confidence: 0,
        evidence: "all",
        cells: true,
        points: true,
        labels: true,
    });
    const [gilCount, setGilCount] = useState(0);
    const [positionFix, setPositionFix] = useState<TacticalPositionFix | null>(null);

    const nodeRefFlight = useRef(null);
    const nodeRefAirport = useRef(null);
    const nodeRefSatellite = useRef(null);
    const nodeRefQuake = useRef(null);
    const nodeRefRadio = useRef(null);
    const nodeRefIntel = useRef(null);
    const nodeRefSigint = useRef(null);
    const nodeRefCity = useRef(null);
    const nodeRefBuilding = useRef(null);
    const commandIdRef = useRef(1);

    useEffect(() => {
        const timer = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (enabledLayers.gil) {
            setGeoIntelLoading(true);
            fetch("/api/geo-intelligence")
                .then(r => r.json())
                .then(data => {
                    setGeoIntelData(data);
                    setGeoIntelLoading(false);
                })
                .catch(() => setGeoIntelLoading(false));
        }
    }, [enabledLayers.gil]);

    const handleCitySelect = useCallback((city: GilCity | null) => {
        setSelectedCity(city);
        setSelectedCamera(null);
        setSelectedIntel(null);
        if (city) setStreetViewMode(true);
    }, []);

    const handleViewMetrics = useCallback((metrics: TacticalViewMetrics) => {
        setViewMetrics((prev) => (
            prev.cameraKm === metrics.cameraKm && prev.scaleKm === metrics.scaleKm ? prev : metrics
        ));
    }, []);

    const handleToggleLayer = (id: string) => {
        setEnabledLayers((prev) => {
            const next = { ...prev, [id]: !prev[id] };

            if (id === "gil" && !next["gil"]) {
                setWorldMonitorLayers(DEFAULT_WM_LAYERS);
            }
            return next;
        });
    };

    const handleToggleWmLayer = (id: world_monitor_layer_id) => {
        setWorldMonitorLayers((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const worldMonitorActive = enabledLayers.gil === true && Object.values(worldMonitorLayers).some(Boolean);

    const runCommand = (type: Exclude<GlobeUiCommand["type"], "flyTo">) => {
        setGlobeCommand({ id: commandIdRef.current++, type } as GlobeUiCommand);
    };

    const applyTabPreset = (tab: string) => {
        setActiveTab(tab);
        if (tab === "Overview") {
            setEnabledLayers(prev => ({ ...prev, radar: true, gil: true }));
        } else if (tab === "Intelligence") {
            setEnabledLayers(prev => ({ ...prev, radar: true, gil: true, camera: true, sigint: true }));
        } else if (tab === "Signals") {
            setEnabledLayers(prev => ({ ...prev, radio: true, radar: true, sigint: true }));
        } else if (tab === "Assets") {
            setEnabledLayers(prev => ({ ...prev, tle: true, usgs: true, noaa: true }));
        }
        setStreetViewMode(false);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        const q = searchQuery.trim().toLowerCase();


        const [adsbRes, tleRes, usgsRes, radioRes, nomRes] = await Promise.allSettled([
            fetch(`https://api.adsb.lol/v2/callsign/${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : null),
            fetch('/api/celestrak').then(r => r.ok ? r.json() : null),
            fetch('/api/usgs').then(r => r.ok ? r.json() : null),
            fetch(`/api/radio?q=${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : null),
            fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, { headers: { "User-Agent": "Akashic/1.0" } }).then(r => r.ok ? r.json() : null)
        ]);

        try {

            if (adsbRes.status === 'fulfilled' && adsbRes.value?.ac?.length > 0) {
                const ac = adsbRes.value.ac[0];
                const lat = typeof ac.lat === 'number' ? ac.lat : null;
                const lon = typeof ac.lon === 'number' ? ac.lon : null;
                if (lat !== null && lon !== null) {
                    const flight: TacticalFlight = {
                        icao24: ac.hex?.toLowerCase() || "",
                        callsign: (ac.flight || ac.hex || "").trim(),
                        registration: ac.r || null,
                        modelType: ac.t || null,
                        description: ac.desc || null,
                        squawk: ac.squawk || null,
                        category: ac._cat || "COMMERCIAL",
                        longitude: lon,
                        latitude: lat,
                        baroAltitude: ac.alt_baro === "ground" ? 0 : (ac.alt_baro || null),
                        velocity: ac.gs || null,
                        trueTrack: ac.track || null,
                        verticalRate: ac.baro_rate || null,
                        onGround: ac.alt_baro === "ground",
                        lastContact: ac.seen || null,
                    };
                    setSelectedFlight(flight);
                    setGlobeCommand({ id: commandIdRef.current++, type: "flyTo", lat, lon, altitude: 20000 });
                    setIsSearchOpen(false);
                    setSearchQuery("");
                    return;
                }
            }

            // Priority 2: Satellite (Celestrak)
            if (tleRes.status === 'fulfilled' && tleRes.value?.satellites) {
                const sat = tleRes.value.satellites.find((s: any) => s.name.toLowerCase().includes(q));
                if (sat) {
                    const tacticalSat: TacticalSatellite = {
                        id: sat.id || sat.name,
                        name: sat.name,
                        line1: sat.line1,
                        line2: sat.line2,
                        category: "unknown",
                        operator: null,
                        purpose: null
                    };
                    setSelectedSatellite(tacticalSat);
                    setGlobeCommand({ id: commandIdRef.current++, type: "focusSelection" });
                    setIsSearchOpen(false);
                    setSearchQuery("");
                    return;
                }
            }

            // Priority 3: Earthquake (USGS)
            if (usgsRes.status === 'fulfilled' && usgsRes.value?.events) {
                const eq = usgsRes.value.events.find((e: any) => e.title?.toLowerCase().includes(q) || e.place?.toLowerCase().includes(q));
                if (eq) {
                    setSelectedQuake(eq);
                    setGlobeCommand({ id: commandIdRef.current++, type: "flyTo", lat: eq.latitude, lon: eq.longitude, altitude: 80000 });
                    setIsSearchOpen(false);
                    setSearchQuery("");
                    return;
                }
            }

            // Priority 4: Radio Station
            if (radioRes.status === 'fulfilled' && radioRes.value?.stations?.length > 0) {
                const rad = radioRes.value.stations[0];
                setSelectedRadio(rad);
                setGlobeCommand({ id: commandIdRef.current++, type: "flyTo", lat: rad.lat, lon: rad.lon, altitude: 50000 });
                setIsSearchOpen(false);
                setSearchQuery("");
                return;
            }

            // Priority 5: Nominatim (Cities, Buildings, everything else)
            if (nomRes.status === 'fulfilled' && nomRes.value?.length > 0) {
                const data = nomRes.value;
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                setGlobeCommand({ id: commandIdRef.current++, type: "flyTo", lat, lon, altitude: 5000 });


                if (data[0].class === 'building' || data[0].class === 'amenity' || data[0].class === 'tourism' || data[0].class === 'historic') {
                    setSelectedBuilding({ lat, lon, name: data[0].name || "Unknown Building" });
                } else if (data[0].class === 'place' && (data[0].type === 'city' || data[0].type === 'town')) {
                    setSelectedCity({ lat, lon, name: data[0].name, country: "", pop: 0, iso: "", capital: false });
                }

                setIsSearchOpen(false);
                setSearchQuery("");
                return;
            }

        } catch (err) {
            console.error("Search processing failed:", err);
        }

        // If nothing matches
        setIsSearchOpen(false);
        setSearchQuery("");
    };

    const layerGroups = useMemo(
        () => [
            {
                id: "airspace",
                title: "Airspace + Orbit",
                sub: "moving assets",
                accent: "cyan",
                layers: [
                    { id: "radar", title: "Global Air Traffic", sub: `${radarCount.toLocaleString()} aircraft`, unit: "ADS-B" },
                    { id: "tle", title: "Satellite TLE", sub: "orbital objects tracking", unit: "CelesTrak" },
                ],
            },
            {
                id: "earth",
                title: "Earth Systems",
                sub: "hazards, weather, air",
                accent: "amber",
                layers: [
                    { id: "usgs", title: "USGS Seismic", sub: `${usgsCount.toLocaleString()} earthquake events`, unit: "USGS" },
                    { id: "noaa", title: "Weather", sub: `live ${weatherMode.replace(/_/g, " ")} map`, unit: "NOAA" },
                    { id: "gdacs", title: "GDACS Alerts", sub: `${gdacsCount.toLocaleString()} disaster alerts`, unit: "GDACS" },
                    { id: "airq", title: "Air Quality", sub: `${airqCount.toLocaleString()} sampled cities`, unit: "Open-Meteo" },
                ],
            },
            {
                id: "signals",
                title: "Signals + Public Web",
                sub: "broadcasts, intercepts, recon",
                accent: "emerald",
                layers: [
                    { id: "sigint", title: "SIGINT Intercepts", sub: sigintData ? `${sigintCount.toLocaleString()} signals · ${sigintData.degraded ? "degraded" : "live public"}` : "public signal intelligence", unit: "SIGINT" },
                    { id: "radio", title: "Radio Garden", sub: `${radioCount.toLocaleString()} stations`, unit: "Radio" },
                    { id: "recon", title: "Recon Mode", sub: `${reconCount.toLocaleString()} hits · ${reconLocations.length.toLocaleString()} mapped`, unit: "OSINT" },
                ],
            },
            {
                id: "world",
                title: "World Intelligence",
                sub: "cities, countries, monitor layers",
                accent: "stone",
                layers: [
                    { id: "gil", title: "Geo-Intelligence", sub: `${gilCount.toLocaleString()} strategic nodes`, unit: "World Monitor" },
                    { id: "camera", title: "City Cameras", sub: selectedCity ? `${selectedCity.name} public camera sweep` : "select a city to scope cameras", unit: "Webcams" },
                ],
            },
        ],
        [airqCount, gdacsCount, gilCount, radarCount, radioCount, reconCount, reconLocations.length, selectedCity, sigintCount, sigintData, usgsCount, weatherMode],
    );

    const streamCount = layerGroups.reduce((sum, group) => sum + group.layers.length, 0);
    const activeStreamCount = Object.values(enabledLayers).filter(Boolean).length;

    const camKm = Math.max(0.1, viewMetrics.cameraKm);
    const scaleLabel = viewMetrics.scaleKm >= 1
        ? `${Math.round(viewMetrics.scaleKm).toLocaleString()} KM`
        : `${Math.max(20, Math.round(viewMetrics.scaleKm * 1000)).toLocaleString()} M`;
    const handleStreetViewPick = useCallback((_url: string) => { }, []);
    const localTime = clock ? clock.toLocaleTimeString("en-US", { hour12: false }) : "--:--:--";
    const utcTime = clock ? clock.toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" }) : "--:--:--";
    const dayLabel = clock ? clock.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric", weekday: "long" }) : "--";
    const latLabel = positionFix ? fmtCoord(positionFix.lat, true) : "33B042'14.80\" N";
    const lonLabel = positionFix ? fmtCoord(positionFix.lon, false) : "28B050'06.34\" W";

    const tabSummary = activeTab === "Overview"
        ? "all systems idle. enable data layers to begin live ingest."
        : activeTab === "Intelligence"
            ? `geoint feed active: ${radarCount.toLocaleString()} flights · ${sigintCount.toLocaleString()} signals.`
            : activeTab === "Signals"
                ? `signal mode active: ${sigintCount.toLocaleString()} measured signals · ${radioCount.toLocaleString()} public broadcasts.`
                : "assets mode active: satellite and weather layers prioritized.";

    const isSatelliteMode = activeTab === "Assets" || enabledLayers.tle === true;
    const showSatelliteOverlay = isSatelliteMode && !!selectedSatellite;
    const isAircraftMode = activeTab === "Intelligence" || enabledLayers.radar === true;
    const showAircraftOverlay = !showSatelliteOverlay && isAircraftMode && !!selectedFlight;
    const showTrackingOverlay = showSatelliteOverlay || showAircraftOverlay;

    const satMetrics = useMemo(() => {
        if (!selectedSatellite) return null;
        const seed = hashCode(selectedSatellite.id + selectedSatellite.name);
        const altKm = 320 + (seed % 420) + ((seed % 100) / 100);
        const tempC = -25 + (seed % 90) / 2;
        const signalDbm = -95 + (seed % 24);
        const freqGhz = 10.7 + ((seed % 45) / 10);
        return {
            altKm: altKm.toFixed(2),
            tempC: tempC.toFixed(1),
            signalDbm: signalDbm.toFixed(0),
            freqGhz: freqGhz.toFixed(1),
        };
    }, [selectedSatellite]);

    const flightMetrics = useMemo(() => {
        if (!selectedFlight) return null;
        const speedKts = selectedFlight.velocity ? Math.round(selectedFlight.velocity * 1.94384) : 0;
        const altFt = selectedFlight.baroAltitude ? Math.max(0, Math.round(selectedFlight.baroAltitude / 0.3048)) : 0;
        const altKm = (altFt * 0.0003048).toFixed(2);
        const tempC = altFt > 0 ? Math.max(-58, 14 - altFt * 0.0017).toFixed(1) : "19.0";
        const signalDbm = (-72 - Math.min(28, Math.floor(speedKts / 35))).toFixed(0);
        const freqGhz = (10.5 + ((hashCode(selectedFlight.icao24 || selectedFlight.callsign || "flt") % 32) / 10)).toFixed(1);
        return { altKm, tempC, signalDbm, freqGhz };
    }, [selectedFlight]);

    const intelHeader = useMemo<IntelHeader>(() => {
        if (showSatelliteOverlay && selectedSatellite) {
            return {
                title: `SATELLITE TRACK: ${selectedSatellite.name}`,
                threat: "81 / 100",
                signal: satMetrics ? `${Math.max(90, 100 + Number(satMetrics.signalDbm) / 2).toFixed(2)}%` : "96.40%",
                alt: satMetrics ? `${Math.round(Number(satMetrics.altKm))} km` : "542 km",
                image: satelliteImageFor(selectedSatellite),
            };
        }
        if (selectedFlight) {
            return {
                title: `FLIGHT-Anomaly: ${selectedFlight.callsign || selectedFlight.icao24}`,
                threat: "94 / 100",
                signal: "99.96%",
                alt: selectedFlight.baroAltitude ? `${Math.round((selectedFlight.baroAltitude / 0.3048) / 1000)}k ft` : "35k ft",
                image: flightImageFor(selectedFlight),
            };
        }
        if (selectedQuake) {
            return {
                title: `SEISMIC Event: ${selectedQuake.mag !== null ? `M${selectedQuake.mag.toFixed(1)}` : "Unknown"}`,
                threat: `${Math.min(99, Math.max(8, selectedQuake.significance ?? 42))} / 100`,
                signal: `${Math.max(78, Math.min(99.9, (selectedQuake.cdi ?? 6) * 10)).toFixed(2)}%`,
                alt: `${Math.max(0, Math.round(selectedQuake.depth_km ?? 0))} km depth`,
                image: "https://images.unsplash.com/photo-1462524500090-89443873e2b4?auto=format&fit=crop&w=1200&q=80",
            };
        }
        if (selectedSigint) {
            if (selectedSigint.type === "cell") {
                const c = selectedSigint.data;
                return {
                    title: `signal cell: ${c.id}`,
                    threat: `${c.degraded_pct.toFixed(1)}% degraded`,
                    signal: `${c.confidence}%`,
                    alt: `${c.aircraft_count} aircraft`,
                    image: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?auto=format&fit=crop&w=1200&q=80",
                };
            }
            const s = selectedSigint.data;
            return {
                title: `signal anomaly: ${s.title}`,
                threat: s.severity,
                signal: `${s.confidence}%`,
                alt: s.callsign || s.aircraft,
                image: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?auto=format&fit=crop&w=1200&q=80",
            };
        }
        if (selectedRadio) {
            return {
                title: `public broadcast: ${selectedRadio.name}`,
                threat: "public",
                signal: selectedRadio.online ? "live" : "delayed",
                alt: selectedRadio.codec || (selectedRadio.bitrate ? `${selectedRadio.bitrate} kbps` : "stream"),
                image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
            };
        }
        if (selectedCamera) {
            return {
                title: `CAMERA Source: ${selectedCamera.name}`,
                threat: "42 / 100",
                signal: selectedCamera.status === "active" ? "LIVE" : "DELAYED",
                alt: selectedCamera.distanceKm != null ? `${selectedCamera.distanceKm.toFixed(1)} km` : "city",
                image: selectedCamera.thumbnailUrl || "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80",
            };
        }
        return {
            title: "FLIGHT-Anomaly: AA198",
            threat: "94 / 100",
            signal: "99.96%",
            alt: "35k ft",
            image: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200",
        };
    }, [satMetrics, selectedCamera, selectedFlight, selectedQuake, selectedRadio, selectedSatellite, selectedSigint, showSatelliteOverlay]);

    const mapElement = (
        <MapGlobe
            isGlobe={isGlobe}
            activeStyle={activeStyle}
            activeImagery={activeImagery}
            streetViewMode={streetViewMode}
            enabledLayers={enabledLayers}
            radarFilter={radarFilter}
            reconLocations={reconLocations}
            weatherMode={weatherMode}
            sigintFilters={sigintFilters}
            uiCommand={globeCommand}
            onFlightSelect={setSelectedFlight}
            onAirportSelect={setSelectedAirport}
            onSatelliteSelect={setSelectedSatellite}
            onQuakeSelect={setSelectedQuake}
            onRadioSelect={setSelectedRadio}
            onCameraSelect={setSelectedCamera}
            onIntelSelect={setSelectedIntel}
            onSigintSelect={setSelectedSigint}
            onSigintData={setSigintData}
            onRadarCount={setRadarCount}
            onUsgsCount={setUsgsCount}
            onRadioCount={setRadioCount}
            onSigintCount={setSigintCount}
            onGdacsCount={setGdacsCount}
            onAirqCount={setAirqCount}
            onCitySelect={handleCitySelect}
            onCountrySelect={setSelectedCountry}
            onGilCount={setGilCount}
            onPositionFix={setPositionFix}
            onViewMetrics={handleViewMetrics}
            onStreetViewPick={handleStreetViewPick}
            worldMonitorLayers={worldMonitorLayers}
            onWmCounts={setWmCounts}
            onBuildingSelect={setSelectedBuilding}
        />
    );

    if (dashboardMode) {
        return (
            <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-stone-300">
                <DashboardWorkspace onClose={() => setDashboardMode(false)}>
                    {mapElement}
                </DashboardWorkspace>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-stone-300">
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(8,145,178,0.17),transparent_45%),radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.14),transparent_45%),linear-gradient(to_bottom,rgba(0,0,0,0.25),rgba(0,0,0,0.65))]" />

                <div className="absolute inset-0">
                    {mapElement}
                </div>

                {enabledLayers.noaa === true && (
                    <WeatherMapControls
                        mode={weatherMode}
                        on_mode={setWeatherMode}
                        on_close={() => setEnabledLayers((prev) => ({ ...prev, noaa: false }))}
                    />
                )}

                {enabledLayers.sigint === true && (
                    <section className="pointer-events-auto fixed left-[28rem] top-[5.5rem] z-30 w-[24rem] rounded-2xl border border-cyan-400/15 bg-stone-950/85 p-4 text-stone-200 shadow-[0_20px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.24em] text-cyan-300">public signal intelligence</p>
                                <h2 className="mt-1 text-lg font-semibold text-white">{sigintCount.toLocaleString()} signals</h2>
                                <p className="text-xs text-stone-400">
                                    {sigintData ? `${sigintData.stats.active_cells.toLocaleString()} cells · ${sigintData.stats.affected_aircraft.toLocaleString()} affected aircraft` : "waiting for live ingest"}
                                </p>
                            </div>
                            <button
                                onClick={() => setEnabledLayers((prev) => ({ ...prev, sigint: false }))}
                                className="rounded-full border border-white/10 px-2 py-1 text-xs text-stone-400 hover:border-cyan-300/40 hover:text-cyan-200"
                            >
                                close
                            </button>
                        </div>

                        <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl border border-white/5 bg-black/35 p-1">
                            {(["overview", "navigation", "transponder", "space"] as sigint_filters["tab"][]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setSigintFilters((prev) => ({ ...prev, tab }))}
                                    className={`rounded-lg px-2 py-1.5 text-[0.58rem] font-bold uppercase tracking-wider transition ${sigintFilters.tab === tab ? "bg-cyan-400/20 text-cyan-100" : "text-stone-500 hover:text-stone-200"}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center">
                            {[
                                ["critical", sigintData?.stats.critical ?? 0],
                                ["high", sigintData?.stats.high ?? 0],
                                ["nav", sigintData?.stats.navigation ?? 0],
                                ["xpdr", sigintData?.stats.transponder ?? 0],
                            ].map(([label, value]) => (
                                <div key={label} className="rounded-xl border border-white/5 bg-black/35 p-2">
                                    <p className="font-mono text-sm font-bold text-white">{Number(value).toLocaleString()}</p>
                                    <p className="mt-1 text-[0.55rem] uppercase tracking-widest text-stone-500">{label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            {(["low", "medium", "high", "critical"] as sigint_filters["severity"][]).map((severity) => (
                                <button
                                    key={severity}
                                    onClick={() => setSigintFilters((prev) => ({ ...prev, severity }))}
                                    className={`rounded-full border px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider ${sigintFilters.severity === severity ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100" : "border-white/10 text-stone-500 hover:text-stone-200"}`}
                                >
                                    {severity}
                                </button>
                            ))}
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-[0.65rem] text-stone-300">
                            {(["cells", "points", "labels"] as const).map((key) => (
                                <label key={key} className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-black/25 px-2 py-2">
                                    <input
                                        type="checkbox"
                                        checked={sigintFilters[key]}
                                        onChange={() => setSigintFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
                                    />
                                    {key}
                                </label>
                            ))}
                        </div>

                        <div className="mt-3 rounded-xl border border-white/5 bg-black/25 p-3">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <p className="text-stone-500">space weather</p>
                                    <p className="mt-1 text-white">r{sigintData?.context?.space_weather?.radio_scale ?? 0} · s{sigintData?.context?.space_weather?.solar_scale ?? 0} · g{sigintData?.context?.space_weather?.geomagnetic_scale ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500">gnss sats</p>
                                    <p className="mt-1 text-white">{(sigintData?.context?.constellations?.systems || []).reduce((a, b) => a + b.count, 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500">aviation reports</p>
                                    <p className="mt-1 text-white">{(sigintData?.context?.aviation || []).length.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-stone-500">news refs</p>
                                    <p className="mt-1 text-white">{(sigintData?.context?.news || []).length.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 max-h-32 overflow-auto rounded-xl border border-white/5 bg-black/25 p-2">
                            {(sigintData?.sources || []).slice(0, 8).map((src) => (
                                <div key={src.id || src.label} className="flex items-center justify-between gap-2 border-b border-white/5 py-1.5 last:border-0">
                                    <span className="truncate text-xs text-stone-300">{src.label || src.id}</span>
                                    <span className={`rounded-full px-2 py-0.5 font-mono text-[0.55rem] ${src.state === "live" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
                                        {src.state}
                                    </span>
                                </div>
                            ))}
                            {!sigintData && <p className="py-2 text-xs text-stone-500">loading public sources...</p>}
                        </div>
                    </section>
                )}

                {enabledLayers.recon === true && (
                    <ReconModePanel
                        onClose={() => setEnabledLayers((prev) => ({ ...prev, recon: false }))}
                        onFoundCount={setReconCount}
                        onLocations={setReconLocations}
                        stacked={enabledLayers.sigint === true}
                    />
                )}


                <div className="pointer-events-none fixed left-4 top-4 z-30 flex h-[calc(100svh-2rem)] w-[26rem] flex-col p-0">
                    <aside className="pointer-events-auto h-full p-0">
                        <div className="flex h-full flex-col rounded-2xl border border-white/5 bg-stone-950/45 p-4 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                            <div className="mb-4 rounded-2xl border border-white/5 bg-stone-950/50 p-2">
                                <div className="relative mb-3 h-32 w-full rounded-[calc(1rem-0.5rem)] border border-white/5 bg-cover bg-center grayscale" style={{ backgroundImage: `url(${intelHeader.image})` }}>
                                    <div className="absolute inset-0 rounded-[calc(1rem-0.5rem)] bg-emerald-900/20 mix-blend-overlay" />
                                    <span className="absolute bottom-2 right-2 rounded border border-emerald-500/20 bg-black/80 px-2 py-1 font-mono text-[10px] text-emerald-400">{nowUtcIsoShort(clock)}</span>
                                </div>
                                <div className="px-2 pb-2">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-medium">
                                        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,1)]" />
                                        <span className="tracking-wide text-stone-200">{intelHeader.title}</span>
                                    </div>
                                    <div className="flex justify-between px-1 text-xs font-medium text-stone-400">
                                        <span>Threat: <span className="text-emerald-400">{intelHeader.threat}</span></span>
                                        <span>Signal: <span className="text-emerald-400">{intelHeader.signal}</span></span>
                                        <span>Alt: <span className="text-emerald-400">{intelHeader.alt}</span></span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-3 grid grid-cols-3 gap-2">
                                <div className="rounded-xl border border-white/5 bg-black/25 px-3 py-2">
                                    <p className="font-mono text-sm font-bold text-white">{activeStreamCount}</p>
                                    <p className="mt-0.5 text-[0.52rem] uppercase tracking-widest text-stone-500">active</p>
                                </div>
                                <div className="rounded-xl border border-white/5 bg-black/25 px-3 py-2">
                                    <p className="font-mono text-sm font-bold text-white">{streamCount}</p>
                                    <p className="mt-0.5 text-[0.52rem] uppercase tracking-widest text-stone-500">streams</p>
                                </div>
                                <div className="rounded-xl border border-white/5 bg-black/25 px-3 py-2">
                                    <p className="font-mono text-sm font-bold text-white">{layerGroups.length}</p>
                                    <p className="mt-0.5 text-[0.52rem] uppercase tracking-widest text-stone-500">groups</p>
                                </div>
                            </div>

                            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                                {layerGroups.map((group) => {
                                    const groupActive = group.layers.filter(layer => enabledLayers[layer.id] === true).length;
                                    const accentClass = group.accent === "cyan" ? "text-cyan-300 border-cyan-400/20 bg-cyan-400/5" : group.accent === "amber" ? "text-amber-300 border-amber-400/20 bg-amber-400/5" : group.accent === "emerald" ? "text-emerald-300 border-emerald-400/20 bg-emerald-400/5" : "text-stone-300 border-stone-500/20 bg-stone-500/5";
                                    return (
                                        <section key={group.id} className="rounded-2xl border border-white/5 bg-stone-950/45 p-2.5">
                                            <div className="mb-2 flex items-center justify-between gap-3 px-1">
                                                <div>
                                                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-stone-200">{group.title}</p>
                                                    <p className="mt-0.5 text-[0.58rem] text-stone-500">{group.sub}</p>
                                                </div>
                                                <span className={`rounded-full border px-2 py-0.5 font-mono text-[0.52rem] font-bold uppercase tracking-widest ${accentClass}`}>
                                                    {groupActive}/{group.layers.length}
                                                </span>
                                            </div>

                                            <div className="grid gap-1.5">
                                                {group.layers.map((layer) => {
                                                    const checked = enabledLayers[layer.id] === true;
                                                    return (
                                                        <div key={layer.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 ${checked ? "border-white/10 bg-white/[0.055]" : "border-stone-900 bg-black/20 hover:border-stone-700/70 hover:bg-stone-900/40"}`}>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`h-1.5 w-1.5 rounded-full ${checked ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-stone-700"}`} />
                                                                    <p className="truncate text-sm font-medium text-stone-200">{layer.title}</p>
                                                                </div>
                                                                <p className="mt-0.5 truncate text-xs text-stone-500">{layer.sub}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="hidden rounded-md border border-white/5 bg-black/25 px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-widest text-stone-500 sm:inline-flex">{layer.unit}</span>
                                                                <label className="relative flex-shrink-0 cursor-pointer">
                                                                    <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => handleToggleLayer(layer.id)} />
                                                                    <div className="h-5 w-9 rounded-full bg-stone-800 transition-colors duration-200 peer-checked:bg-white after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-stone-500 after:transition-all after:duration-200 after:content-[''] peer-checked:after:translate-x-4 peer-checked:after:bg-black" />
                                                                </label>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {group.id === "airspace" && enabledLayers.radar === true && (
                                                <div className="mt-2 rounded-xl border border-cyan-400/10 bg-black/25 p-2">
                                                    <div className="mb-2 flex items-center justify-between px-1">
                                                        <span className="font-mono text-[0.52rem] font-bold uppercase tracking-[0.22em] text-stone-500">radar source</span>
                                                        <span className="font-mono text-[0.52rem] uppercase tracking-widest text-emerald-400">adsb.lol</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {RADAR_FILTERS.map((filter) => {
                                                            const active = radarFilter === filter.id;
                                                            return (
                                                                <button
                                                                    key={filter.id}
                                                                    onClick={() => setRadarFilter(filter.id)}
                                                                    className={`rounded-lg border px-2.5 py-2 text-left transition-all duration-150 ${active ? "border-emerald-300/40 bg-emerald-400/10 text-stone-100 shadow-[0_0_24px_rgba(16,185,129,0.08)]" : "border-stone-900 bg-black/20 text-stone-500 hover:border-stone-700 hover:text-stone-300"}`}
                                                                >
                                                                    <span className="block font-mono text-[0.58rem] font-bold uppercase tracking-[0.16em]">{filter.label}</span>
                                                                    <span className="mt-0.5 block text-[0.55rem] text-stone-500">{filter.sub}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    );
                                })}
                            </div>

                            <div className="mt-3 flex min-h-20 items-center justify-center rounded-2xl border border-white/5 bg-stone-950/45 px-6 text-center">
                                <span className="text-sm text-stone-400">{tabSummary}</span>
                            </div>
                        </div>
                    </aside>
                </div>

                <nav className="fixed right-1/2 top-4 z-30 translate-x-1/2">
                    <div className="flex min-w-max items-center gap-2 overflow-x-auto rounded-full border border-stone-900/80 bg-stone-950/80 p-1.5 text-sm backdrop-blur-sm transition-all">
                        {isSearchOpen ? (
                            <form onSubmit={handleSearch} className="flex items-center gap-2 px-3 bg-stone-900 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 text-stone-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search location, coordinate, etc..."
                                    className="bg-transparent text-white outline-none w-64 text-sm font-mono placeholder:text-stone-600 py-1.5"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onBlur={() => !searchQuery && setIsSearchOpen(false)}
                                />
                            </form>
                        ) : (
                            <button onClick={() => setIsSearchOpen(true)} className="rounded-full p-2 transition-all duration-150 hover:bg-stone-900 hover:text-stone-200 text-stone-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                            </button>
                        )}
                        {TABS.map((t) => (
                            <button
                                key={t}
                                onClick={() => applyTabPreset(t)}
                                className={`whitespace-nowrap rounded-full px-5 py-1.5 transition-all duration-150 ${activeTab === t ? "bg-stone-800 text-white" : "text-stone-500 hover:bg-stone-900 hover:text-stone-200"}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </nav>

                <nav className="fixed bottom-4 right-1/2 z-30 flex translate-x-1/2 items-center gap-4">
                    {showImageryPicker && (
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex items-end gap-1.5 rounded-2xl border border-stone-800/80 bg-stone-950/95 p-2 backdrop-blur-md shadow-2xl">
                            {IMAGERY_CATALOG.map((layer) => {
                                const active = activeImagery === layer.id;
                                return (
                                    <button
                                        key={layer.id}
                                        onClick={() => {
                                            setActiveImagery(layer.id);
                                            setShowImageryPicker(false);
                                        }}
                                        className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all duration-150 ${active ? "ring-1 ring-stone-400 bg-stone-800/60" : "hover:bg-stone-900/80"
                                            }`}
                                        title={layer.sub}
                                    >
                                        <div className="w-14 h-9 rounded-lg border border-stone-700/40 relative overflow-hidden" style={{ background: layer.swatch }}>
                                            {active && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" /></div>}
                                        </div>
                                        <span className="text-[0.55rem] font-mono font-medium text-stone-300 whitespace-nowrap leading-tight">{layer.label}</span>
                                        <span className={`text-[0.45rem] font-mono font-bold ${layer.badgeCls} whitespace-nowrap leading-tight`}>{layer.badge}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex min-w-max items-center gap-2 overflow-x-auto rounded-full border border-stone-900/80 bg-stone-950/80 p-1.5 text-sm backdrop-blur-sm">
                        <button onClick={() => runCommand("zoomIn")} className="rounded-full p-2 transition-all duration-150 hover:bg-stone-900 hover:text-stone-200" title="Zoom in">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" /></svg>
                        </button>
                        <button onClick={() => runCommand("zoomOut")} className="rounded-full p-2 transition-all duration-150 hover:bg-stone-900 hover:text-stone-200" title="Zoom out">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6" /></svg>
                        </button>
                        <div className="w-px h-4 bg-stone-800 mx-1"></div>
                        <button onClick={() => runCommand("screenshot")} className="rounded-full p-2 transition-all duration-150 hover:bg-stone-900 hover:text-stone-200" title="Capture Recon Snapshot">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                        </button>
                    </div>
                    <div className="flex min-w-max items-center gap-2 overflow-x-auto rounded-full border border-stone-900/80 bg-stone-950/80 p-1.5 text-sm backdrop-blur-sm">
                        <button onClick={() => setIsGlobe(!isGlobe)} className="rounded-full px-3 py-1.5 font-mono text-xs transition-all text-emerald-400 hover:bg-stone-900 hover:text-emerald-300">
                            {isGlobe ? "3D GLOBE" : "2D MAP"}
                        </button>
                        <div className="w-px h-4 bg-stone-800 mx-1"></div>
                        {STYLE_OPTIONS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveStyle(s.id)}
                                className={`rounded-full px-3 py-1.5 font-mono text-xs transition-all ${activeStyle === s.id ? "bg-cyan-400/20 text-cyan-300" : "text-stone-400 hover:bg-stone-900 hover:text-stone-200"}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowImageryPicker((v) => !v)}
                        className={`rounded-full border p-2 transition-all duration-150 ${showImageryPicker ? "border-amber-500/50 bg-amber-500/15 text-amber-300" : "border-stone-900 text-stone-400 hover:bg-stone-900 hover:text-stone-200"}`}
                        title={`Basemap: ${IMAGERY_CATALOG.find((l) => l.id === activeImagery)?.label ?? activeImagery}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" /></svg>
                    </button>
                    <button onClick={() => runCommand("resetView")} className="rounded-full border border-stone-900 p-3.5 transition-all duration-150 hover:bg-stone-900 hover:text-stone-200" title="Reset view">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                    </button>
                </nav>

                <nav className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
                    <div className="flex min-w-max items-center gap-2 overflow-x-auto rounded-full border border-stone-900/80 bg-stone-950/80 p-1.5 px-3 text-sm backdrop-blur-sm"><span>Scale: <span className="text-white">{scaleLabel}</span></span></div>
                    <div className="flex min-w-max items-center gap-2 overflow-x-auto rounded-full border border-stone-900/80 bg-stone-950/80 p-1.5 px-3 text-sm backdrop-blur-sm"><span>Camera: <span className="text-white">{camKm.toLocaleString()} KM</span></span></div>
                    <button
                        onClick={() => setStreetViewMode((v) => !v)}
                        className={`flex min-w-max items-center gap-2 overflow-x-auto rounded-full border p-1.5 px-3 text-sm backdrop-blur-sm transition ${streetViewMode ? "border-sky-500/70 bg-sky-900/45 text-sky-200" : "border-stone-900/80 bg-stone-950/80 text-stone-300 hover:bg-stone-900/80"}`}
                        title={streetViewMode ? "KartaView street imagery overlay active" : "Enable KartaView street imagery overlay"}
                    >
                        {streetViewMode ? "Street View: ON" : "Street View: OFF"}
                    </button>
                    <div className="flex min-w-max items-center gap-2 overflow-x-auto rounded-full border border-stone-900/80 bg-stone-950/80 p-1.5 px-3 text-sm backdrop-blur-sm"><span><span className="text-white">{latLabel}</span> <span className="text-white">{lonLabel}</span></span></div>
                </nav>

                <nav className="fixed right-4 top-4 z-30 flex flex-col items-end gap-2">
                    <div className="flex min-w-max items-center gap-2 overflow-x-auto rounded-full border border-stone-900/80 bg-stone-950/80 p-1.5 px-3 text-sm text-stone-300 backdrop-blur-sm"><span>{dayLabel}</span></div>
                    <div className="flex min-w-max items-center gap-2 overflow-x-auto rounded-full border border-stone-900/80 bg-stone-950/80 p-1.5 px-3 text-sm backdrop-blur-sm"><span>Local (IST): <span className="tracking-widest text-white">{localTime}</span></span></div>
                    <div className="flex min-w-max items-center gap-2 overflow-x-auto rounded-full border border-stone-900/80 bg-stone-950/80 p-1.5 px-3 text-sm backdrop-blur-sm"><span>UTC: <span className="tracking-widest text-white">{utcTime}</span></span></div>
                    { }
                    <WorldMonitorDeck
                        visible={enabledLayers.gil === true}
                        layers={worldMonitorLayers}
                        onToggle={handleToggleWmLayer}
                        counts={wmCounts}
                        has_correlations={geoIntelData ? geoIntelData.correlations.length > 0 : false}
                    />
                </nav>

                <div className="pointer-events-none absolute right-4 top-24 z-40 flex flex-col items-end space-y-4">
                    <Draggable handle=".cursor-move" nodeRef={nodeRefFlight}>
                        <div className="pointer-events-auto cursor-move" ref={nodeRefFlight}>
                            <FlightDetailsSidebar flight={selectedFlight} onClose={() => setSelectedFlight(null)} />
                        </div>
                    </Draggable>
                    <Draggable handle=".cursor-move" nodeRef={nodeRefAirport}>
                        <div className="pointer-events-auto cursor-move" ref={nodeRefAirport}>
                            <AirportDetailsSidebar airport={selectedAirport} onClose={() => setSelectedAirport(null)} />
                        </div>
                    </Draggable>
                    <Draggable handle=".cursor-move" nodeRef={nodeRefSatellite}>
                        <div className="pointer-events-auto cursor-move" ref={nodeRefSatellite}>
                            <SatelliteDetailsSidebar satellite={selectedSatellite} onClose={() => setSelectedSatellite(null)} />
                        </div>
                    </Draggable>
                    <Draggable handle=".cursor-move" nodeRef={nodeRefQuake}>
                        <div className="pointer-events-auto cursor-move" ref={nodeRefQuake}>
                            <QuakeDetailsSidebar quake={selectedQuake} onClose={() => setSelectedQuake(null)} />
                        </div>
                    </Draggable>
                    <Draggable handle=".cursor-move" nodeRef={nodeRefRadio}>
                        <div className="pointer-events-auto cursor-move" ref={nodeRefRadio}>
                            <RadioDetailsSidebar radio={selectedRadio} onClose={() => setSelectedRadio(null)} />
                        </div>
                    </Draggable>
                    {selectedCamera && (
                        <CameraDetailsSidebar camera={selectedCamera} onClose={() => setSelectedCamera(null)} />
                    )}
                    <Draggable handle=".cursor-move" nodeRef={nodeRefIntel}>
                        <div className="pointer-events-auto cursor-move" ref={nodeRefIntel}>
                            <IntelDetailsSidebar intel={selectedIntel} onClose={() => setSelectedIntel(null)} />
                        </div>
                    </Draggable>
                    {selectedSigint && (
                        <Draggable handle=".cursor-move" nodeRef={nodeRefSigint}>
                            <div className="pointer-events-auto cursor-move" ref={nodeRefSigint}>
                                <div className="w-[26rem] rounded-2xl border border-cyan-400/20 bg-stone-950/90 p-4 text-stone-200 shadow-2xl backdrop-blur-xl">
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.24em] text-cyan-300">signal detail</p>
                                            <h3 className="mt-1 text-base font-semibold text-white">
                                                {selectedSigint.type === "cell" ? selectedSigint.data.id : selectedSigint.data.title}
                                            </h3>
                                        </div>
                                        <button onClick={() => setSelectedSigint(null)} className="rounded-full border border-white/10 px-2 py-1 text-xs text-stone-400 hover:text-white">close</button>
                                    </div>
                                    {selectedSigint.type === "cell" ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="rounded-xl border border-white/5 bg-black/30 p-2">
                                                    <p className="font-mono text-sm text-white">{selectedSigint.data.aircraft_count}</p>
                                                    <p className="text-[0.55rem] uppercase tracking-widest text-stone-500">aircraft</p>
                                                </div>
                                                <div className="rounded-xl border border-white/5 bg-black/30 p-2">
                                                    <p className="font-mono text-sm text-white">{selectedSigint.data.degraded_count}</p>
                                                    <p className="text-[0.55rem] uppercase tracking-widest text-stone-500">degraded</p>
                                                </div>
                                                <div className="rounded-xl border border-white/5 bg-black/30 p-2">
                                                    <p className="font-mono text-sm text-white">{selectedSigint.data.confidence}%</p>
                                                    <p className="text-[0.55rem] uppercase tracking-widest text-stone-500">confidence</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-stone-400">
                                                cell bounds {selectedSigint.data.bounds.map((x) => x.toFixed(1)).join(", ")} · severity {selectedSigint.data.severity}
                                            </p>
                                            <p className="text-xs text-stone-300">
                                                evidence: {selectedSigint.data.evidence_types.length ? selectedSigint.data.evidence_types.join(", ").replace(/_/g, " ") : "degraded navigation density"}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="rounded-xl border border-white/5 bg-black/30 p-2">
                                                    <p className="font-mono text-sm text-white">{selectedSigint.data.severity}</p>
                                                    <p className="text-[0.55rem] uppercase tracking-widest text-stone-500">severity</p>
                                                </div>
                                                <div className="rounded-xl border border-white/5 bg-black/30 p-2">
                                                    <p className="font-mono text-sm text-white">{selectedSigint.data.confidence}%</p>
                                                    <p className="text-[0.55rem] uppercase tracking-widest text-stone-500">confidence</p>
                                                </div>
                                                <div className="rounded-xl border border-white/5 bg-black/30 p-2">
                                                    <p className="font-mono text-sm text-white">{selectedSigint.data.evidence_class}</p>
                                                    <p className="text-[0.55rem] uppercase tracking-widest text-stone-500">evidence</p>
                                                </div>
                                            </div>
                                            <p className="text-sm text-stone-300">{selectedSigint.data.description}</p>
                                            <div className="rounded-xl border border-white/5 bg-black/30 p-3 text-xs text-stone-300">
                                                <p>aircraft: <span className="text-white">{selectedSigint.data.callsign || selectedSigint.data.aircraft}</span></p>
                                                <p>cell: <span className="text-white">{selectedSigint.data.cell_id}</span></p>
                                                <p>observed: <span className="text-white">{selectedSigint.data.last_seen}</span></p>
                                            </div>
                                            <div className="max-h-28 overflow-auto rounded-xl border border-white/5 bg-black/30 p-2">
                                                {selectedSigint.data.evidence.map((ev) => (
                                                    <div key={`${ev.label}-${ev.observed_at}`} className="border-b border-white/5 py-1.5 last:border-0">
                                                        <p className="text-xs text-white">{ev.label}: {ev.value}</p>
                                                        <p className="font-mono text-[0.55rem] text-stone-500">{ev.class} · {ev.source}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Draggable>
                    )}
                    <Draggable handle=".cursor-move" nodeRef={nodeRefCity}>
                        <div className="pointer-events-auto cursor-move" ref={nodeRefCity}>
                            <CityDetailsSidebar city={selectedCity} onClose={() => setSelectedCity(null)} worldMonitorActive={worldMonitorActive} geoIntel={geoIntelData} onCameraSelect={setSelectedCamera} />
                        </div>
                    </Draggable>
                    <Draggable handle=".cursor-move" nodeRef={nodeRefBuilding}>
                        <div className="pointer-events-auto cursor-move" ref={nodeRefBuilding}>
                            <BuildingDetailsSidebar buildingCoord={selectedBuilding} onClose={() => setSelectedBuilding(null)} />
                        </div>
                    </Draggable>
                </div>

                { }
                <CountryDashboard iso={selectedCountry} geoIntel={geoIntelData} onClose={() => setSelectedCountry(null)} />
            </div>

            { }
            {enabledLayers.gil && geoIntelData && (
                <div className="fixed bottom-0 left-0 right-0 z-[100] w-full transition-transform duration-500 translate-y-[calc(100%-2rem)] hover:translate-y-0 group pointer-events-auto">
                    { }
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#0a0a0a] border border-stone-800 border-b-0 rounded-t-xl px-6 py-1 cursor-pointer flex items-center justify-center text-stone-400 group-hover:text-white shadow-[0_-8px_16px_rgba(0,0,0,0.5)]">
                        <span className="text-xs font-mono uppercase tracking-widest mr-2">Intelligence Deck</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform">
                            <path d="M18 15l-6-6-6 6" />
                        </svg>
                    </div>
                    { }
                    <div className="bg-[#0a0a0a] border-t border-stone-800 shadow-[0_-16px_48px_rgba(0,0,0,0.9)] max-h-[80vh] overflow-y-auto">
                        <BottomIntelligenceDeck data={geoIntelData} loading={geoIntelLoading} />
                    </div>
                </div>
            )}

        </div>
    );
}
