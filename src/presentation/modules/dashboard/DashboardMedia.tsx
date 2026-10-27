import {useState} from 'react';
import {exploreAssets} from '../../../assets/explore';
import type {ProviderKind} from '../../components/ProviderCard';
const fallbackPhotos={doctor:exploreAssets.fallbacks.doctor,hospital:exploreAssets.fallbacks.hospital,lab:exploreAssets.fallbacks.lab,homecare:exploreAssets.fallbacks.homecare,pharmacy:exploreAssets.fallbacks.pharmacy,equipment:exploreAssets.fallbacks.equipment,ambulance:exploreAssets.fallbacks.ambulance,bloodbank:exploreAssets.fallbacks.bloodbank,other:exploreAssets.tiles.allProviders};
export default function DashboardMedia({src,name,kind}:{src?:string|null;name:string;kind:ProviderKind}){
 const [failed,setFailed]=useState<string|null>(null),url=src?.trim();
 const real=url&&failed!==url;
 const resolved=url?(/^(https?:|blob:|data:|\/images\/)/i.test(url)?url:`${String(import.meta.env.VITE_API_URL||'http://localhost:3000').replace(/\/$/,'')}/${url.replace(/^\//,'')}`):'';
 return <span className="dash-provider-photo" title={!real?'Representative image':undefined}>{real?<img src={resolved} alt={name} loading="lazy" onError={()=>setFailed(url)} onLoad={e=>{if(e.currentTarget.naturalWidth<48||e.currentTarget.naturalHeight<48)setFailed(url);}}/>:<><img src={fallbackPhotos[kind]} alt={`${name}: representative image`} loading="lazy"/></>}</span>;
}
