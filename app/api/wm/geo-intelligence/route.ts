export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { get_worldmonitor_feed } from "@/lib/geo-intelligence/worldmonitor-feed"

export const GET = async () => {
  const feed = get_worldmonitor_feed()
  return NextResponse.json(feed)
}

