import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Styled multi-line text input.
 * @param props Standard textarea props.
 * @returns The rendered textarea element.
 */
function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">): React.JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[90px] w-full rounded-[10px] border border-input bg-transparent p-[15px] text-[12px] shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
