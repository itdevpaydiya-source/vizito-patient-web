import {Children,Fragment,isValidElement,useEffect,useId,useRef,type ReactNode,type ReactElement} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import './VizitoDialog.css';
type Props={title:string;onClose:()=>void;children:ReactNode;className?:string;footer?:ReactNode};
function flatten(nodes:ReactNode):ReactNode[]{return Children.toArray(nodes).flatMap(n=>isValidElement(n)&&n.type===Fragment?flatten((n as ReactElement<{children:ReactNode}>).props.children):[n]);}
export default function VizitoDialog({title,onClose,children,className='',footer}:Props){
 const ref=useRef<HTMLDialogElement>(null),close=useRef(onClose),id=useId();close.current=onClose;
 useEffect(()=>{const node=ref.current,previous=document.activeElement as HTMLElement|null;node?.showModal();const cancel=(event:Event)=>{event.preventDefault();close.current();};node?.addEventListener('cancel',cancel);return()=>{node?.removeEventListener('cancel',cancel);node?.close();if(previous?.isConnected)previous.focus({preventScroll:true});};},[]);
 const hasHeading=(n:ReactNode):boolean=>isValidElement(n)&&(['h1','h2','h3'].includes(String(n.type))||flatten((n as ReactElement<{children?:ReactNode}>).props.children).some(hasHeading));
 const nodes=flatten(children),header=nodes.find(n=>isValidElement(n)&&(n.type==='header'||['h1','h2','h3'].includes(String(n.type))))||nodes.find(n=>isValidElement(n)&&n.type==='div'&&hasHeading(n)&&flatten((n as ReactElement<{children?:ReactNode}>).props.children).every(c=>isValidElement(c)&&(['h1','h2','h3','p','button','span'].includes(String(c.type))||c.type==='div'&&hasHeading(c)))),actions=footer||nodes.find(n=>isValidElement(n)&&n.type==='footer')||nodes.findLast(n=>isValidElement(n)&&n.type==='div'&&flatten((n as ReactElement<{children?:ReactNode}>).props.children).length>0&&flatten((n as ReactElement<{children?:ReactNode}>).props.children).every(c=>isValidElement(c)&&c.type==='button'));
 const body=nodes.filter(n=>n!==header&&n!==actions);
 return createPortal(<dialog ref={ref} className={`vizito-dialog ${className}`} aria-labelledby={id} onKeyDown={e=>{if(e.key!=='Tab')return;const nodes=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled):not([type=hidden]),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')).filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden');const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===e.currentTarget)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close.current();}}}>
  <header className="vizito-dialog-header"><div id={id}>{header||<h2>{title}</h2>}</div><button className="vizito-dialog-close" type="button" aria-label={`Close ${title}`} onClick={()=>close.current()}><X size={20}/></button></header>
  <div className="vizito-dialog-body">{body}</div>{actions&&<footer className="vizito-dialog-footer">{actions}</footer>}
 </dialog>,document.body);
}
