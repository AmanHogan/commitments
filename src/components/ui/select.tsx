"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Select root.
 * @param props Radix Select.Root props.
 * @returns The rendered select root.
 */
function Select(
  props: React.ComponentProps<typeof SelectPrimitive.Root>,
): React.JSX.Element {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

/**
 * Select value display.
 * @param props Radix Select.Value props.
 * @returns The rendered value.
 */
function SelectValue(
  props: React.ComponentProps<typeof SelectPrimitive.Value>,
): React.JSX.Element {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

/**
 * Select trigger button.
 * @param props Radix trigger props plus a `size`.
 * @returns The rendered trigger.
 */
function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default";
}): React.JSX.Element {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/**
 * Select dropdown content.
 * @param props Radix content props.
 * @returns The rendered content.
 */
function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>): React.JSX.Element {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-36 overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1">
          <ChevronUpIcon className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1">
          <ChevronDownIcon className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

/**
 * Select option item.
 * @param props Radix item props.
 * @returns The rendered item.
 */
function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>): React.JSX.Element {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
