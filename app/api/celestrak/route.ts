export const dynamic="force-dynamic"

import { NextResponse } from "next/server"
import { get_celestrak } from "@/lib/sigint/sources"

export async function GET(){
  const res=await get_celestrak()
  return NextResponse.json({
    fetchedAt:res.source.fetched_at,
    count:res.data.satellites.length,
    systems:res.data.systems,
    source:res.source,
    satellites:res.data.satellites.map(x=>({id:x.id,name:x.name,line1:x.line1,line2:x.line2})),
  })
}
