export const dynamic="force-dynamic"
import { NextResponse as res } from "next/server"

export const GET=async()=>{
  try{
    const f=await fetch("https://api.coingecko.com/api/v3/search/trending",{next:{revalidate:3600}})
    if(!f.ok)throw new Error("err "+f.status)
    const d=await f.json()
    const evts=(()=>{
      return (d.coins||[]).map((x:any)=>({id:x.item.id, title:x.item.name, value:x.item.price_btc, lat:0, lng:0}))
    })()
    return res.json({events:evts})
  }catch(e){
    return res.json({events:[]})
  }
}

