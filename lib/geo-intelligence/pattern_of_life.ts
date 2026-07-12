import { prismaProxy as prisma } from "@/lib/db/prisma"




export interface pol_anomaly {
  id: string
  type: "flight" | "vessel"
  callsign: string
  lat: number
  lng: number
  deviation_score: number
  reason: string
}


const kmeans = (data: number[][], k: number, max_iter = 50) => {
  if (data.length === 0) return { centroids: [] as number[][], assignments: [] as number[] }
  let centroids = data.slice(0, k)
  let assignments = new Array(data.length).fill(0)

  for (let iter = 0; iter < max_iter; iter++) {
    let changed = false

    for (let i = 0; i < data.length; i++) {
      let min_dist = Infinity
      let best_c = 0
      for (let c = 0; c < k; c++) {
        const d = Math.hypot(data[i][0] - centroids[c][0], data[i][1] - centroids[c][1])
        if (d < min_dist) { min_dist = d; best_c = c }
      }
      if (assignments[i] !== best_c) {
        assignments[i] = best_c
        changed = true
      }
    }
    if (!changed) break

    const sums = Array.from({ length: k }, () => [0, 0])
    const counts = new Array(k).fill(0)
    for (let i = 0; i < data.length; i++) {
      sums[assignments[i]][0] += data[i][0]
      sums[assignments[i]][1] += data[i][1]
      counts[assignments[i]]++
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroids[c] = [sums[c][0] / counts[c], sums[c][1] / counts[c]]
      }
    }
  }
  return { centroids, assignments }
}

export const analyze_pattern_of_life = async (): Promise<pol_anomaly[]> => {
  const flights = await prisma.flight_tracking.findMany() as any[]
  const vessels = await prisma.vessel_tracking.findMany() as any[]

  const anomalies: pol_anomaly[] = []


  if (flights.length > 5) {
    const coords = flights.map(f => [f.lat, f.lng])
    const k = Math.max(1, Math.floor(flights.length / 5))
    const { centroids, assignments } = kmeans(coords, k)


    for (let i = 0; i < flights.length; i++) {
      const c = centroids[assignments[i]]
      const dist = Math.hypot(coords[i][0] - c[0], coords[i][1] - c[1])
      if (dist > 5) {
        anomalies.push({
          id: flights[i].id,
          type: "flight",
          callsign: flights[i].callsign || "UNKNOWN",
          lat: flights[i].lat,
          lng: flights[i].lng,
          deviation_score: Math.min(100, dist * 10),
          reason: "major deviation from standard flight corridor"
        })
      }
    }
  }


  if (vessels.length > 5) {
    const coords = vessels.map(v => [v.lat, v.lng])
    const k = Math.max(1, Math.floor(vessels.length / 5))
    const { centroids, assignments } = kmeans(coords, k)

    for (let i = 0; i < vessels.length; i++) {
      const c = centroids[assignments[i]]
      const dist = Math.hypot(coords[i][0] - c[0], coords[i][1] - c[1])
      if (dist > 3) {
        anomalies.push({
          id: vessels[i].id,
          type: "vessel",
          callsign: vessels[i].mmsi || vessels[i].vessel_id || "UNKNOWN",
          lat: vessels[i].lat,
          lng: vessels[i].lng,
          deviation_score: Math.min(100, dist * 15),
          reason: "anomalous maritime loitering or route deviation"
        })
      }
    }
  }

  return anomalies.sort((a, b) => b.deviation_score - a.deviation_score)
}
