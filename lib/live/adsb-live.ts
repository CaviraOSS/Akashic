export type source_state = "live" | "delayed" | "degraded" | "unavailable"

export type source_health = {
  id?: string
  label?: string
  state: source_state
  fetched_at: string | null
  count: number
  stale?: boolean
  error?: string
  url?: string
}

export type adsb_aircraft = {
  hex: string
  flight: string
  registration: string | null
  model_type: string | null
  description: string | null
  category: string
  lat: number
  lon: number
  alt_baro: number | null
  alt_geom: number | null
  ground_speed: number | null
  track: number | null
  baro_rate: number | null
  geom_rate: number | null
  squawk: string | null
  emergency: string | null
  nav_modes: string[]
  nic: number | null
  nac_p: number | null
  nac_v: number | null
  rc: number | null
  sil: number | null
  sil_type: string | null
  gva: number | null
  sda: number | null
  version: number | null
  nic_baro: number | null
  seen: number | null
  seen_pos: number | null
  messages: number | null
  rssi: number | null
  alert: boolean
  spi: boolean
  gps_ok_before: number | null
  last_contact: number
}

export type adsb_snapshot = {
  fetched_at: string
  stale: boolean
  aircraft: adsb_aircraft[]
  rejected: number
  source: source_health
}

const fresh_ms = 15_000
const stale_ms = 4 * 60_000
const cache = new Map<string, { at: number; snap: adsb_snapshot }>()
const pending = new Map<string, Promise<adsb_snapshot>>()

const str = (v: unknown) => {
  const x = typeof v === "string" ? v.trim() : ""
  return x || null
}

const num = (v: unknown) => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : Number.NaN
  return Number.isFinite(x) ? x : null
}

const bool = (v: unknown) => v === true || v === 1 || v === "1"

export const normalize_adsb = (raw: Record<string, unknown>, now = Date.now()): adsb_aircraft | null => {
  const hex = str(raw.hex)?.toLowerCase()
  const lat = num(raw.lat)
  const lon = num(raw.lon)
  if (!hex || lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  const seen = num(raw.seen)
  const nav_modes = Array.isArray(raw.nav_modes) ? raw.nav_modes.map(str).filter((x): x is string => !!x) : []
  const alt_baro = raw.alt_baro === "ground" ? 0 : num(raw.alt_baro)
  return {
    hex,
    flight: str(raw.flight) || hex,
    registration: str(raw.r),
    model_type: str(raw.t),
    description: str(raw.desc),
    category: str(raw._cat) || "COMMERCIAL",
    lat,
    lon,
    alt_baro,
    alt_geom: num(raw.alt_geom),
    ground_speed: num(raw.gs),
    track: num(raw.track),
    baro_rate: num(raw.baro_rate),
    geom_rate: num(raw.geom_rate),
    squawk: str(raw.squawk),
    emergency: str(raw.emergency),
    nav_modes,
    nic: num(raw.nic),
    nac_p: num(raw.nac_p),
    nac_v: num(raw.nac_v),
    rc: num(raw.rc),
    sil: num(raw.sil),
    sil_type: str(raw.sil_type),
    gva: num(raw.gva),
    sda: num(raw.sda),
    version: num(raw.version),
    nic_baro: num(raw.nic_baro),
    seen,
    seen_pos: num(raw.seen_pos),
    messages: num(raw.messages),
    rssi: num(raw.rssi),
    alert: bool(raw.alert),
    spi: bool(raw.spi),
    gps_ok_before: num(raw.gpsOkBefore ?? raw.gps_ok_before),
    last_contact: Math.floor(now / 1000 - Math.max(0, seen || 0)),
  }
}

const stale_snap = (snap: adsb_snapshot, msg: string): adsb_snapshot => ({
  ...snap,
  stale: true,
  source: { ...snap.source, state: "delayed", stale: true, error: msg },
})

const load = async (filter: string, lat: number, lon: number, radius: number, cacheKey: string): Promise<adsb_snapshot> => {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12_000)
  try {
    let fetchUrl = `https://api.adsb.lol/v2/point/0/0/25000`
    if (filter === "mil") fetchUrl = "https://api.adsb.lol/v2/mil"
    else if (filter === "ladd") fetchUrl = "https://api.adsb.lol/v2/ladd"
    else if (filter === "pia") fetchUrl = "https://api.adsb.lol/v2/pia"
    
    const res = await fetch(fetchUrl, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" }
    })
    if (!res.ok) throw new Error(`adsb upstream ${res.status}`)
    const data = await res.json() as { ac?: unknown[] }
    const rows = Array.isArray(data.ac) ? data.ac : []
    const uniq = new Map<string, adsb_aircraft>()
    let rejected = 0
    const now = Date.now()
    for (const row of rows) {
      const item = row && typeof row === "object" ? normalize_adsb(row as Record<string, unknown>, now) : null
      if (!item) { rejected++; continue }
      uniq.set(item.hex, item)
    }
    const fetched_at = new Date(now).toISOString()
    const snap: adsb_snapshot = {
      fetched_at,
      stale: false,
      aircraft: [...uniq.values()],
      rejected,
      source: { id: "adsb", label: "adsb.lol", state: "live", fetched_at, count: uniq.size, stale: false, url: fetchUrl },
    }
    cache.set(cacheKey, { at: now, snap })
    return snap
  } finally {
    clearTimeout(timer)
  }
}

export const get_adsb_snapshot = async (filter = "all", lat = 0, lon = 0, radius = 250): Promise<adsb_snapshot> => {
  const cacheKey = `${filter}-${Math.round(lat)}-${Math.round(lon)}-${radius}`
  const now = Date.now()
  const cached = cache.get(cacheKey)
  if (cached && now - cached.at < fresh_ms) return cached.snap
  const pend = pending.get(cacheKey)
  if (pend) return pend
  const p = load(filter, lat, lon, radius, cacheKey).catch(err => {
    const msg = err instanceof Error ? err.message : "adsb unavailable"
    if (cached && now - cached.at < stale_ms) return stale_snap(cached.snap, msg)
    throw err
  }).finally(() => { pending.delete(cacheKey) })
  pending.set(cacheKey, p)
  return p
}

export const clear_adsb_cache = () => { cache.clear(); pending.clear() }
