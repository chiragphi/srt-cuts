// src/components/ui/Card.tsx
import { type ReactNode } from "react";
import clsx from "clsx";

export function Card({
  raised,
  className,
  children,
}: {
  raised?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <div className={clsx("card", raised && "card--raised", className)}>{children}</div>;
}
