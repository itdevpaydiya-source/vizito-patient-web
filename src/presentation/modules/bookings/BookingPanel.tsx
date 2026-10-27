import type {ReactNode} from 'react';
export default function BookingPanel({title,icon,children,className=''}:{title:string;icon:ReactNode;children:ReactNode;className?:string}) {
 return <section className={`po-panel ${className}`} aria-label={title}><h2>{icon}{title}</h2>{children}</section>;
}
