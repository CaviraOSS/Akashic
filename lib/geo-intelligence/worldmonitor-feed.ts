import {
  CONFLICT_ZONES,
  CRITICAL_MINERALS,
  ECONOMIC_CENTERS,
  INTEL_HOTSPOTS,
  MILITARY_BASES,
  NUCLEAR_FACILITIES,
  SANCTIONED_COUNTRIES_ALPHA2,
  SPACEPORTS,
  STRATEGIC_WATERWAYS,
  UNDERSEA_CABLES,
} from "@/lib/worldmonitor/geo"
import { PIPELINES } from "@/lib/worldmonitor/pipelines"
import { build_wm_feed, type wm_feed, type wm_layer_id, type wm_path, type wm_point, type wm_severity } from "./worldmonitor-core"

const iso2: Record<string, string> = {
  usa: "us", "united states": "us", uk: "gb", "united kingdom": "gb", uae: "ae",
  iran: "ir", iraq: "iq", israel: "il", lebanon: "lb", syria: "sy", yemen: "ye",
  ukraine: "ua", russia: "ru", china: "cn", taiwan: "tw", india: "in", pakistan: "pk",
  japan: "jp", "south korea": "kr", "north korea": "kp", turkey: "tr", germany: "de",
  france: "fr", italy: "it", spain: "es", egypt: "eg", panama: "pa", singapore: "sg",
  malaysia: "my", indonesia: "id", oman: "om", canada: "ca", mexico: "mx", brazil: "br",
  argentina: "ar", chile: "cl", peru: "pe", australia: "au", "south africa": "za",
  saudi: "sa", "saudi arabia": "sa", qatar: "qa", kuwait: "kw", finland: "fi",
  poland: "pl", romania: "ro", bulgaria: "bg", hungary: "hu", slovakia: "sk",
  "czech republic": "cz", kazakhstan: "kz", bangladesh: "bd", "new zealand": "nz",
  "french guiana": "gf", israelipalestine: "il",
}

const centers: Record<string, [number, number]> = {
  us: [-98.5, 39.8], ru: [90, 61], cn: [103, 35], ir: [53, 32], kp: [127, 40],
  sy: [38, 35], cu: [-79.5, 22], ve: [-66, 7], mm: [96, 21], by: [28, 53],
  af: [66, 34], zw: [30, -19], ni: [-85, 13], ua: [31, 49], il: [35, 31.5],
  ye: [47, 15.5], iq: [44, 33], lb: [35.8, 33.9], tr: [35, 39], tw: [121, 24],
  eg: [30, 27], pa: [-80, 8.5], za: [24, -29], id: [118, -2], my: [102, 4],
  sg: [103.8, 1.35], om: [57, 21], ae: [54, 24], sa: [45, 24], in: [78, 22],
}

const src = "worldmonitor import scan"
const n = (v: any) => Number(v)
const country = (v: any) => iso2[String(v || "").trim().toLowerCase()] || String(v || "").slice(0, 2).toLowerCase()
const sev = (v: any): wm_severity => v === "critical" || v === "high" || v === "elevated" || v === "moderate" || v === "low" ? v : "info"

const pt = (x: Partial<wm_point> & { id: string, layer_id: wm_layer_id, title: string, lat: number, lng?: number, lon?: number }): wm_point => ({
  severity: "info",
  confidence: 0.72,
  source_name: src,
  published_at: new Date(0).toISOString(),
  ...x,
  lng: x.lng ?? x.lon ?? 0,
})

const pathx = (x: Partial<wm_path> & { id: string, layer_id: wm_layer_id, title: string, points: [number, number][] }): wm_path => ({
  severity: "info",
  source_name: src,
  ...x,
})

const byname = (x: any) => country(x.country || x.operator || x.host || "")

const gps = [
  ["gps-ukraine", "eastern ukraine gnss interference", 48.5, 37.8, "ua", "high"],
  ["gps-crimea", "crimea gnss interference", 45.3, 34, "ua", "high"],
  ["gps-kaliningrad", "kaliningrad gnss interference", 54.7, 20.5, "ru", "high"],
  ["gps-gaza", "gaza gnss interference", 31.4, 34.3, "il", "high"],
  ["gps-baltic", "baltic sea gnss interference", 57.5, 20, "ru", "elevated"],
  ["gps-taiwan", "taiwan strait gnss interference", 24.5, 119.5, "tw", "elevated"],
] as const

const cyber = [
  ["cyber-amsix", "amsterdam internet exchange watch", 52.37, 4.9, "nl"],
  ["cyber-frankfurt", "frankfurt interconnect watch", 50.11, 8.68, "de"],
  ["cyber-ashburn", "ashburn data corridor watch", 39.04, -77.49, "us"],
  ["cyber-singapore", "singapore exchange watch", 1.35, 103.82, "sg"],
] as const

const internet = [
  ["net-redsea", "red sea cable disruption watch", 19.5, 39.5, "sa", "high"],
  ["net-blacksea", "black sea connectivity watch", 43.2, 34.2, "ua", "elevated"],
  ["net-baltic", "baltic subsea connectivity watch", 56.2, 18.5, "se", "elevated"],
] as const

const storage = [
  ["store-cushing", "cushing crude storage", 35.99, -96.75, "us"],
  ["store-fujairah", "fujairah oil storage", 25.12, 56.34, "ae"],
  ["store-rotterdam", "rotterdam energy storage", 51.95, 4.14, "nl"],
  ["store-jurong", "jurong island storage", 1.26, 103.7, "sg"],
] as const

const orbit = [
  ["orb-fylingdales", "raf fylingdales space surveillance", 54.36, -0.67, "gb"],
  ["orb-eglin", "eglin space surveillance", 30.57, -86.21, "us"],
  ["orb-pinegap", "pine gap satellite ground station", -23.8, 133.74, "au"],
  ["orb-graves", "graves space surveillance", 47.35, 5.52, "fr"],
] as const

const datacenters = [
  ["dc-ashburn", "ashburn ai data center corridor", 39.04, -77.49, "us"],
  ["dc-dublin", "dublin cloud region cluster", 53.35, -6.26, "ie"],
  ["dc-frankfurt", "frankfurt cloud exchange", 50.11, 8.68, "de"],
  ["dc-singapore", "singapore data center hub", 1.35, 103.82, "sg"],
] as const

const tech = [
  ["startup-sf", "san francisco startup hub", 37.77, -122.42, "us", "startup_hubs"],
  ["startup-bangalore", "bangalore startup hub", 12.97, 77.59, "in", "startup_hubs"],
  ["cloud-us-east", "us east cloud region", 39.04, -77.49, "us", "cloud_regions"],
  ["cloud-tokyo", "tokyo cloud region", 35.68, 139.76, "jp", "cloud_regions"],
  ["acc-ycombinator", "y combinator accelerator", 37.78, -122.41, "us", "accelerators"],
  ["acc-stationf", "station f accelerator", 48.83, 2.37, "fr", "accelerators"],
  ["hq-openai", "openai headquarters", 37.78, -122.42, "us", "tech_hqs"],
  ["hq-tsmc", "tsmc hsinchu headquarters", 24.78, 121, "tw", "tech_hqs"],
  ["event-hannover", "hannover messe technology event", 52.32, 9.8, "de", "tech_events"],
  ["event-computex", "computex taipei technology event", 25.03, 121.56, "tw", "tech_events"],
] as const

const maritime = [
  ["tanker-hormuz", "hormuz tanker traffic watch", 26.55, 56.25, "ir", "high"],
  ["tanker-malacca", "malacca tanker traffic watch", 2.8, 101.1, "my", "elevated"],
  ["tanker-suez", "suez tanker traffic watch", 30.2, 32.55, "eg", "elevated"],
] as const

const ports = [
  ["port-singapore", "singapore commodity port", 1.26, 103.82, "sg"],
  ["port-rotterdam", "rotterdam commodity port", 51.95, 4.14, "nl"],
  ["port-houston", "houston energy port", 29.73, -95.26, "us"],
  ["port-fujairah", "fujairah oil port", 25.12, 56.34, "ae"],
] as const

const fuel = [
  ["fuel-haiti", "haiti fuel shortage watch", 18.54, -72.34, "ht", "high"],
  ["fuel-lebanon", "lebanon fuel supply stress", 33.89, 35.5, "lb", "elevated"],
  ["fuel-yemen", "yemen fuel access stress", 15.35, 44.2, "ye", "high"],
] as const

const health = [
  ["disease-drc", "drc outbreak watch", -4.04, 21.76, "cd", "elevated"],
  ["disease-gaza", "gaza public health stress", 31.5, 34.47, "ps", "high"],
  ["disease-horn", "horn of africa disease watch", 9.15, 40.49, "et", "elevated"],
] as const

const resilience = [
  ["positive-rwanda", "rwanda grid access progress", -1.94, 29.87, "rw", "positive_events"],
  ["kindness-poland", "poland refugee support network", 52.23, 21.01, "pl", "kindness"],
  ["happy-finland", "finland happiness index reference", 60.17, 24.94, "fi", "happiness"],
  ["species-kenya", "kenya species recovery corridor", -1.29, 36.82, "ke", "species_recovery"],
  ["renewable-morocco", "morocco renewable installation corridor", 31.63, -7.99, "ma", "renewable_installations"],
  ["resilience-japan", "japan resilience score reference", 35.68, 139.76, "jp", "resilience_score"],
] as const

const gulf = [
  ["gulf-riyadh", "riyadh sovereign investment hub", 24.71, 46.67, "sa"],
  ["gulf-abu-dhabi", "abu dhabi sovereign investment hub", 24.45, 54.38, "ae"],
  ["gulf-doha", "doha sovereign investment hub", 25.29, 51.53, "qa"],
] as const

export const get_worldmonitor_feed = (): wm_feed => {
  const points: wm_point[] = []
  const paths: wm_path[] = []

  for (const h of INTEL_HOTSPOTS) {
    const s = h.escalationScore && h.escalationScore >= 5 ? "critical" : h.escalationScore && h.escalationScore >= 4 ? "high" : "elevated"
    points.push(pt({ id: `hotspot-${h.id}`, layer_id: "intel_hotspots", title: h.name, summary: h.description, lat: n(h.lat), lng: n(h.lon), severity: s, country_iso2: byname(h) }))
    if ((h.keywords || []).some(k => /coup|junta|gang|protest|riot|strike/.test(k))) {
      points.push(pt({ id: `unrest-${h.id}`, layer_id: "civil_unrest", title: `${h.name} unrest watch`, summary: h.status, lat: n(h.lat), lng: n(h.lon), severity: s, country_iso2: byname(h) }))
    }
    if ((h.escalationScore || 0) >= 4) {
      points.push(pt({ id: `violence-${h.id}`, layer_id: "violence", title: `${h.name} violence risk`, summary: h.whyItMatters, lat: n(h.lat), lng: n(h.lon), severity: s, country_iso2: byname(h) }))
    }
    if (`${h.description || ""} ${h.whyItMatters || ""}`.toLowerCase().match(/humanitarian|migration|displacement|collapse/)) {
      points.push(pt({ id: `humanitarian-${h.id}`, layer_id: "humanitarian", title: `${h.name} humanitarian stress`, summary: h.whyItMatters, lat: n(h.lat), lng: n(h.lon), severity: "elevated", country_iso2: byname(h) }))
    }
  }

  for (const z of CONFLICT_ZONES) {
    const lat = Array.isArray(z.center) ? n(z.center[1]) : 0
    const lng = Array.isArray(z.center) ? n(z.center[0]) : 0
    const s = z.intensity === "high" ? "critical" : z.intensity === "medium" ? "high" : "elevated"
    points.push(pt({ id: `conflict-${z.id}`, layer_id: "conflicts", title: z.name, summary: z.description, lat, lng, severity: s }))
    if (z.casualties) points.push(pt({ id: `ucdp-${z.id}`, layer_id: "ucdp_events", title: `${z.name} conflict event record`, summary: z.casualties, lat, lng, severity: s, source_name: "worldmonitor ucdp registry" }))
    if (z.displaced) points.push(pt({ id: `disp-${z.id}`, layer_id: "displacement", title: `${z.name} displacement pressure`, summary: z.displaced, lat, lng, severity: s, source_name: "worldmonitor displacement registry" }))
    if (s === "critical") points.push(pt({ id: `war-${z.id}`, layer_id: "wars", title: `${z.name} active war`, summary: z.description, lat, lng, severity: "critical" }))
    if (`${z.name} ${z.description || ""}`.toLowerCase().includes("iran")) points.push(pt({ id: `iran-${z.id}`, layer_id: "iran_attacks", title: z.name, summary: z.description, lat, lng, severity: "critical", country_iso2: "ir" }))
  }

  for (const b of MILITARY_BASES) points.push(pt({ id: `base-${b.id}`, layer_id: "bases", title: b.name, summary: b.description || b.arm, lat: n(b.lat), lng: n(b.lon), severity: b.status === "active" ? "moderate" : "info", country_iso2: byname(b) }))
  for (const x of NUCLEAR_FACILITIES) points.push(pt({ id: `nuke-${x.id}`, layer_id: "nuclear", title: x.name, summary: `${x.type} ${x.status}`, lat: n(x.lat), lng: n(x.lon), severity: x.status === "active" ? "high" : "moderate", country_iso2: country(x.operator) }))
  for (const x of NUCLEAR_FACILITIES.filter(x => x.type === "research" || x.type === "reprocessing" || x.type === "weapons").slice(0, 36)) points.push(pt({ id: `irr-${x.id}`, layer_id: "irradiators", title: `${x.name} radiological asset`, summary: `${x.type} ${x.status}`, lat: n(x.lat), lng: n(x.lon), severity: x.status === "active" ? "moderate" : "info", country_iso2: country(x.operator) }))
  for (const x of NUCLEAR_FACILITIES.filter(x => /zaporizh|chernobyl|fukushima|natanz|fordow|yongbyon/i.test(x.name))) points.push(pt({ id: `rad-${x.id}`, layer_id: "radiation_watch", title: `${x.name} radiation watch`, summary: `${x.type} ${x.status}`, lat: n(x.lat), lng: n(x.lon), severity: "high", country_iso2: country(x.operator) }))
  for (const w of STRATEGIC_WATERWAYS) points.push(pt({ id: `choke-${w.id}`, layer_id: "chokepoints", title: w.name, summary: w.description, lat: n(w.lat), lng: n(w.lon), severity: /hormuz|mandeb|taiwan|suez/i.test(w.name) ? "high" : "moderate" }))
  for (const x of ECONOMIC_CENTERS) {
    points.push(pt({ id: `econ-${x.id}`, layer_id: "economic_centers", title: x.name, summary: x.description, lat: n(x.lat), lng: n(x.lon), severity: "info", country_iso2: byname(x) }))
    const lyr = x.type === "exchange" ? "stock_exchanges" : x.type === "central-bank" ? "central_banks" : "financial_centers"
    points.push(pt({ id: `${lyr}-${x.id}`, layer_id: lyr, title: x.name, summary: x.description, lat: n(x.lat), lng: n(x.lon), severity: "info", country_iso2: byname(x) }))
  }
  for (const x of SPACEPORTS) points.push(pt({ id: `space-${x.id}`, layer_id: "spaceports", title: x.name, summary: `${x.operator} ${x.status}`, lat: n(x.lat), lng: n(x.lon), severity: x.status === "active" ? "info" : "low", country_iso2: byname(x) }))
  for (const x of CRITICAL_MINERALS) points.push(pt({ id: `mineral-${x.id}`, layer_id: "critical_minerals", title: x.name, summary: x.mineral, lat: n(x.lat), lng: n(x.lon), severity: "moderate", country_iso2: byname(x) }))
  for (const x of CRITICAL_MINERALS.slice(0, 18)) points.push(pt({ id: `mine-${x.id}`, layer_id: "mining_sites", title: `${x.name} mining site`, summary: x.significance || x.mineral, lat: n(x.lat), lng: n(x.lon), severity: "moderate", country_iso2: byname(x) }))
  for (const x of CRITICAL_MINERALS.slice(0, 12)) points.push(pt({ id: `process-${x.id}`, layer_id: "processing_plants", title: `${x.name} processing exposure`, summary: x.operator || x.mineral, lat: n(x.lat) + 0.18, lng: n(x.lon) + 0.18, severity: "moderate", country_iso2: byname(x) }))

  for (const [code, level] of Object.entries(SANCTIONED_COUNTRIES_ALPHA2)) {
    const c = centers[code.toLowerCase()]
    if (c) points.push(pt({ id: `sanction-${code}`, layer_id: "sanctions", title: `${code} sanctions pressure`, lat: c[1], lng: c[0], country_iso2: code.toLowerCase(), severity: level === "severe" ? "critical" : level === "high" ? "high" : "elevated" }))
  }

  for (const [id, title, lat, lng, c, s] of gps) points.push(pt({ id, layer_id: "gps_jamming", title, lat, lng, country_iso2: c, severity: sev(s) }))
  for (const [id, title, lat, lng, c] of cyber) points.push(pt({ id, layer_id: "cyber_threats", title, lat, lng, country_iso2: c, severity: "elevated" }))
  for (const [id, title, lat, lng, c, s] of internet) points.push(pt({ id, layer_id: "internet_disruptions", title, lat, lng, country_iso2: c, severity: sev(s) }))
  for (const [id, title, lat, lng, c] of storage) points.push(pt({ id, layer_id: "storage_facilities", title, lat, lng, country_iso2: c, severity: "info" }))
  for (const [id, title, lat, lng, c] of orbit) points.push(pt({ id, layer_id: "orbital_surveillance", title, lat, lng, country_iso2: c, severity: "info" }))
  for (const [id, title, lat, lng, c] of datacenters) points.push(pt({ id, layer_id: "data_centers", title, lat, lng, country_iso2: c, severity: "info" }))
  for (const [id, title, lat, lng, c, layer] of tech) points.push(pt({ id, layer_id: layer, title, lat, lng, country_iso2: c, severity: "info" }))
  for (const [id, title, lat, lng, c, s] of maritime) points.push(pt({ id, layer_id: "live_tankers", title, lat, lng, country_iso2: c, severity: sev(s) }))
  for (const [id, title, lat, lng, c] of ports) points.push(pt({ id, layer_id: "commodity_ports", title, lat, lng, country_iso2: c, severity: "moderate" }))
  for (const [id, title, lat, lng, c, s] of fuel) points.push(pt({ id, layer_id: "fuel_shortages", title, lat, lng, country_iso2: c, severity: sev(s) }))
  for (const [id, title, lat, lng, c, s] of health) points.push(pt({ id, layer_id: "disease_outbreaks", title, lat, lng, country_iso2: c, severity: sev(s) }))
  for (const [id, title, lat, lng, c, layer] of resilience) points.push(pt({ id, layer_id: layer, title, lat, lng, country_iso2: c, severity: "info" }))
  for (const [id, title, lat, lng, c] of gulf) points.push(pt({ id, layer_id: "gulf_investments", title, lat, lng, country_iso2: c, severity: "info" }))
  for (const [id, title, lat, lng, c] of ports.slice(0, 3)) points.push(pt({ id: `commodity-${id}`, layer_id: "commodity_hubs", title: `${title} commodity hub`, lat, lng, country_iso2: c, severity: "info" }))
  points.push(pt({ id: "day-night-utc", layer_id: "day_night", title: "utc day/night terminator reference", lat: 0, lng: 0, severity: "info", source_name: "worldmonitor astro overlay" }))

  points.push(pt({ id: "climate-arctic", layer_id: "climate_anomalies", title: "arctic climate anomaly watch", lat: 78, lng: 20, severity: "moderate", source_name: "worldmonitor climate registry" }))
  points.push(pt({ id: "natural-iceland", layer_id: "natural_events", title: "iceland volcanic corridor watch", lat: 63.9, lng: -22.3, severity: "elevated", source_name: "worldmonitor natural registry" }))
  points.push(pt({ id: "fire-canada", layer_id: "wildfires", title: "boreal wildfire watch", lat: 56, lng: -106, country_iso2: "ca", severity: "elevated", source_name: "worldmonitor fire registry" }))

  for (const c of UNDERSEA_CABLES) paths.push(pathx({ id: `cable-${c.id}`, layer_id: "cables", title: c.name, points: c.points, severity: c.major ? "moderate" : "info" }))
  for (const p of PIPELINES) paths.push(pathx({ id: `pipeline-${p.id}`, layer_id: "pipelines", title: p.name, points: p.points, severity: p.type === "gas" ? "moderate" : "elevated", metadata: { type: p.type, status: p.status, countries: p.countries } }))
  paths.push(pathx({ id: "trade-asia-europe", layer_id: "trade_routes", title: "asia europe maritime trade route", points: [[103.8, 1.3], [80, 6], [43.3, 12.6], [32.5, 30.1], [4.1, 51.9]], severity: "moderate" }))
  paths.push(pathx({ id: "trade-pacific", layer_id: "trade_routes", title: "north pacific container route", points: [[139.7, 35.6], [170, 42], [-150, 45], [-122.4, 37.8]], severity: "info" }))
  paths.push(pathx({ id: "trade-atlantic", layer_id: "trade_routes", title: "north atlantic energy route", points: [[-95, 29.5], [-65, 34], [-20, 45], [4.1, 51.9]], severity: "info" }))

  return build_wm_feed({ points, paths })
}
