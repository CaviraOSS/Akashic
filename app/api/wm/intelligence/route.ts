export const dynamic="force-dynamic"
import { NextResponse as res } from "next/server"

export const GET=async()=>{
  try{
    const f=await fetch("https://api.spaceflightnewsapi.net/v4/reports/",{next:{revalidate:3600}})
    if(!f.ok)throw new Error("err "+f.status)
    const d=await f.json()
    const evts=(()=>{
      return d.results.map((x:any)=>({id:`int-${x.id}`, title:x.title, lat:0, lng:0}))
    })()
    return res.json({events:evts})
  }catch(e){
    return res.json({events:[]})
  }
}

