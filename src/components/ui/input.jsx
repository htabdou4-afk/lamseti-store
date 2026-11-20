import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";

export const Input = forwardRef(function Input({ className, type = "text", ...props }, ref) {
  return <input ref={ref} type={type} className={cn("flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus-visible:border-lamseti-teal focus-visible:ring-4 focus-visible:ring-lamseti-teal/10 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn("min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus-visible:border-lamseti-teal focus-visible:ring-4 focus-visible:ring-lamseti-teal/10 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />;
});
