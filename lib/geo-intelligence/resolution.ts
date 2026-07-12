


import { entity } from "./types"
import { transform_result } from "./connector"

export const get_deterministic_id=(e:entity):string|null=>{
  if(e.type==="vessel"&&e.metadata?.imo)return `imo_${e.metadata.imo}`
  if(e.type==="vessel"&&e.metadata?.mmsi)return `mmsi_${e.metadata.mmsi}`
  if(e.type==="aircraft"&&e.metadata?.icao)return `icao_${e.metadata.icao}`
  if(e.type==="stock"&&e.name)return `ticker_${e.name.toUpperCase()}`
  if(e.type==="crypto"&&e.name)return `crypto_${e.name.toUpperCase()}`
  if(e.type==="cve"&&e.name.startsWith("cve-"))return `cve_${e.name.toLowerCase()}`
  if(e.type==="apt"&&e.name)return `apt_${e.name.toLowerCase().replace(/\s+/g,"_")}`
  if(e.type==="country"&&e.country_iso)return `iso3_${e.country_iso.toUpperCase()}`
  return null
}

export const clean_name=(name:string)=>{
  return name.toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim()
}

export const jaro_winkler=(s1:string,s2:string)=>{
  let m=0;
  if(s1===s2)return 1.0;
  if(!s1.length||!s2.length)return 0.0;
  const range=Math.floor(Math.max(s1.length,s2.length)/2)-1
  const match1=new Array(s1.length).fill(false)
  const match2=new Array(s2.length).fill(false)
  for(let i=0;i<s1.length;i++){
    const start=Math.max(0,i-range), end=Math.min(i+range+1,s2.length)
    for(let j=start;j<end;j++){
      if(!match2[j]&&s1[i]===s2[j]){
        match1[i]=true; match2[j]=true; m++; break;
      }
    }
  }
  if(!m)return 0.0;
  let t=0, k=0;
  for(let i=0;i<s1.length;i++){
    if(match1[i]){
      while(!match2[k])k++;
      if(s1[i]!==s2[k])t++;
      k++;
    }
  }
  t/=2.0;
  const weight=(m/s1.length + m/s2.length + (m-t)/m)/3.0;
  let l=0;
  const p=0.1;
  for(let i=0;i<Math.min(4,s1.length,s2.length);i++){
    if(s1[i]===s2[i])l++; else break;
  }
  return weight+(l*p*(1-weight));
}

export const calculate_similarity=(e1:entity,e2:entity)=>{
  if(e1.type!==e2.type)return 0.0
  const det1=get_deterministic_id(e1), det2=get_deterministic_id(e2)
  if(det1&&det2&&det1===det2)return 1.0
  
  const c1=clean_name(e1.name), c2=clean_name(e2.name)
  let score=jaro_winkler(c1,c2)
  
  
  if(e1.country_iso&&e2.country_iso&&e1.country_iso!==e2.country_iso)score*=0.5
  return score
}

export const merge_entities=(canonical:entity,duplicate:entity):entity=>{
  const merged={...canonical}
  merged.aliases=Array.from(new Set([...canonical.aliases,...duplicate.aliases,duplicate.name]))
  merged.confidence=Math.min(100,canonical.confidence+(duplicate.confidence*0.1))
  if(!merged.description&&duplicate.description)merged.description=duplicate.description
  if(!merged.country_iso&&duplicate.country_iso)merged.country_iso=duplicate.country_iso
  merged.metadata={...duplicate.metadata,...canonical.metadata} 
  return merged
}

export const resolve_graph=(raw_res:transform_result,db_entities:entity[])=>{
  
  
  const new_entities:entity[]=[]
  const merges:entity[]=[]
  const mappings=new Map<string,string>() 
  
  for(const raw_e of raw_res.entities){
    let matched=false
    
    
    const det_raw=get_deterministic_id(raw_e)
    for(const db_e of db_entities){
      const det_db=get_deterministic_id(db_e)
      if(det_raw&&det_db&&det_raw===det_db){
        mappings.set(raw_e.id,db_e.id)
        merges.push(merge_entities(db_e,raw_e))
        matched=true
        break
      }
    }
    if(matched)continue
    
    
    let best_score=0, best_db:entity|null=null
    for(const db_e of db_entities){
      const s=calculate_similarity(raw_e,db_e)
      if(s>best_score){best_score=s; best_db=db_e;}
    }
    if(best_db&&best_score>0.92){ 
      mappings.set(raw_e.id,best_db.id)
      merges.push(merge_entities(best_db,raw_e))
      matched=true
      continue
    }
    
    
    for(const new_e of new_entities){
      const s=calculate_similarity(raw_e,new_e)
      if(s>0.92){
        mappings.set(raw_e.id,new_e.id)
        
        Object.assign(new_e,merge_entities(new_e,raw_e))
        matched=true
        break
      }
    }
    
    
    if(!matched){
      new_entities.push(raw_e)
      mappings.set(raw_e.id,raw_e.id)
    }
  }
  
  
  const resolved_rels=raw_res.relationships.map(r=>({
    ...r,
    src_id: mappings.get(r.src_id)||r.src_id, 
    dst_id: mappings.get(r.dst_id)||r.dst_id
  }))
  
  return {
    resolved_entities: new_entities, 
    updated_entities: merges, 
    resolved_relationships: resolved_rels,
    id_map: mappings
  }
}
