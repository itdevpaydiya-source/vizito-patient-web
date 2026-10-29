import VizitoDialog from '../../components/dialogs/VizitoDialog';
import type {ReactNode} from 'react';
export function PhDialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <VizitoDialog title={title} onClose={onClose} className="ph-dialog">{children}</VizitoDialog>;}
export const showValue = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? "Not added"
    : String(value);
export const phDate = (s: string | null | undefined) =>
  s
    ? new Date(s).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not recorded";
