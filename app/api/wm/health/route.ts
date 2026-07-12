export const dynamic="force-dynamic"
import { NextResponse as res } from "next/server"

export const GET=async()=>{
  try{
    const f=await fetch("https://disease.sh/v3/covid-19/countries",{next:{revalidate:3600}})
    if(!f.ok)throw new Error("err "+f.status)
    const d=await f.json()
    const evts=(()=>{
      return d.map((x:any)=>({id:`hlth-${x.countryInfo.iso2}`, title:`cases ${x.country}`, value:x.cases, lat:x.countryInfo.lat, lng:x.countryInfo.long}))
    })()
    return res.json({events:evts})
  }catch(e){
    return res.json({events:[]})
  }
}

