export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { fetchLiveCountry } from "@/lib/geo-intelligence/engine-news"
export async function GET(req: NextRequest, props: { params: Promise<{ iso: string }> }) {
  const params = await props.params;
  const code = params.iso.toLowerCase()

  try {
    const cachePath = path.join(process.cwd(), 'data/countries-cache.json')
    const fileData = fs.readFileSync(cachePath, 'utf8')
    const cache = JSON.parse(fileData)


    let data = cache[code]
    if (!data) {
      data = Object.values(cache).find((c: any) => c.iso3?.toLowerCase() === code)
    }
    if (!data) return NextResponse.json({ error: "country not found" }, { status: 404 })
    const latestNews = await fetchLiveCountry(data.name)
    return NextResponse.json({ ...data, latestNews })
  } catch (err) {
    console.error("Cache read error:", err)
    return NextResponse.json({ error: "internal server error" }, { status: 500 })
  }
}

