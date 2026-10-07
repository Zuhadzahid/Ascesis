"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Toggle group, in the shadcn/ui shape.
 *
 * Used for the canvas tool picker, where it earns its keep: a group of
 * buttons where exactly one is active is a radio group, not three independent
 * buttons. Radix gives it roving tabindex (one Tab stop for the whole group,
 * arrow keys to move between tools) and the correct aria roles, which is how
 * a drawing app's toolbar is supposed to behave.
 */
const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-olive focus-visible:ring-offset-1 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "text-ink-soft hover:bg-beige-200 hover:text-ink data-[state=on]:bg-teal data-[state=on]:text-ink",
      },
      size: {
        default: "size-8",
        sm: "size-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({ variant: "default", size: "default" });

function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        toggleVariants({
          variant: context.variant ?? variant,
          size: context.size ?? size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem, toggleVariants };
