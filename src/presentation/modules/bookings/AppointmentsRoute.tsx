import {useSearchParams} from 'react-router-dom';
import DoctorAppointmentsScreen from './DoctorAppointmentsScreen';
import BookingServiceListScreen from './BookingServiceListScreen';
export default function AppointmentsRoute(){const [params]=useSearchParams();const type=params.get('type');return type==='Doctor'||type==='Hospital'?<DoctorAppointmentsScreen key={type} type={type}/>:<BookingServiceListScreen/>;}
