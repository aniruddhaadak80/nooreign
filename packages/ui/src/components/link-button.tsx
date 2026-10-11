import { forwardRef, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { buttonVariants, type ButtonProps } from "./button";

/**
 * Button that navigates. Renders a plain anchor rather than a framework link
 * so the design system carries no router dependency; the app can wrap it with
 * `next/link` if it needs client-side transitions.
 */
export interface LinkButtonProps {
  href: string;
  children?: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  block?: boolean;
  className?: string;
  /** Defaults to whether `href` is absolute; adds `rel="noreferrer"`. */
  external?: boolean;
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
  download?: boolean | string;
  title?: string;
  id?: string;
  "aria-label"?: string;
  "aria-current"?: "page" | "step" | "location" | "date" | "time" | true;
}

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  {
    href,
    children,
    variant,
    size,
    block,
    className,
    external,
    target,
    rel,
    download,
    title,
    id,
    "aria-label": ariaLabel,
    "aria-current": ariaCurrent,
  },
  ref,
) {
  const outside = external ?? /^https?:\/\//u.test(href);
  return (
    <a
      ref={ref}
      id={id}
      href={href}
      title={title}
      download={download}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel })}
      {...(ariaCurrent === undefined ? {} : { "aria-current": ariaCurrent })}
      {...(target === undefined ? {} : { target })}
      {...(rel === undefined ? {} : { rel })}
      {...(outside ? { rel: rel === undefined ? "noreferrer noopener" : rel } : {})}
    >
      {children}
    </a>
  );
});