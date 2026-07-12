


import { prismaProxy as prisma } from "@/lib/db/prisma"
const earth_radius_km = 6371.0


const rad = (deg: number) => deg * (Math.PI / 180)


export const haversine_dist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const d_lat = rad(lat2 - lat1)
  const d_lon = rad(lon2 - lon1)
  const a = Math.sin(d_lat / 2) * Math.sin(d_lat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
    Math.sin(d_lon / 2) * Math.sin(d_lon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earth_radius_km * c
}



export const get_bbox = (lat: number, lng: number, radius_km: number) => {
  const d_lat = radius_km / 111.045
  const d_lng = radius_km / (111.045 * Math.cos(rad(lat)))
  return {
    min_lat: lat - d_lat,
    max_lat: lat + d_lat,
    min_lng: lng - d_lng,
    max_lng: lng + d_lng
  }
}

export type proximity_result = {
  events: any[]
  assets: any[]
  vessels: any[]
  flights: any[]
}



export const find_nodes_in_proximity = async (lat: number, lng: number, radius_km: number): Promise<proximity_result> => {
  const box = get_bbox(lat, lng, radius_km)


  const locs = await prisma.location.findMany({
    where: {
      lat: { gte: box.min_lat, lte: box.max_lat },
      lng: { gte: box.min_lng, lte: box.max_lng }
    },
    include: { events: true, assets: true }
  }) as any[]


  const vessels = await prisma.vessel_tracking.findMany({
    where: {
      timestamp: { gte: new Date(Date.now() - 86400000) },
      lat: { gte: box.min_lat, lte: box.max_lat },
      lng: { gte: box.min_lng, lte: box.max_lng }
    },
    include: { vessel: true }
  })


  const flights = await prisma.flight_tracking.findMany({
    where: {
      timestamp: { gte: new Date(Date.now() - 3600000) },
      lat: { gte: box.min_lat, lte: box.max_lat },
      lng: { gte: box.min_lng, lte: box.max_lng }
    },
    include: { aircraft: true }
  })

  const res: proximity_result = { events: [], assets: [], vessels: [], flights: [] }


  for (const l of locs) {
    if (l.lat && l.lng) {
      const d = haversine_dist(lat, lng, l.lat, l.lng)
      if (d <= radius_km) {
        ; (l.events as any[]).forEach(e => res.events.push({ ...e, distance_km: d }))
          ; (l.assets as any[]).forEach(a => res.assets.push({ ...a, distance_km: d }))
      }
    }
  }

  for (const v of vessels) {
    const d = haversine_dist(lat, lng, v.lat, v.lng)
    if (d <= radius_km) res.vessels.push({ ...v, distance_km: d })
  }

  for (const f of flights) {
    const d = haversine_dist(lat, lng, f.lat, f.lng)
    if (d <= radius_km) res.flights.push({ ...f, distance_km: d })
  }


  res.events.sort((a, b) => a.distance_km - b.distance_km)
  res.assets.sort((a, b) => a.distance_km - b.distance_km)
  res.vessels.sort((a, b) => a.distance_km - b.distance_km)
  res.flights.sort((a, b) => a.distance_km - b.distance_km)

  return res
}



export const generate_spatial_density_grid = async (min_lat: number, max_lat: number, min_lng: number, max_lng: number, resolution = 0.5) => {
  const locs = await prisma.location.findMany({
    where: {
      lat: { gte: min_lat, lte: max_lat },
      lng: { gte: min_lng, lte: max_lng }
    },
    include: { events: true }
  })

  const grid = new Map<string, number>()
  for (const l of locs) {
    if (l.lat && l.lng && l.events.length > 0) {
      const g_lat = Math.floor(l.lat / resolution) * resolution
      const g_lng = Math.floor(l.lng / resolution) * resolution
      const key = `${g_lat.toFixed(2)},${g_lng.toFixed(2)}`
      grid.set(key, (grid.get(key) || 0) + l.events.length)
    }
  }

  return Array.from(grid.entries()).map(([k, v]) => {
    const [la, lo] = k.split(',').map(Number)
    return { lat: la, lng: lo, intensity: v }
  })
}

