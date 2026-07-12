export const dynamic = "force-dynamic"

import { clean_recon_location, normalize_recon_geocode_row } from "@/lib/recon/core"

const cache = new Map<string, { at: number; data: any }>()
const ttl = 24 * 60 * 60 * 1000
const ua = "Akashic/1.0 public recon geocoder"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = clean_recon_location(url.searchParams.get("location") || url.searchParams.get("q") || "")
  if (!q) return Response.json({ found: false, error: "usable location required" }, { status: 400 })

  const key = q.toLowerCase()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttl) return Response.json(hit.data)

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&addressdetails=1`, {
      headers: { "User-Agent": ua, Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) {
      const data = { found: false, query: q, error: `geocoder ${res.status}` }
      cache.set(key, { at: Date.now(), data })
      return Response.json(data)
    }
    const rows = await res.json()
    const geo = Array.isArray(rows) ? normalize_recon_geocode_row(rows[0], q) : null
    const data = geo ? { found: true, query: q, ...geo, source: "nominatim" } : { found: false, query: q }
    cache.set(key, { at: Date.now(), data })
    return Response.json(data)
  } catch (err) {
    return Response.json({ found: false, query: q, error: err instanceof Error ? err.message : String(err) })
  }
}
