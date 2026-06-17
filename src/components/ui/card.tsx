import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card container surface.
 * @param props Div props plus an optional density `size`.
 * @returns The rendered card element.
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm";
}): React.JSX.Element {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Card header region.
 * @param props Div props.
 * @returns The rendered header element.
 */
function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-2 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Card title text.
 * @param props Div props.
 * @returns The rendered title element.
 */
function CardTitle({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Card description text.
 * @param props Div props.
 * @returns The rendered description element.
 */
function CardDescription({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-description"
      className={cn("mb-2 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * Card action slot (top-right).
 * @param props Div props.
 * @returns The rendered action element.
 */
function CardAction({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Card body content.
 * @param props Div props.
 * @returns The rendered content element.
 */
function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 pb-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}

/**
 * Card footer region.
 * @param props Div props.
 * @returns The rendered footer element.
 */
function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
