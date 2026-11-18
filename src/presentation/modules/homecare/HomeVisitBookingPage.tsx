import {useEffect,useState} from 'react';
import {Link,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import {ChevronRight} from 'lucide-react';
import {useBookingFamily} from '../family/BookingForChip';
import {homeVisitOfferApi,labError,type HomeVisitDoctor} from '../../../services/labHelper';
import {DoctorHomeVisit} from '../consultations/DoctorHomeVisit';
import '../consultations/DoctorJourney.css';

const istDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

/** Home care › Doctor at home › Book: the doctor home-visit booking on its own page (deep-linkable, Back works). */
export default function HomeVisitBookingPage(){
 const {doctorId=''}=useParams();
 const [params]=useSearchParams();
 const navigate=useNavigate();
 const pincode=params.get('pincode')||'';
 const [who,setWho]=useState('');
 const {family}=useBookingFamily(setWho);
 const [offer,setOffer]=useState<HomeVisitDoctor|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;homeVisitOfferApi(doctorId,istDay()).then(o=>{if(alive)setOffer(o);}).catch(e=>{if(alive)setError(labError(e,'This doctor’s home visit details could not be loaded.'));});return()=>{alive=false;};},[doctorId,retry]);
 const back=()=>{const q=new URLSearchParams({tab:'doctor'});if(pincode)q.set('pincode',pincode);navigate(`/home-care?${q}`);};
 return <div className="dj" style={{maxWidth:1100}}>
  <nav className="dj-breadcrumb" aria-label="Breadcrumb"><Link to="/home-care">Home care</Link><ChevronRight size={14}/><button type="button" onClick={back}>Doctor at home</button><ChevronRight size={14}/><span>{offer?.name||'Book a visit'}</span></nav>
  {error?<div className="dj-state" role="alert"><h2>Can’t open this booking</h2><p>{error}</p><button onClick={()=>{setError('');setRetry(n=>n+1);}}>Retry</button> <button onClick={back}>See other doctors</button></div>
   :!offer?<div className="dj-panel" aria-busy="true"><p role="status">Loading the doctor’s home visit details…</p></div>
   :<DoctorHomeVisit doctor={{id:offer.doctor_partner_id,name:offer.name}} offer={offer} pincode={pincode} family={family} who={who} onWho={setWho} onBack={back} backLabel="Back to doctors"/>}
 </div>;
}
