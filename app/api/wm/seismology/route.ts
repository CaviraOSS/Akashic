export const dynamic="force-dynamic"
import { NextResponse as res } from "next/server"

export const GET=async()=>{
  try{
    const f=await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",{next:{revalidate:3600}})
    if(!f.ok)throw new Error("err "+f.status)
    const d=await f.json()
    const evts=(()=>{
      return d.features.map((x:any)=>({id:x.id, title:x.properties.title, magnitude:x.properties.mag, lat:x.geometry.coordinates[1], lng:x.geometry.coordinates[0]}))
    })()
    return res.json({events:evts})
  }catch(e){
    return res.json({events:[]})
  }
}

