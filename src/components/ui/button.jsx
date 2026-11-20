import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lamseti-teal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[.98]",
  {
    variants: {
      variant: {
        default: "bg-lamseti-teal text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#19595b] hover:shadow-lg",
        outline: "border border-lamseti-ink/15 bg-white text-lamseti-ink hover:border-lamseti-teal/50 hover:bg-lamseti-paper",
        ghost: "text-lamseti-ink hover:bg-lamseti-teal/10"
      },
      size: {
        default: "min-h-11 px-5 py-2.5",
        sm: "min-h-9 px-3.5 py-2 text-xs",
        icon: "size-10"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export const Button = forwardRef(function Button(
  { className, variant, size, type = "button", ...props }, ref
) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});

export { buttonVariants };
