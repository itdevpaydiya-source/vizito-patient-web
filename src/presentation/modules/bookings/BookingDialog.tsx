import VizitoDialog from '../../components/dialogs/VizitoDialog';
import type {ReactNode} from 'react';
import './BookingDialog.css';
export default function BookingDialog({label,onClose,children,className=''}:{label:string;onClose:()=>void;children:ReactNode;className?:string}){return <VizitoDialog title={label} onClose={onClose} className={`bk-dialog ${className}`}>{children}</VizitoDialog>;}
