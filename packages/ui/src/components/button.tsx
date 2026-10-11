import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "../lib/cn";

/**
 * The single pressable of the observatory.
 *
 * Server-safe on purpose: it renders props only and holds no state, so an RSC
 * page can emit a real `<button>` without dragging a client bundle down the
 * tree. Client leaves that need behaviour import it from their own module.
 */
const buttonVariants = cva(
  // Gilding is a hairline, never a glow: the hierarchy comes from the border
  // and the type colour so the whole system stays printable.
  "inline-flex items-center justify-center gap-2 rounded-[6px] border font-medium " +
    "transition-colors duration-150 select-none " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold " +
    "disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "border-gold bg-gold text-ink hover:bg-[#E4B65C]",
        secondary: "border-abyss-border bg-abyss-raised text-parchment hover:border-gold hover:text-gold",
        ghost: "border-transparent bg-transparent text-parchment-dim hover:border-abyss-border hover:text-parchment",
        danger: "border-crimson bg-transparent text-crimson hover:bg-crimson hover:text-ink",
        link: "border-transparent bg-transparent text-gold underline underline-offset-4 hover:text-parchment px-0",
      },
      size: {
        sm: "h-8 px-3 text-[12px]",
        md: "h-10 px-4 text-[13px]",
        lg: "h-12 px-6 text-[14px]",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
      block: false,
    },
  },
);

export interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, className, type = "button", ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, block }), className)} {...rest} />;
});

export { buttonVariants };