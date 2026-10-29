import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {Accessibility,AlertCircle,Ambulance,Bell,CalendarDays,CheckCircle2,CreditCard,Droplet,FileText,FlaskConical,HeartHandshake,Info,LifeBuoy,MoreHorizontal,Package,Search,X} from 'lucide-react';
import ThemedSelect from '../../components/forms/ThemedSelect';
import VizitoPagination from '../../components/navigation/VizitoPagination';
import {deleteNotificationApi,getPatientNotificationFeedApi,markNotificationUnreadApi,undoDeleteNotificationApi,type NotificationFeed,type NotificationTab,type PatientNotification} from '../../../services/notificationHelper';
import {useNotifications} from '../../../store/notifications/NotificationsContext';
import './NotificationsScreen.css';

const tabs:{id:NotificationTab;label:string;Icon:typeof Bell}[]=[{id:'all',label:'All',Icon:Bell},{id:'unread',label:'Unread',Icon:Bell},{id:'appointments',label:'Appointments',Icon:CalendarDays},{id:'reports',label:'Lab & reports',Icon:FlaskConical},{id:'orders',label:'Orders',Icon:Package},{id:'payments',label:'Payments',Icon:CreditCard},{id:'support',label:'Support',Icon:LifeBuoy}];
const err=(e:unknown)=>(e as {response?:{data?:{message?:string}}})?.response?.data?.message||(e as Error)?.message||'Could not load notifications.';
const icon=(n:PatientNotification)=>{const t=`${n.type} ${n.target_type}`.toLowerCase();if(t.includes('ambulance'))return <Ambulance/>;if(t.includes('blood'))return <Droplet/>;if(t.includes('equipment'))return <Accessibility/>;if(t.includes('lab'))return <FlaskConical/>;if(t.includes('support'))return <LifeBuoy/>;if(t.includes('payment'))return <CreditCard/>;if(t.includes('pharmacy'))return <Package/>;if(t.includes('home'))return <HeartHandshake/>;if(t.includes('record')||t.includes('prescription'))return <FileText/>;return <CalendarDays/>;};
const bucket=(value:string)=>{const now=new Date(),d=new Date(value),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),day=new Date(d.getFullYear(),d.getMonth(),d.getDate()),days=Math.floor((today.getTime()-day.getTime())/86400000);return days===0?'Today':days===1?'Yesterday':days<7?'This week':'Earlier';};
const stamp=(value:string)=>{const d=new Date(value),b=bucket(value);return b==='Today'?d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}):b==='Yesterday'?`Yesterday, ${d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}`:d.toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});};
const family=(n:PatientNotification)=>n.family_member_name?`For ${n.family_relationship||n.family_member_name}`:null;
const money=(n:PatientNotification)=>n.amount==null?null:new Intl.NumberFormat('en-IN',{style:'currency',currency:n.currency||'INR',maximumFractionDigits:2}).format(n.amount);
const tone=(n:PatientNotification)=>{const t=`${n.type} ${n.target_type}`.toLowerCase();if(t.includes('ambulance'))return'ambulance';if(t.includes('lab')||t.includes('record')||t.includes('prescription'))return'lab';if(t.includes('appointment'))return'appointment';if(t.includes('pharmacy'))return'pharmacy';if(t.includes('home'))return'home';if(t.includes('payment'))return'payment';if(t.includes('support'))return'support';if(t.includes('blood'))return'blood';if(t.includes('equipment'))return'equipment';return'appointment';};
const action=(n:PatientNotification)=>{if(!n.target_path)return null;const t=`${n.type} ${n.target_type}`.toLowerCase();if(t.includes('ambulance'))return'Track status';if(t.includes('lab'))return t.includes('report')||n.group==='reports'?'View report':'Track status';if(n.group==='payments'||t.includes('payment'))return'View receipt';if(n.group==='support'||t.includes('support'))return'View reply';return'View details';};

export default function NotificationsScreen(){
 const navigate=useNavigate(),[params,setParams]=useSearchParams(),{markAllRead,markRead:contextMarkRead,setUnreadCount,refresh:refreshBell}=useNotifications();
 const tab=(tabs.some(t=>t.id===params.get('tab'))?params.get('tab'):'all') as NotificationTab,page=Math.max(1,Number(params.get('page'))||1),pageSize=params.get('pageSize')==='20'?20:10,q=params.get('q')||'',range=params.get('range')||'all';
 const [search,setSearch]=useState(q),[feed,setFeed]=useState<NotificationFeed|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [pinHidden,setPinHidden]=useState(false);
 const [deleted,setDeleted]=useState<{id:string;token:string}|null>(null),request=useRef(0),undoTimer=useRef<number|null>(null);
 const dates=useMemo(()=>{if(range==='all')return{};const end=new Date(),start=new Date();start.setDate(end.getDate()-(range==='7'?6:29));return{date_from:start.toISOString().slice(0,10),date_to:end.toISOString().slice(0,10)};},[range]);
 const update=(patch:Record<string,string|null>)=>setParams(current=>{const next=new URLSearchParams(current);Object.entries(patch).forEach(([k,v])=>v&&v!=='all'?next.set(k,v):next.delete(k));return next;});
 useEffect(()=>{const timer=window.setTimeout(()=>{if(search!==q)update({q:search||null,page:null});},300);return()=>window.clearTimeout(timer);},[search,q]); // eslint-disable-line react-hooks/exhaustive-deps
 const load=useCallback(async()=>{const version=++request.current;setLoading(true);setError('');try{const data=await getPatientNotificationFeedApi({page,page_size:pageSize,tab,q:q||undefined,...dates});if(version!==request.current)return;setFeed(data);setUnreadCount(data.counts.unread);}catch(e){if(version===request.current)setError(err(e));}finally{if(version===request.current)setLoading(false);}},[page,pageSize,tab,q,dates,setUnreadCount]);
 useEffect(()=>{void load();return()=>{request.current++;};},[load]);
 useEffect(()=>()=>{if(undoTimer.current)window.clearTimeout(undoTimer.current);},[]);
 const open=async(n:PatientNotification)=>{if(!n.target_path)return;if(n.unread){try{await markRead(n.id);}catch{return;}}navigate(n.target_path);};
 const remove=async(n:PatientNotification)=>{try{const result=await deleteNotificationApi(n.id);setUnreadCount(result.unread_count);setDeleted({id:n.id,token:result.undo_token});setNotice('Notification deleted');if(undoTimer.current)window.clearTimeout(undoTimer.current);undoTimer.current=window.setTimeout(()=>setDeleted(null),10000);await load();}catch(e){setNotice(err(e));}};
 const undo=async()=>{if(!deleted)return;try{await undoDeleteNotificationApi(deleted.id,deleted.token);setDeleted(null);setNotice('Notification restored');await load();await refreshBell();}catch(e){setDeleted(null);setNotice(err(e));}};
 const allRead=async()=>{await markAllRead();setNotice('All notifications marked as read');await load();};
 const markRead=async(id:string)=>{const count=await contextMarkRead(id);setNotice('Notification marked as read');await load();return count;};
 const unread=async(n:PatientNotification)=>{try{await markNotificationUnreadApi(n.id);setNotice('Notification marked as unread');await load();await refreshBell();}catch(e){setNotice(err(e));}};
 const groups=['Today','Yesterday','This week','Earlier'].map(label=>({label,items:(feed?.items||[]).filter(n=>bucket(n.created_at)===label)})).filter(g=>g.items.length);
 return <main className="nt-page">
  <header className="nt-heading"><div><h1>Notifications</h1><p>Stay updated on your appointments, lab tests, orders and more.</p></div><button className="nt-link" onClick={()=>void allRead()} disabled={!feed?.counts.unread}><CheckCircle2/>Mark all as read</button></header>
  <nav className="nt-tabs" aria-label="Notification categories">{tabs.map(({id,label,Icon})=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>update({tab:id,page:null})}><Icon/>{label} <span>{feed?.counts[id]??'–'}</span>{id==='unread'&&!!feed?.counts.unread&&<i aria-label="Unread notifications"/>}</button>)}</nav>
  <section className="nt-tools"><label><Search/><input type="search" aria-label="Search notifications" placeholder="Search notifications" value={search} onChange={e=>setSearch(e.target.value)}/></label><ThemedSelect variant="menu" aria-label="Notification date range" value={range} onChange={e=>update({range:e.target.value,page:null})}><option value="all">All dates</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></ThemedSelect></section>
  {feed?.pinned&&!pinHidden&&<Pinned
    item={feed.pinned}
    onOpen={open}
    onClose={()=>setPinHidden(true)}
  />}
  {loading?<Loading/>:error?<State icon={<AlertCircle/>} title="Couldn't load notifications" text={error}><button onClick={()=>void load()}>Retry</button></State>:!feed?.items.length?q?<State icon={<Search/>} title="No notifications found" text="Try a different search or date range."/>:tab==='unread'?<State image="/images/healthcare/empty/empty-caught-up.webp" title="You're all caught up!" text="No unread notifications at the moment. We'll let you know when there's something new."/>:<State image="/images/healthcare/empty/empty-no-notifications.webp" title="No notifications yet" text="Book an appointment, lab test or order medicines to see updates here."><div><Link to="/doctors">Book a doctor</Link><Link to="/lab-tests">Book a lab test</Link></div></State>:groups.map(g=><section className="nt-group" key={g.label}><h2>{g.label} <span>({g.items.length})</span></h2><div>{g.items.map(n=><Row key={n.id} item={n} onOpen={open} onRead={markRead} onUnread={unread} onDelete={remove}/>)}</div></section>)}
  {!!feed?.total&&<VizitoPagination
    page={feed.page}
    pageSize={feed.page_size}
    total={feed.total}
    label="notifications"
    onPageChange={n=>update({page:String(n)})}
    onPageSizeChange={n=>update({pageSize:String(n),page:null})}
  />}
  <footer className="nt-footer"><Info/>SMS and email alerts are coming soon.</footer>
  {notice&&<div className="nt-toast" role="status"><span>{notice}</span>{deleted&&<button onClick={()=>void undo()}>Undo</button>}<button aria-label="Dismiss" onClick={()=>{setNotice('');setDeleted(null);}}><X/></button></div>}
 </main>;
}

function Row({item,onOpen,onRead,onUnread,onDelete}:{item:PatientNotification;onOpen:(n:PatientNotification)=>void;onRead:(id:string)=>Promise<number>;onUnread:(n:PatientNotification)=>void;onDelete:(n:PatientNotification)=>void}){const fam=family(item),amount=money(item),label=action(item);return <article className={`nt-row is-${tone(item)} ${item.unread?'is-unread':''}`}>{item.unread&&<i className="nt-unread-dot" aria-label="Unread"/>}<button className="nt-row-main" disabled={!item.target_path} onClick={()=>void onOpen(item)}><span className="nt-icon">{icon(item)}</span><span className="nt-copy"><strong>{item.title}</strong><span title={item.message}>{item.message}</span><small>{amount}{fam&&<em>{fam}</em>}</small></span><time dateTime={item.created_at}>{stamp(item.created_at)}</time></button>{label&&<button className="nt-action" onClick={()=>void onOpen(item)}>{label}</button>}<details className="nt-menu"><summary aria-label={`More actions for ${item.title}`}><MoreHorizontal/></summary><div>{item.unread?<button onClick={async()=>{await onRead(item.id);}}>Mark as read</button>:<button onClick={()=>void onUnread(item)}>Mark as unread</button>}<button className="danger" onClick={()=>void onDelete(item)}>Delete</button></div></details></article>;}
function Pinned({item,onOpen,onClose}:{item:PatientNotification;onOpen:(n:PatientNotification)=>void;onClose:()=>void}){return <aside className="nt-pinned"><span className="nt-icon"><Ambulance/></span><div><strong>{item.title}</strong><p>{item.message}</p><button disabled={!item.target_path} onClick={()=>void onOpen(item)}>Track ambulance</button></div><Ambulance className="nt-pinned-art" aria-hidden="true"/><button className="nt-pin-close" onClick={onClose} aria-label="Hide urgent notification"><X/></button></aside>;}
function Loading(){return <div className="nt-loading" aria-label="Loading notifications">{[1,2,3,4,5].map(n=><div key={n}><i/><span/><span/></div>)}</div>;}
function State({image,icon,title,text,children}:{image?:string;icon?:ReactNode;title:string;text:string;children?:ReactNode}){return <section className="nt-state">{image?<img src={image} alt=""/>:<span>{icon||<Bell/>}</span>}<h2>{title}</h2><p>{text}</p>{children}</section>;}
