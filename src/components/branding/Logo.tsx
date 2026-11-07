// The real NEAL TEA logo, supplied as an image asset (public/logo.png).
// It already includes the "NEAL TEA" wordmark baked into the artwork, so
// `withWordmark` is kept only for backward compatibility with existing call
// sites and no longer renders separate text (that would duplicate it).

interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}

export default function Logo({ size = 72, className = "" }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="NEAL TEA"
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
