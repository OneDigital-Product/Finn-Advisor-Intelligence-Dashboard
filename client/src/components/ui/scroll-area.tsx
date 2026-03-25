import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * ScrollArea — lightweight native CSS scroll container.
 * Replaces Radix ScrollArea to avoid the compose-refs infinite loop
 * bug with React 18.3+ (setState called during commit phase in ref callbacks).
 */
const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    style={style}
    {...props}
  >
    <div
      className="h-full w-full overflow-auto rounded-[inherit]"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "hsl(var(--border)) transparent",
      }}
    >
      {children}
    </div>
  </div>
))
ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "vertical" | "horizontal" }
>(({ className, orientation = "vertical", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  />
))
ScrollBar.displayName = "ScrollBar"

export { ScrollArea, ScrollBar }
