import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../lib/utils.js";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay({ className, ...props }) {
  return <DialogPrimitive.Overlay className={cn("fixed inset-0 z-[80] bg-[#10232c]/55 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out", className)} {...props} />;
}

export function DialogContent({ className, children, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        dir="rtl"
        className={cn("fixed left-1/2 top-1/2 z-[81] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/70 bg-white p-6 text-right text-lamseti-ink shadow-2xl outline-none", className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close aria-label="إغلاق النافذة" className="absolute left-4 top-4 grid size-9 place-items-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">×</DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
