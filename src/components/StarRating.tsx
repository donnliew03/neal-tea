import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: number;
}

export default function StarRating({ value, onChange, readOnly = false, size = 44 }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className="flex gap-1" role={readOnly ? undefined : "radiogroup"} aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(null)}
          onClick={() => onChange?.(n)}
          className={`transition-transform ${readOnly ? "" : "hover:scale-110 cursor-pointer"}`}
        >
          <Star
            width={size}
            height={size}
            className={n <= display ? "fill-gold-400 text-gold-500" : "fill-cream-200 text-cream-300"}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
