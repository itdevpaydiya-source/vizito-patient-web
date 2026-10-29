import {useEffect,useRef} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {ProviderItem} from '../../../services/types';
import type {SearchArea} from '../../../services/location';

const icon=(colour:string,label:string)=>L.divIcon({className:'',html:`<span class="hj-map-pin" style="--pin:${colour}">${label}</span>`,iconSize:[30,38],iconAnchor:[15,38]});

export default function HospitalResultsMap({area,providers,onOpen}:{area:SearchArea|null;providers:ProviderItem[];onOpen:(provider:ProviderItem)=>void}){
 const box=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!box.current||!area)return;
  const map=L.map(box.current,{scrollWheelZoom:false,attributionControl:true}).setView([area.lat,area.lng],12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const bounds:[number,number][]=[[area.lat,area.lng]];
  L.marker([area.lat,area.lng],{icon:icon('#08746e','●'),title:'Your location'}).addTo(map).bindTooltip('Your location');
  providers.forEach((p,index)=>{const location=p.org?.locations.find(l=>l.pin)?.pin;if(!location)return;bounds.push([location.lat,location.lng]);const marker=L.marker([location.lat,location.lng],{icon:icon('#f26708',String(index+1)),title:p.name}).addTo(map).bindTooltip(p.name);marker.on('click',()=>onOpen(p));});
  if(bounds.length>1)map.fitBounds(bounds,{padding:[28,28],maxZoom:14});
  return()=>{map.remove();};
 },[area,providers,onOpen]);
 if(!area)return <div className="hj-map-empty">Choose a location to view the map.</div>;
 return <div ref={box} className="hj-results-map-canvas" role="img" aria-label="Map showing your location and nearby hospitals"/>;
}
