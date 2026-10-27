import {createContext,useContext,useEffect,useRef,type ReactNode} from 'react';
import {useLocation} from 'react-router-dom';
import {useBookingGroups} from '../presentation/modules/bookings/bookingOverviewData';
const BookingActivityContext=createContext<ReturnType<typeof useBookingGroups>|null>(null);
export function BookingActivityProvider({children}:{children:ReactNode}){
 const activity=useBookingGroups(),{pathname}=useLocation(),previous=useRef(pathname);
 useEffect(()=>{if(previous.current!==pathname){previous.current=pathname;activity.reload();}},[pathname,activity.reload]);
 useEffect(()=>{const refresh=()=>activity.reload();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[activity.reload]);
 return <BookingActivityContext.Provider value={activity}>{children}</BookingActivityContext.Provider>;
}
export function useBookingActivity(){const context=useContext(BookingActivityContext);if(!context)throw new Error('BookingActivityProvider is required');return context;}
