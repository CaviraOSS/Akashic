


import { prismaProxy as prisma } from "@/lib/db/prisma"
import { haversine_dist, get_bbox } from "./spatial_engine"

const earth_radius_km = 6371.0


const rad = (deg: number) => deg * (Math.PI / 180)
const deg = (rad: number) => rad * (180 / Math.PI)


export const project_coordinate = (lat: number, lng: number, heading: number, speed_kmh: number, hours: number) => {
  const distance = speed_kmh * hours
  const d_div_r = distance / earth_radius_km

  const lat_r = rad(lat)
  const lng_r = rad(lng)
  const head_r = rad(heading)

  const target_lat_r = Math.asin(
    Math.sin(lat_r) * Math.cos(d_div_r) +
    Math.cos(lat_r) * Math.sin(d_div_r) * Math.cos(head_r)
  )

  let target_lng_r = lng_r + Math.atan2(
    Math.sin(head_r) * Math.sin(d_div_r) * Math.cos(lat_r),
    Math.cos(d_div_r) - Math.sin(lat_r) * Math.sin(target_lat_r)
  )


  target_lng_r = (target_lng_r + 3 * Math.PI) % (2 * Math.PI) - Math.PI

  return { lat: deg(target_lat_r), lng: deg(target_lng_r) }
}

export type collision_warning = {
  asset_type: "flight" | "vessel"
  asset_id: string
  identifier: string
  event_id: string
  event_title: string
  time_to_impact_hours: number
  collision_lat: number
  collision_lng: number
  risk_score: number
}



export const scan_global_interceptions = async (lookahead_hours = 2.0, conflict_radius_km = 50.0): Promise<collision_warning[]> => {

  const active_threats = await prisma.event.findMany({
    where: {
      status: "active",
      severity: { in: ["critical", "high"] },
      location_id: { not: null }
    },
    include: { location: true }
  }) as any[]

  const threats = active_threats.filter(t => t.location?.lat && t.location?.lng)
  if (threats.length === 0) return []


  const active_flights = await prisma.flight_tracking.findMany({
    where: {
      timestamp: { gte: new Date(Date.now() - 3600000) },
      heading: { not: null },
      speed: { not: null, gt: 50 }
    }
  })

  const warnings: collision_warning[] = []


  const time_steps = []
  for (let t = 0.25; t <= lookahead_hours; t += 0.25) time_steps.push(t)

  for (const f of active_flights) {
    if (!f.lat || !f.lng || !f.heading || !f.speed) continue


    const speed_kmh = f.speed * 1.852


    const end_pos = project_coordinate(f.lat, f.lng, f.heading, speed_kmh, lookahead_hours)
    const min_lat = Math.min(f.lat, end_pos.lat) - 1.0
    const max_lat = Math.max(f.lat, end_pos.lat) + 1.0
    const min_lng = Math.min(f.lng, end_pos.lng) - 1.0
    const max_lng = Math.max(f.lng, end_pos.lng) + 1.0

    const candidate_threats = threats.filter(t =>
      t.location!.lat! >= min_lat && t.location!.lat! <= max_lat &&
      t.location!.lng! >= min_lng && t.location!.lng! <= max_lng
    )

    if (candidate_threats.length === 0) continue


    let collided = false
    for (const t of time_steps) {
      if (collided) break
      const pos = project_coordinate(f.lat, f.lng, f.heading, speed_kmh, t)

      for (const threat of candidate_threats) {
        const dist = haversine_dist(pos.lat, pos.lng, threat.location!.lat!, threat.location!.lng!)
        if (dist <= conflict_radius_km) {
          warnings.push({
            asset_type: "flight",
            asset_id: f.aircraft_id,
            identifier: f.callsign || f.icao_hex || "UNKNOWN",
            event_id: threat.id,
            event_title: threat.title,
            time_to_impact_hours: t,
            collision_lat: pos.lat,
            collision_lng: pos.lng,
            risk_score: threat.severity === "critical" ? 100 : 80
          })
          collided = true
          break
        }
      }
    }
  }





  warnings.sort((a, b) => a.time_to_impact_hours - b.time_to_impact_hours)
  return warnings
}

