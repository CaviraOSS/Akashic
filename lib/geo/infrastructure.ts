export const chokepoints = [
  { id: 'suez', name: 'suez canal', coords: [32.345, 30.585], risk: 85, alert: "high congestion" },
  { id: 'panama', name: 'panama canal', coords: [-79.919, 9.080], risk: 60, alert: "drought draft limits" },
  { id: 'hormuz', name: 'strait of hormuz', coords: [56.480, 26.567], risk: 95, alert: "military exercise zone" },
  { id: 'malacca', name: 'strait of malacca', coords: [100.8, 4.0], risk: 40, alert: "piracy risk" },
  { id: 'bab_el_mandeb', name: 'bab el-mandeb', coords: [43.4, 12.6], risk: 98, alert: "active conflict zone" }
]

export const subsea_cables = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "tat-14", stat: "active" },
      geometry: { type: "LineString", coordinates: [[-74.0, 40.7], [-10.0, 48.0], [1.0, 50.0]] }
    },
    {
      type: "Feature",
      properties: { name: "sea-me-we 5", stat: "degraded" },
      geometry: { type: "LineString", coordinates: [[103.8, 1.3], [80.0, 6.0], [43.4, 12.6], [32.3, 30.5], [15.0, 37.0]] }
    },
    {
      type: "Feature",
      properties: { name: "aae-1", stat: "active" },
      geometry: { type: "LineString", coordinates: [[114.1, 22.2], [100.8, 4.0], [56.4, 26.5], [43.4, 12.6], [32.3, 30.5], [5.3, 43.2]] }
    }
  ]
}

export const bad_guys = [
  { id: 'v-1', type: 'vessel', imo: '9123456', own: 'rostec', flag: 'ru', body: 'ofac' },
  { id: 'a-1', type: 'aircraft', hex: '15408a', own: 'mahan air', flag: 'ir', body: 'eu/ofac' }
]
