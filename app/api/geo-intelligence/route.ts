export const dynamic = "force-dynamic";

import { NextResponse } from "next/server"
import { get_dynamic_geo_intel } from "@/lib/geo-intelligence/generator"
export const GET = async (req: Request) => {
  const url = new URL(req.url)
  const c = url.searchParams.get("country") || undefined
  const l = url.searchParams.get("layer") || undefined
  
  const d = await get_dynamic_geo_intel(c, l)
  return NextResponse.json(d)
}

