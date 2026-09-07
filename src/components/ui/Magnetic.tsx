"use client";

import { useRef, type ReactNode } from "react";
import { useMagnetic } from "@/lib/hooks/useMagnetic";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  range?: number;
  pull?: number;
}

/** Wraps a single interactive child in the cursor-magnet effect. */
export function Magnetic({ children, className, range, pull }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  useMagnetic(ref, { range, pull });
  return (
    <div ref={ref} className={cn("inline-block will-change-transform", className)}>
      {children}
    </div>
  );
}
