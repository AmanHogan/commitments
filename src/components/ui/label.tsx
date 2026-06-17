"use client";

import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Form label bound to a control.
 * @param props Radix label props.
 * @returns The rendered label element.
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>): React.JSX.Element {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "mb-1 text-[14px] leading-none font-[500] peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
