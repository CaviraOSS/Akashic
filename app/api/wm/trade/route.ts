export const dynamic="force-dynamic"
import { NextResponse as res } from "next/server"

export const GET=async()=>{
  try{
    const f=await fetch("https://api.worldbank.org/v2/country/all/indicator/NE.EXP.GNFS.CD?format=json&per_page=50",{next:{revalidate:3600}})
    if(!f.ok)throw new Error("err "+f.status)
    const d=await f.json()
    const evts=(()=>{
      return (d[1]||[]).map((x:any)=>({id:`trd-${x.countryiso3code}`, title:`exports ${x.country.value}`, value:x.value, lat:0, lng:0}))
    })()
    return res.json({events:evts})
  }catch(e){
    return res.json({events:[]})
  }
}

