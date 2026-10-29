import {useLayoutEffect,useRef} from 'react';
import {useLocation,useNavigationType} from 'react-router-dom';

/** The portal scrolls its main element, rather than window. Store positions per history entry. */
export default function PortalScrollRestoration(){
 const location=useLocation(),navigation=useNavigationType(),positions=useRef(new Map<string,number>()),lastKey=useRef<string|null>(null);
 useLayoutEffect(()=>{
  const main=document.querySelector('main');if(!main)return;
  const old=history.scrollRestoration;history.scrollRestoration='manual';
  const entryChanged=lastKey.current!==location.key;lastKey.current=location.key;
  const restoreHistory=navigation==='POP'&&entryChanged&&positions.current.has(location.key);
  const target=restoreHistory?(positions.current.get(location.key)||0):0;
  const section=new URLSearchParams(location.search).get('section');
  let anchorId=section||'';try{if(location.hash)anchorId=decodeURIComponent(location.hash.slice(1));}catch{anchorId=location.hash.slice(1);}
  let touched=false,frame=0;
  const restore=()=>{
   if(touched)return;
   const hash=!restoreHistory&&anchorId?(document.getElementById(anchorId)||document.getElementById('ph-'+anchorId)):null;
   if(hash)main.scrollTop=Math.max(0,main.scrollTop+hash.getBoundingClientRect().top-main.getBoundingClientRect().top-16);
   else main.scrollTop=target;
  };
  main.scrollTop=0;restore();
  // Async details can initially be too short to restore the saved offset.
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(restore);});
  if(main.firstElementChild)observer.observe(main.firstElementChild);
  const user=()=>{touched=true;observer.disconnect();};
  const save=()=>positions.current.set(location.key,main.scrollTop);
  main.addEventListener('scroll',save,{passive:true});main.addEventListener('wheel',user,{passive:true});main.addEventListener('touchstart',user,{passive:true});main.addEventListener('keydown',user);
  return()=>{positions.current.set(location.key,main.scrollTop);observer.disconnect();cancelAnimationFrame(frame);main.removeEventListener('scroll',save);main.removeEventListener('wheel',user);main.removeEventListener('touchstart',user);main.removeEventListener('keydown',user);history.scrollRestoration=old;};
 },[location.key,location.hash,location.search,navigation]);
 return null;
}
