"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div ref={triggerRef} className="relative inline-block overflow-visible">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function PopoverTrigger({ children, asChild }: PopoverTriggerProps) {
  const context = React.useContext(PopoverContext);
  if (!context) throw new Error("PopoverTrigger must be used within Popover");

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    context.setOpen(!context.open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
}

export function PopoverContent({
  children,
  className,
  align = "center",
  side = "bottom",
  sideOffset = 8,
  ...props
}: PopoverContentProps) {
  const context = React.useContext(PopoverContext);
  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [adjustedSide, setAdjustedSide] = React.useState(side);
  const [mounted, setMounted] = React.useState(false);

  if (!context) throw new Error("PopoverContent must be used within Popover");

  // Calculate position based on trigger element
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!context.open || !context.triggerRef.current) return;

    const updatePosition = () => {
      const triggerRect = context.triggerRef.current?.getBoundingClientRect();
      const popoverEl = ref.current;
      if (!triggerRect) return;

      // Get popover dimensions (use estimates if not yet rendered)
      const popoverHeight = popoverEl?.offsetHeight || 300;
      const popoverWidth = popoverEl?.offsetWidth || 320;

      let top = 0;
      let left = 0;
      let finalSide = side;

      // Viewport info
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const padding = 8;

      // Calculate initial position based on side
      if (side === "top") {
        top = triggerRect.top - sideOffset - popoverHeight;
        if (align === "start") {
          left = triggerRect.left;
        } else if (align === "center") {
          left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
        } else {
          left = triggerRect.right - popoverWidth;
        }
      } else if (side === "bottom") {
        top = triggerRect.bottom + sideOffset;
        if (align === "start") {
          left = triggerRect.left;
        } else if (align === "center") {
          left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
        } else {
          left = triggerRect.right - popoverWidth;
        }
      } else if (side === "right") {
        left = triggerRect.right + sideOffset;
        if (align === "start") {
          top = triggerRect.top;
        } else if (align === "center") {
          top = triggerRect.top + triggerRect.height / 2 - popoverHeight / 2;
        } else {
          top = triggerRect.bottom - popoverHeight;
        }
      } else if (side === "left") {
        left = triggerRect.left - sideOffset - popoverWidth;
        if (align === "start") {
          top = triggerRect.top;
        } else if (align === "center") {
          top = triggerRect.top + triggerRect.height / 2 - popoverHeight / 2;
        } else {
          top = triggerRect.bottom - popoverHeight;
        }
      }

      // Viewport boundary checks for vertical sides (top/bottom)
      if (side === "top" || side === "bottom") {
        // Check if popover goes off the top
        if (top < padding) {
          if (side === "top") {
            top = triggerRect.bottom + sideOffset;
            finalSide = "bottom";
          } else {
            top = padding;
          }
        }

        // Check if popover goes off the bottom
        if (top + popoverHeight > viewportHeight - padding) {
          if (side === "bottom") {
            top = triggerRect.top - sideOffset - popoverHeight;
            finalSide = "top";
          }
          if (top + popoverHeight > viewportHeight - padding) {
            top = viewportHeight - popoverHeight - padding;
          }
        }

        // Ensure not above viewport
        if (top < padding) {
          top = padding;
        }

        // Horizontal boundaries
        if (left < padding) {
          left = padding;
        }
        if (left + popoverWidth > viewportWidth - padding) {
          left = viewportWidth - popoverWidth - padding;
        }
      }

      // Viewport boundary checks for horizontal sides (left/right)
      if (side === "left" || side === "right") {
        // Check if popover goes off the right
        if (left + popoverWidth > viewportWidth - padding) {
          if (side === "right") {
            left = triggerRect.left - sideOffset - popoverWidth;
            finalSide = "left";
          }
          if (left + popoverWidth > viewportWidth - padding) {
            left = viewportWidth - popoverWidth - padding;
          }
        }

        // Check if popover goes off the left
        if (left < padding) {
          if (side === "left") {
            left = triggerRect.right + sideOffset;
            finalSide = "right";
          }
          if (left < padding) {
            left = padding;
          }
        }

        // Vertical boundaries - keep popover on screen
        if (top < padding) {
          top = padding;
        }
        if (top + popoverHeight > viewportHeight - padding) {
          top = viewportHeight - popoverHeight - padding;
        }
      }

      setPosition({ top, left });
      setAdjustedSide(finalSide);
    };

    // Initial position update
    updatePosition();
    // Update again after a brief delay to get accurate popover dimensions
    const timeoutId = setTimeout(updatePosition, 10);

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [context.open, context.triggerRef, side, align, sideOffset]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        // Check if click was on trigger
        if (context.triggerRef.current?.contains(event.target as Node)) return;
        context.setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        context.setOpen(false);
      }
    };

    if (context.open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [context.open, context]);

  if (!context.open || !mounted) return null;

  const content = (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
      }}
      className={cn(
        "z-[9999] rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95",
        adjustedSide === "top" && "origin-bottom",
        adjustedSide === "bottom" && "origin-top",
        adjustedSide === "left" && "origin-right",
        adjustedSide === "right" && "origin-left",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );

  return createPortal(content, document.body);
}
