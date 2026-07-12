export const dynamic="force-dynamic"
import { NextResponse as res } from "next/server"

export const GET=async()=>{
  try{
    const f=await fetch("https://api.coingecko.com/api/v3/global",{next:{revalidate:3600}})
    if(!f.ok)throw new Error("err "+f.status)
    const d=await f.json()
    const evts=(()=>{
      return [{id:"fc-1", title:"global crypto market cap", value:d.data.total_market_cap.usd, lat:0, lng:0}]
    })()
    return res.json({events:evts})
  }catch(e){
    return res.json({events:[]})
  }
}

