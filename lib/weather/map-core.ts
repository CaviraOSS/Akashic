export const weather_map_modes = [
  "radar",
  "precipitation",
  "wind",
  "wind_gusts",
  "temperature",
  "humidity",
  "pressure",
] as const

export const weather_field_blur_px = 4

export const weather_visuals = {
  field_opacity: 0.42,
  precipitation_opacity: 0.5,
  radar_opacity: 0.72,
  map_dim_opacity: 0.3,
  particle_count: 1800,
  particle_alpha_min: 0.5,
  particle_alpha_max: 0.9,
  particle_width_min: 0.85,
  particle_width_max: 1.8,
  particle_trail: 3.25,
  particle_flow_scale: 0.3,
} as const

export type weather_bounds = {
  west: number
  south: number
  east: number
  north: number
}

export type weather_grid = {
  bounds: weather_bounds
  cols: number
  rows: number
  step_lon: number
  step_lat: number
  key: string
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const q = (v: number, step: number) => Math.round(v / step) * step

export const weather_grid_spec = (raw: weather_bounds, zoom = 1): weather_grid => {
  const ok = [raw.west, raw.south, raw.east, raw.north, zoom].every(Number.isFinite)
  if (!ok || zoom < 2 || raw.east - raw.west >= 300) return {
    bounds: { west: -180, south: -85, east: 180, north: 85 },
    cols: 16,
    rows: 10,
    step_lon: 360 / 15,
    step_lat: 170 / 9,
    key: "global:16x10",
  }
  const west = clamp(raw.west, -180, 180)
  const east = clamp(raw.east, -180, 180)
  const south = clamp(raw.south, -85, 85)
  const north = clamp(raw.north, -85, 85)
  if (east <= west || north <= south) return weather_grid_spec({ west: -180, south: -85, east: 180, north: 85 }, 1)
  const lon_pad = Math.max(1, (east - west) * 0.08)
  const lat_pad = Math.max(1, (north - south) * 0.08)
  const bounds = {
    west: clamp(q(west - lon_pad, 0.5), -180, 180),
    south: clamp(q(south - lat_pad, 0.5), -85, 85),
    east: clamp(q(east + lon_pad, 0.5), -180, 180),
    north: clamp(q(north + lat_pad, 0.5), -85, 85),
  }
  const wide = zoom <= 2.5 || east - west >= 220
  const cols = wide ? 16 : 20
  const rows = wide ? 10 : 14
  const step_lon = (bounds.east - bounds.west) / (cols - 1)
  const step_lat = (bounds.north - bounds.south) / (rows - 1)
  return {
    bounds,
    cols,
    rows,
    step_lon,
    step_lat,
    key: `${bounds.west}:${bounds.south}:${bounds.east}:${bounds.north}:${cols}x${rows}`,
  }
}

export const weather_grid_points = (spec: weather_grid) => {
  const out: Array<{ lat: number; lon: number }> = []
  for (let row = 0; row < spec.rows; row++) {
    const lat = spec.bounds.north - row * spec.step_lat
    for (let col = 0; col < spec.cols; col++)out.push({
      lat: row === spec.rows - 1 ? spec.bounds.south : lat,
      lon: col === spec.cols - 1 ? spec.bounds.east : spec.bounds.west + col * spec.step_lon,
    })
  }
  return out
}

export type weather_mode = typeof weather_map_modes[number]

export type weather_vector = {
  lat: number
  lon: number
  u_ms?: number
  v_ms?: number
  speed_kmh: number
  direction_deg: number
  gust_kmh: number
  temperature_c: number
  humidity_pct: number
  pressure_hpa: number
  precipitation_mm: number
  cloud_cover_pct: number
}

export const weather_canvas_segments = [
  { id: "west", start: 0, end: 0.5, coordinates: [[-180, 85], [0, 85], [0, -85], [-180, -85]] },
  { id: "east", start: 0.5, end: 1, coordinates: [[0, 85], [180, 85], [180, -85], [0, -85]] },
] as const

export const weather_particle_x = (x: number, dx: number, width: number) => {
  const next = x + dx
  if (next < 0) return { x: next + width, wrapped: true }
  if (next >= width) return { x: next - width, wrapped: true }
  return { x: next, wrapped: false }
}

export const weather_particle_y = (y: number, dy: number, height: number, reset_y: number) => {
  const next = y + dy
  return next < 0 || next >= height ? { y: reset_y, reset: true } : { y: next, reset: false }
}

type color_stop = { v: number; c: [number, number, number] }
type weather_meta = {
  label: string
  unit: string
  min: number
  max: number
  legend: Array<{ v: number; label: string; color: string }>
}

const scales: Record<weather_mode, color_stop[]> = {
  radar: [
    { v: 0, c: [22, 45, 78] }, { v: 1, c: [39, 167, 224] }, { v: 5, c: [42, 211, 125] }, { v: 15, c: [250, 204, 21] }, { v: 35, c: [239, 68, 68] }, { v: 60, c: [168, 85, 247] },
  ],
  precipitation: [
    { v: 0, c: [30, 64, 175] }, { v: 0.5, c: [14, 165, 233] }, { v: 2, c: [34, 197, 94] }, { v: 8, c: [250, 204, 21] }, { v: 20, c: [249, 115, 22] }, { v: 50, c: [190, 24, 93] },
  ],
  wind: [
    { v: 0, c: [46, 49, 146] }, { v: 15, c: [37, 99, 175] }, { v: 30, c: [45, 179, 166] }, { v: 50, c: [160, 218, 127] }, { v: 75, c: [250, 204, 91] }, { v: 110, c: [220, 70, 76] },
  ],
  wind_gusts: [
    { v: 0, c: [44, 50, 132] }, { v: 25, c: [44, 117, 182] }, { v: 50, c: [39, 190, 143] }, { v: 80, c: [245, 212, 91] }, { v: 120, c: [238, 105, 61] }, { v: 180, c: [166, 43, 96] },
  ],
  temperature: [
    { v: -40, c: [72, 52, 172] }, { v: -10, c: [35, 132, 214] }, { v: 5, c: [77, 202, 204] }, { v: 20, c: [112, 211, 96] }, { v: 32, c: [250, 204, 68] }, { v: 45, c: [227, 70, 52] },
  ],
  humidity: [
    { v: 0, c: [94, 67, 46] }, { v: 25, c: [187, 136, 69] }, { v: 50, c: [187, 203, 102] }, { v: 70, c: [77, 180, 177] }, { v: 85, c: [40, 111, 180] }, { v: 100, c: [64, 50, 145] },
  ],
  pressure: [
    { v: 960, c: [89, 55, 163] }, { v: 980, c: [45, 117, 180] }, { v: 1000, c: [42, 183, 166] }, { v: 1015, c: [145, 210, 105] }, { v: 1030, c: [243, 202, 73] }, { v: 1050, c: [218, 84, 63] },
  ],
}

const hex = ([r, g, b]: [number, number, number]) => `#${[r, g, b].map(x => Math.round(x).toString(16).padStart(2, "0")).join("")}`
const legend = (mode: weather_mode) => scales[mode].map(x => ({ v: x.v, label: String(x.v), color: hex(x.c) }))

export const weather_mode_meta: Record<weather_mode, weather_meta> = {
  radar: { label: "radar", unit: "mm", min: 0, max: 60, legend: legend("radar") },
  precipitation: { label: "precipitation", unit: "mm", min: 0, max: 50, legend: legend("precipitation") },
  wind: { label: "wind speed", unit: "km/h", min: 0, max: 110, legend: legend("wind") },
  wind_gusts: { label: "wind gusts", unit: "km/h", min: 0, max: 180, legend: legend("wind_gusts") },
  temperature: { label: "temperature", unit: "°c", min: -40, max: 45, legend: legend("temperature") },
  humidity: { label: "humidity", unit: "%", min: 0, max: 100, legend: legend("humidity") },
  pressure: { label: "pressure", unit: "hpa", min: 960, max: 1050, legend: legend("pressure") },
}

export const weather_default_mode: weather_mode = "wind"

export const weather_value = (mode: weather_mode, v: weather_vector) => {
  if (mode === "wind") return v.speed_kmh
  if (mode === "wind_gusts") return v.gust_kmh
  if (mode === "temperature") return v.temperature_c
  if (mode === "humidity") return v.humidity_pct
  if (mode === "pressure") return v.pressure_hpa
  return v.precipitation_mm
}

export const weather_direction_arrow = (direction_deg: number) => {
  const arrows = ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
  const flow = ((direction_deg + 180) % 360 + 360) % 360
  return arrows[Math.round(flow / 45) % 8]
}

export const weather_value_label = (mode: weather_mode, v: weather_vector) => {
  if (mode === "wind") return `${Math.round(v.speed_kmh)} ${weather_direction_arrow(v.direction_deg)}`
  if (mode === "wind_gusts") return `${Math.round(v.gust_kmh)} ${weather_direction_arrow(v.direction_deg)}`
  if (mode === "temperature") return `${Math.round(v.temperature_c)}°`
  if (mode === "humidity") return `${Math.round(v.humidity_pct)}%`
  if (mode === "pressure") return String(Math.round(v.pressure_hpa))
  return String(Math.round(v.precipitation_mm * 10) / 10)
}

export const weather_color = (mode: weather_mode, value: number, alpha = 210): [number, number, number, number] => {
  const pts = scales[mode]
  const val = Number.isFinite(value) ? value : pts[0].v
  if (val <= pts[0].v) return [...pts[0].c, alpha]
  if (val >= pts.at(-1)!.v) return [...pts.at(-1)!.c, alpha]
  const hi = pts.findIndex(x => x.v >= val)
  const a = pts[hi - 1], b = pts[hi], t = (val - a.v) / (b.v - a.v)
  return [
    Math.round(a.c[0] + (b.c[0] - a.c[0]) * t),
    Math.round(a.c[1] + (b.c[1] - a.c[1]) * t),
    Math.round(a.c[2] + (b.c[2] - a.c[2]) * t),
    alpha,
  ]
}
