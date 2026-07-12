export const dynamic="force-dynamic"
export const maxDuration=300

import { NextResponse } from "next/server"
import { get_adsb_snapshot,type adsb_snapshot,type source_health } from "@/lib/live/adsb-live"
import { analyze_sigint,type sigint_analysis } from "@/lib/sigint/core"
import { get_sigint_context } from "@/lib/sigint/sources"

const empty_snap=(msg:string):adsb_snapshot=>{
  const fetched_at=new Date().toISOString()
  return{
    fetched_at,
    stale:true,
    aircraft:[],
    rejected:0,
    source:{id:"adsb",label:"adsb.lol",state:"unavailable",fetched_at:null,count:0,error:msg,url:"https://www.adsb.lol/docs/open-data/api/"},
  }
}

const num=(v:string|null)=>{
  const x=v===null?Number.NaN:Number(v)
  return Number.isFinite(x)?x:null
}

export async function GET(req:Request){
  const q=new URL(req.url).searchParams
  const lat=num(q.get("lat"))
  const lon=num(q.get("lon"))
  const country=q.get("country")
  const [adsb_res,context_res]=await Promise.allSettled([
    get_adsb_snapshot(),
    get_sigint_context({lat,lon,country}),
  ])
  const snap=adsb_res.status==="fulfilled"?adsb_res.value:empty_snap(adsb_res.reason instanceof Error?adsb_res.reason.message:"adsb unavailable")
  const analysis: sigint_analysis=analyze_sigint(snap)
  const context=context_res.status==="fulfilled"?context_res.value:{
    space_weather:{radio_scale:0,solar_scale:0,geomagnetic_scale:0,kp:null,alerts:[]},
    constellations:{satellites:[],systems:[]},
    aviation:[],
    news:[],
    network:null,
    place:null,
    sources:[{id:"context",label:"context sources",state:"unavailable",fetched_at:null,count:0,error:"context sources unavailable"} as source_health],
  }
  const sources=[snap.source,...context.sources]
  const bad=sources.filter(x=>x.state!=="live").length
  return NextResponse.json({
    ...analysis,
    degraded:bad>0,
    stats:{
      ...analysis.stats,
      healthy_sources:sources.length-bad,
      degraded_sources:bad,
    },
    context:{
      ...context,
      constellations:{...context.constellations,satellites:undefined},
    },
    sources,
  })
}
