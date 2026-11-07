// Original hand-built SVG mark for NEAL TEA — a bubble-tea cup with a
// domed lid, straw, and a scatter of tapioca pearls. Intentionally not an
// emoji or stock icon; the shapes below are this project's own design.

interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}

export default function Logo({ size = 72, withWordmark = false, className = "" }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* lid dome */}
        <path
          d="M34 30 Q60 8 86 30 L90 40 L30 40 Z"
          fill="#f6a0c3"
          stroke="#c2577e"
          strokeWidth="3"
        />
        {/* lid rim */}
        <rect x="26" y="38" width="68" height="10" rx="5" fill="#fdeef3" stroke="#c2577e" strokeWidth="3" />
        {/* straw */}
        <rect x="56" y="6" width="9" height="40" rx="3" fill="#7fb25d" stroke="#3f6b2a" strokeWidth="2" />
        {/* cup body */}
        <path
          d="M32 48 L88 48 L80 106 Q79 112 73 112 L47 112 Q41 112 40 106 Z"
          fill="#fff7ec"
          stroke="#c98a4b"
          strokeWidth="3"
        />
        {/* tea fill */}
        <path
          d="M36 60 L84 60 L78 104 Q77 108 73 108 L47 108 Q43 108 42 104 Z"
          fill="#e8c158"
          opacity="0.85"
        />
        {/* pearls */}
        <circle cx="50" cy="96" r="5" fill="#4a2e1c" />
        <circle cx="62" cy="101" r="5" fill="#4a2e1c" />
        <circle cx="72" cy="94" r="5" fill="#4a2e1c" />
        <circle cx="58" cy="88" r="5" fill="#4a2e1c" />
        {/* sparkle */}
        <path d="M94 24 L97 32 L105 35 L97 38 L94 46 L91 38 L83 35 L91 32 Z" fill="#d4a52f" />
      </svg>
      {withWordmark && (
        <span className="font-display font-extrabold text-2xl tracking-wide text-matcha-800">
          NEAL<span className="text-blossom-500">TEA</span>
        </span>
      )}
    </div>
  );
}
