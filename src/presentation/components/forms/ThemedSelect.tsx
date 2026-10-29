import {Children,isValidElement,useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode,type ReactElement,type SelectHTMLAttributes,type ChangeEvent} from 'react';
import {createPortal} from 'react-dom';
import {Check,ChevronDown} from 'lucide-react';
import './ThemedSelect.css';

type Props=Omit<SelectHTMLAttributes<HTMLSelectElement>,'onChange'|'children'|'multiple'|'size'> & {
 onChange?:(event:ChangeEvent<HTMLSelectElement>)=>void;children:ReactNode;
 ref?:React.Ref<HTMLSelectElement>;variant?:'auto'|'menu'|'cards';
};
function optionText(node:ReactNode):string{return Children.toArray(node).map(n=>isValidElement(n)?optionText((n as ReactElement<{children?:ReactNode}>).props.children):String(n??'')).join(' ');}
/** A single-choice listbox with native-style keyboard controls and a shared, theme-consistent popup. */
export default function ThemedSelect({'aria-label':providedLabel,value,defaultValue,onChange,disabled,children,variant='auto',className='',id:providedId,name,required,onBlur,onFocus,ref:forwardedRef,...rest}:Props){
  const flatten=(children:ReactNode):{value:string;label:ReactNode;disabled:boolean}[]=>Children.toArray(children).flatMap(child=>{
   if(!isValidElement(child))return [];
   const p=(child as ReactElement<{value?:string|number;children:ReactNode;disabled?:boolean}>).props;
   if(child.type==='option')return [{value:String(p.value??p.children??''),label:p.children,disabled:!!p.disabled}];
   return flatten(p.children).map(o=>({...o,disabled:o.disabled||!!p.disabled}));
  });
  const options=flatten(children),[localValue,setLocalValue]=useState(String(defaultValue??''));
  const [inferredLabel,setInferredLabel]=useState('');
  const group=useRef<HTMLDivElement>(null);
  const current=String(value??localValue),label=providedLabel||inferredLabel||name||'Choose an option';
  const cardChoices=options.filter(o=>o.value!=='');
  const cards=variant==='cards'||variant==='auto'&&cardChoices.length>=2&&cardChoices.length<=4;
  const id=useId(),button=useRef<HTMLButtonElement>(null),list=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false),[active,setActive]=useState(0),[position,setPosition]=useState<{left:number;top?:number;bottom?:number;width:number;maxHeight:number}>({left:0,top:0,width:200,maxHeight:280});
  useLayoutEffect(()=>{const control=button.current||group.current;const parent=control?.closest('label')||(providedId?document.querySelector(`label[for="${CSS.escape(providedId)}"]`):null)||control?.parentElement?.querySelector(':scope > label');if(parent&&!providedLabel){const text=Array.from(parent.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim()||parent.querySelector('span')?.textContent?.trim();if(text)setInferredLabel(text);}},[providedLabel,cards]);
  useLayoutEffect(()=>{if(cards&&forwardedRef){const node=group.current?.querySelector('button') as unknown as HTMLSelectElement|null;if(typeof forwardedRef==='function')forwardedRef(node);else forwardedRef.current=node;}},[cards,forwardedRef]);
  const typed=useRef({text:'',at:0});
  const selected=options.findIndex(o=>o.value===current);
  const choose=(index:number)=>{const option=options[index];if(!option||option.disabled)return;setLocalValue(option.value);onChange?.({target:{value:option.value,name:name||''},currentTarget:{value:option.value,name:name||''}} as ChangeEvent<HTMLSelectElement>);setOpen(false);button.current?.focus();};
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
  const hidden=<input type={required?'text':'hidden'} aria-hidden="true" tabIndex={-1} style={required?{position:'absolute',opacity:0,width:1,height:1,pointerEvents:'none'}:undefined} name={name} value={current} disabled={disabled} required={required} onChange={()=>{}} onInvalid={()=>{button.current?.focus();group.current?.querySelector<HTMLButtonElement>('button')?.focus();}}/>;
  if(cards)return <div ref={group} className={`vizito-option-cards ${className}`} role="radiogroup" aria-label={label} aria-required={required} id={providedId}>{hidden}{options.map((o,i)=>o.value===''?null:<button type="button" key={o.value} role="radio" aria-label={optionText(o.label)} data-option-value={o.value} aria-checked={o.value===current} disabled={disabled||o.disabled} tabIndex={o.value===current||selected<0&&o===cardChoices[0]||current===''&&o===cardChoices[0]?0:-1} onClick={()=>choose(i)} onKeyDown={e=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const direction=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;let next=e.key==='Home'?0:e.key==='End'?options.length-1:(i+direction+options.length)%options.length;for(let n=0;n<options.length&&(options[next].disabled||options[next].value==='');n++)next=(next+direction+options.length)%options.length;choose(next);Array.from(e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')||[]).find(b=>b.dataset.optionValue===options[next].value)?.focus();}}}><span className="vizito-option-dot"/>{o.label}{o.value===current&&<Check size={16}/>}</button>)}</div>;
  return <>{hidden}<button ref={node=>{button.current=node;if(typeof forwardedRef==='function')forwardedRef(node as unknown as HTMLSelectElement);else if(forwardedRef)forwardedRef.current=node as unknown as HTMLSelectElement;}} id={providedId} type="button" className={`themed-select ${className}`} role="combobox" aria-label={label} aria-required={required} aria-invalid={rest['aria-invalid']} aria-describedby={rest['aria-describedby']} onFocus={onFocus as unknown as React.FocusEventHandler<HTMLButtonElement>} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined} disabled={disabled} onClick={()=>open?setOpen(false):show()} onBlur={e=>{if(!list.current?.contains(e.relatedTarget as Node))setOpen(false);onBlur?.(e as unknown as React.FocusEvent<HTMLSelectElement>);}} onKeyDown={e=>{
    if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){
      e.preventDefault();if(!open){show();if(e.key==='Home')setActive(Math.max(0,options.findIndex(o=>!o.disabled)));else if(e.key==='End'){for(let i=options.length-1;i>=0;i--)if(!options[i].disabled){setActive(i);break;}}return;}if(e.key==='ArrowDown')move(1);else if(e.key==='ArrowUp')move(-1);else if(e.key==='Home')setActive(Math.max(0,options.findIndex(o=>!o.disabled)));else if(e.key==='End'){for(let i=options.length-1;i>=0;i--)if(!options[i].disabled){setActive(i);break;}}else choose(active);
    }else if(e.key==='Escape'){if(open){e.preventDefault();e.stopPropagation();setOpen(false);}}else if(e.key==='Tab')setOpen(false);else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){const now=Date.now();typed.current={text:(now-typed.current.at<700?typed.current.text:'')+e.key.toLowerCase(),at:now};const found=options.findIndex(o=>!o.disabled&&String(o.label).toLowerCase().startsWith(typed.current.text));if(found>=0){if(!open)show();setActive(found);}}
  }}><span>{options[selected]?.label??'Choose an option'}</span><ChevronDown aria-hidden="true"/></button>{open&&createPortal(<div ref={list} id={id} className="themed-select-menu" role="listbox" aria-label={`${label} options`} style={position}>{options.map((o,i)=><div key={o.value} id={`${id}-${i}`} data-index={i} role="option" aria-selected={o.value===current} aria-disabled={o.disabled||undefined} className={`themed-select-option ${active===i?'is-active':''}`} onPointerDown={e=>e.preventDefault()} onPointerMove={()=>{if(!o.disabled)setActive(i);}} onClick={e=>{e.stopPropagation();choose(i);}}><span>{o.label}</span>{o.value===current&&<Check aria-hidden="true"/>}</div>)}</div>,button.current?.closest('dialog[open]')||document.body)}</>;
}
