import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export default function Card({ children, padded = true, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`rounded-3xl bg-white/90 backdrop-blur-sm shadow-soft border border-cream-200
        ${padded ? "p-6 sm:p-8" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
