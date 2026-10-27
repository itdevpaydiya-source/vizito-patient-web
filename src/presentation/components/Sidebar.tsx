import type {ElementType} from 'react';
import {Link as NavLink,useLocation,useNavigate} from 'react-router-dom';
import {Ambulance,Building2,CalendarDays,Droplet,FlaskConical,HeartPulse,Home,LogOut,Pill,SearchCheck,Settings,Stethoscope,Users,ClipboardList,CircleHelp,X} from 'lucide-react';
import logoImg from '../../assets/vizito_logo.png';
import {useBookingActivity} from '../../services/BookingActivityContext';
import './Sidebar.css';
interface SidebarProps {isOpen?:boolean;onClose?:()=>void}
export function sidebarDestination(path:string){
 if(['/bookings','/lab-bookings','/my-consultations','/appointments','/pharmacy-orders','/ambulance-trips','/blood-requests'].some(p=>path===p||path.startsWith(p+'/'))&&path!=='/pharmacy-orders/new')return '/bookings';
 if(path.startsWith('/equipment-rental/orders'))return '/bookings';
 if(path.startsWith('/equipment-rental'))return '/equipment-rental';
 if(['/find-blood','/request-blood','/donate-blood'].includes(path))return '/find-blood';
 if(path.startsWith('/lab-tests'))return '/lab-tests';
 if(['/book-ambulance','/urgent-ambulance','/ambulance-dispatch'].includes(path))return '/book-ambulance';
 if(path.startsWith('/home-care')||path==='/homecare-services')return '/home-care';
 if(path==='/settings')return '/profile';
 return path;
}
const care:[string,string,ElementType][]=[['/healthcare-services','Explore services',SearchCheck],['/find-doctors','Doctors',Stethoscope],['/find-hospitals','Hospitals & Clinics',Building2],['/lab-tests','Lab Tests',FlaskConical],['/home-care','Home Care',HeartPulse],['/pharmacy-orders/new','Pharmacy',Pill],['/equipment-rental','Medical Equipment',Building2],['/book-ambulance','Ambulance',Ambulance],['/find-blood','Blood (Find & Donate)',Droplet]];
export default function Sidebar({isOpen=false,onClose}:SidebarProps){
 const navigate=useNavigate(),location=useLocation(),{groups}=useBookingActivity();
 const ready=Object.values(groups).every(g=>g.state==='ready');
 const upcoming=ready?Object.values(groups).reduce((count,g)=>count+g.bookings.filter(b=>b.section==='upcoming').length,0):0;
 const selected=sidebarDestination(location.pathname);
 const item=(to:string,label:string,Icon:ElementType,badge=false)=><NavLink key={to} to={to} onClick={onClose} aria-current={selected===to?'page':false} className={`sidebar-link ${selected===to?'is-active':''}`}><Icon aria-hidden="true"/><span>{label}</span>{badge&&upcoming>0&&<b className="sidebar-count" aria-label={`${upcoming} upcoming bookings`}>{upcoming}</b>}</NavLink>;
 return <aside className={`patient-sidebar fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen?'translate-x-0':'-translate-x-full'}`} aria-label="Main navigation">
 <div className="sidebar-brand"><button onClick={()=>{navigate('/dashboard');onClose?.();}} aria-label="Vizito home"><img src={logoImg} alt="Vizito"/><span><strong>vizito</strong><small>Your Health. Connected.</small></span></button><button className="sidebar-close lg:hidden" onClick={onClose} aria-label="Close navigation"><X/></button></div>
 <nav className="sidebar-navigation">{item('/dashboard','Dashboard',Home)}
 <section><h2>BOOK CARE</h2>{care.map(([to,label,Icon])=>item(to,label,Icon))}</section>
 <section><h2>MY ACTIVITY</h2>{item('/bookings','Bookings',CalendarDays,true)}</section>
 <section><h2>MY HEALTH</h2>{item('/my-records','Medical Records',ClipboardList)}{item('/family-profiles','Family Members',Users)}</section>
 <section className="sidebar-account"><h2>ACCOUNT</h2>{item('/profile','Profile & Settings',Settings)}{item('/help','Help & Support',CircleHelp)}<button className="sidebar-link sidebar-logout" onClick={()=>{localStorage.removeItem('vizito_user');localStorage.removeItem('vizito_token');onClose?.();navigate('/auth/login');}}><LogOut aria-hidden="true"/><span>Logout</span></button></section>
 </nav></aside>;
}
