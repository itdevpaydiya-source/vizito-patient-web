import React from 'react';
import {createRoot} from 'react-dom/client';
import MediaImage from '../../src/presentation/components/MediaImage';
const host=document.createElement('div');host.id='media-check';Object.assign(host.style,{position:'fixed',top:'80px',left:'300px',width:'120px',height:'100px',zIndex:'100'});document.body.append(host);
const root=createRoot(host);
(window as any).renderMedia=(src:string|null)=>root.render(<MediaImage src={src} name="Media validation" kind="equipment" category="MONITOR" style={{width:'120px',height:'100px'}}/>);
(window as any).renderMedia(null);
