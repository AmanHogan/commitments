import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Styled text input.
 * @param props Standard input props.
 * @returns The rendered input element.
 */
function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">): React.JSX.Element {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-[39px] w-full rounded-[10px] border border-input bg-transparent p-[15px] text-[12px] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
