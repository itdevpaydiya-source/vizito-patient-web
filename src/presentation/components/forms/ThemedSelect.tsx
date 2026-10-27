import {Children,isValidElement,useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode,type ReactElement} from 'react';
import {createPortal} from 'react-dom';
import {Check,ChevronDown} from 'lucide-react';
import './ThemedSelect.css';

interface Props {
  'aria-label': string;
  value: string;
  onChange: (event:{target:{value:string}})=>void;
  disabled?: boolean;
  children: ReactNode;
}
/** A single-choice listbox with native-style keyboard controls and a shared, theme-consistent popup. */
export default function ThemedSelect({'aria-label':label,value,onChange,disabled,children}:Props){
  const options=Children.toArray(children).filter(isValidElement).map(child=>{
    const p=(child as ReactElement<{value?:string;children:ReactNode;disabled?:boolean}>).props;
    return {value:String(p.value??p.children??''),label:p.children,disabled:!!p.disabled};
  });
  const id=useId(),button=useRef<HTMLButtonElement>(null),list=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false),[active,setActive]=useState(0),[position,setPosition]=useState<{left:number;top?:number;bottom?:number;width:number;maxHeight:number}>({left:0,top:0,width:200,maxHeight:280});
  const typed=useRef({text:'',at:0});
  const selected=options.findIndex(o=>o.value===value);
  const choose=(index:number)=>{const option=options[index];if(!option||option.disabled)return;onChange({target:{value:option.value}});setOpen(false);button.current?.focus();};
  const show=()=>{setActive(Math.max(0,selected));setOpen(true);};
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{const rect=button.current?.getBoundingClientRect();if(!rect)return;const width=Math.min(Math.max(rect.width,180),innerWidth-24),height=Math.min(options.length*42+12,280),below=innerHeight-rect.bottom-12,above=rect.top-12,up=below<height&&above>below,maxHeight=Math.max(44,Math.min(height,up?above:below));setPosition({left:Math.max(12,Math.min(rect.left,innerWidth-width-12)),top:up?undefined:rect.bottom+6,bottom:up?innerHeight-rect.top+6:undefined,width,maxHeight});};
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,options.length]);
  useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!button.current?.contains(e.target as Node)&&!list.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
  useEffect(()=>{if(open)list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'});},[active,open]);
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  const move=(direction:number)=>{let i=active;for(let n=0;n<options.length;n++){i=(i+direction+options.length)%options.length;if(!options[i].disabled){setActive(i);break;}}};
  return <><button ref={button} type="button" className="themed-select" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined} disabled={disabled} onClick={()=>open?setOpen(false):show()} onBlur={e=>{if(!list.current?.contains(e.relatedTarget as Node))setOpen(false);}} onKeyDown={e=>{
    if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){
      e.preventDefault();if(!open){show();if(e.key==='Home')setActive(Math.max(0,options.findIndex(o=>!o.disabled)));else if(e.key==='End'){for(let i=options.length-1;i>=0;i--)if(!options[i].disabled){setActive(i);break;}}return;}if(e.key==='ArrowDown')move(1);else if(e.key==='ArrowUp')move(-1);else if(e.key==='Home')setActive(Math.max(0,options.findIndex(o=>!o.disabled)));else if(e.key==='End'){for(let i=options.length-1;i>=0;i--)if(!options[i].disabled){setActive(i);break;}}else choose(active);
    }else if(e.key==='Escape'){if(open){e.preventDefault();e.stopPropagation();setOpen(false);}}else if(e.key==='Tab')setOpen(false);else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){const now=Date.now();typed.current={text:(now-typed.current.at<700?typed.current.text:'')+e.key.toLowerCase(),at:now};const found=options.findIndex(o=>!o.disabled&&String(o.label).toLowerCase().startsWith(typed.current.text));if(found>=0){if(!open)show();setActive(found);}}
  }}><span>{options[selected]?.label??'Choose an option'}</span><ChevronDown aria-hidden="true"/></button>{open&&createPortal(<div ref={list} id={id} className="themed-select-menu" role="listbox" aria-label={`${label} options`} style={position}>{options.map((o,i)=><div key={o.value} id={`${id}-${i}`} data-index={i} role="option" aria-selected={o.value===value} aria-disabled={o.disabled||undefined} className={`themed-select-option ${active===i?'is-active':''}`} onPointerDown={e=>e.preventDefault()} onPointerMove={()=>{if(!o.disabled)setActive(i);}} onClick={e=>{e.stopPropagation();choose(i);}}><span>{o.label}</span>{o.value===value&&<Check aria-hidden="true"/>}</div>)}</div>,document.body)}</>;
}
