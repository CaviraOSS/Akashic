export const dynamic="force-dynamic"
import { NextResponse as res } from "next/server"

export const GET=async()=>{
  try{
    const f=await fetch("https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&per_page=50",{next:{revalidate:3600}})
    if(!f.ok)throw new Error("err "+f.status)
    const d=await f.json()
    const evts=(()=>{
      return (d[1]||[]).map((x:any)=>({id:`eco-${x.countryiso3code}`, title:`gdp ${x.country.value}`, value:x.value, lat:0, lng:0}))
    })()
    return res.json({events:evts})
  }catch(e){
    return res.json({events:[]})
  }
}

