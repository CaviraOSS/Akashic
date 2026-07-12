export const dynamic="force-dynamic"
import { NextResponse as res } from "next/server"

export const GET=async()=>{
  try{
    const f=await fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventlist=DR",{next:{revalidate:3600}})
    if(!f.ok)throw new Error("err "+f.status)
    const d=await f.json()
    const evts=(()=>{
      return (d.features||[]).map((x:any)=>({id:`disp-${x.properties.eventid}`, title:`drought ${x.properties.eventname}`, lat:x.geometry.coordinates[1], lng:x.geometry.coordinates[0]}))
    })()
    return res.json({events:evts})
  }catch(e){
    return res.json({events:[]})
  }
}

