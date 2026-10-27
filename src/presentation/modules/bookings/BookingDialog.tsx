import './BookingDialog.css';
import { useEffect, useRef, type ReactNode } from 'react';
export default function BookingDialog({
  label,
  onClose,
  children,
  className = '',
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    const escape = (event: Event) => {
      event.preventDefault();
      close.current();
    };
    dialog?.addEventListener('cancel', escape);
    return () => {
      dialog?.removeEventListener('cancel', escape);
      if(dialog?.open&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
        const bounds=dialog.getBoundingClientRect(),visual=dialog.cloneNode(true) as HTMLDialogElement;
        visual.removeAttribute('aria-label');visual.setAttribute('aria-hidden','true');visual.inert=true;
        visual.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
        Object.assign(visual.style,{position:'fixed',inset:'auto',left:`${bounds.left}px`,top:`${bounds.top}px`,width:`${bounds.width}px`,height:`${bounds.height}px`,margin:'0',pointerEvents:'none',zIndex:'999'});
        visual.classList.add('motion-exit');document.body.append(visual);
        visual.addEventListener('animationend',()=>visual.remove(),{once:true});window.setTimeout(()=>visual.remove(),250);
      }
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={`bk-dialog ${className}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const r = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      {children}
    </dialog>
  );
}
