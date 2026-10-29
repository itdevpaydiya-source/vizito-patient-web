import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import {getPatientNotificationFeedApi,getUnreadNotificationCountApi,markAllNotificationsReadApi,markNotificationReadApi,type PatientNotification} from '../../services/notificationHelper';
interface Context {bellItems:PatientNotification[];unreadCount:number;loading:boolean;error:string|null;refresh:()=>Promise<void>;refreshCount:()=>Promise<void>;markAllRead:()=>Promise<void>;markRead:(id:string)=>Promise<number>;setUnreadCount:(n:number)=>void}
const C=createContext<Context|undefined>(undefined);
const authed=()=>Boolean(localStorage.getItem('vizito_token')||(()=>{try{const u=JSON.parse(localStorage.getItem('vizito_user')||'{}');return u?.token||u?.access_token;}catch{return false;}})());
const msg=(e:unknown)=>(e as {response?:{data?:{message?:string}}})?.response?.data?.message||(e as Error)?.message||'Failed to load notifications.';
export function NotificationsProvider({children}:{children:ReactNode}){
 const [bellItems,setBellItems]=useState<PatientNotification[]>([]),[unreadCount,setUnreadCount]=useState(0),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
 const refreshCount=useCallback(async()=>{if(!authed()){setUnreadCount(0);return;}try{setUnreadCount(await getUnreadNotificationCountApi());}catch(e){setError(msg(e));}},[]);
 const refresh=useCallback(async()=>{if(!authed()){setBellItems([]);setUnreadCount(0);return;}setLoading(true);setError(null);try{const f=await getPatientNotificationFeedApi({page:1,page_size:10,tab:'all'});setBellItems(f.items.slice(0,5));setUnreadCount(f.counts.unread);}catch(e){setError(msg(e));}finally{setLoading(false);}},[]);
 useEffect(()=>{void refresh();const update=()=>void refresh();window.addEventListener('vizito-auth-changed',update);window.addEventListener('storage',update);window.addEventListener('vizito-notifications-refresh',update);return()=>{window.removeEventListener('vizito-auth-changed',update);window.removeEventListener('storage',update);window.removeEventListener('vizito-notifications-refresh',update);};},[refresh]);
 useEffect(()=>{const tick=()=>document.visibilityState==='visible'&&void refresh();const timer=window.setInterval(tick,30000);window.addEventListener('focus',tick);return()=>{window.clearInterval(timer);window.removeEventListener('focus',tick);};},[refresh]);
 const markAllRead=useCallback(async()=>{setUnreadCount(0);setBellItems(v=>v.map(n=>({...n,unread:false})));try{await markAllNotificationsReadApi();await refreshCount();}catch(e){setError(msg(e));await refresh();}},[refresh,refreshCount]);
 const markRead=useCallback(async(id:string)=>{setBellItems(v=>v.map(n=>n.id===id?{...n,unread:false}:n));try{const n=await markNotificationReadApi(id);setUnreadCount(n);return n;}catch(e){setError(msg(e));await refresh();throw e;}},[refresh]);
 return <C.Provider value={{bellItems,unreadCount,loading,error,refresh,refreshCount,markAllRead,markRead,setUnreadCount}}>{children}</C.Provider>;
}
export const useNotifications=()=>{const v=useContext(C);if(!v)throw new Error('useNotifications must be used within a NotificationsProvider');return v;};
