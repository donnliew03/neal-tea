import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import type { PrizeDef, PrizeId } from "../lib/types";
import { useAudio } from "../hooks/useAudio";

interface SpinWheelProps {
  prizes: PrizeDef[];
  /** Set to a new, non-null value each time a fresh spin result arrives from the server. */
  resultPrizeId: PrizeId | null;
  /** Bumped (e.g. incremented) by the parent every time a *new* spin should animate, even to the same prize. */
  spinToken: number;
  onSpinComplete?: (prizeId: PrizeId) => void;
  size?: number;
}

const SPIN_DURATION_MS = 3200;

/**
 * The wheel is drawn with equal-size visual wedges (one per prize), not
 * weight-proportional ones. True odds are enforced entirely server-side
 * (see netlify/functions/request-spin.ts + pickWeightedPrize); drawing the
 * 0.1%-weight grand prize as a true-to-scale sliver would make it
 * practically invisible, so the wheel is a fair-looking *reveal* of a
 * result that was already decided honestly before it ever started
 * spinning.
 */
export default function SpinWheel({ prizes, resultPrizeId, spinToken, onSpinComplete, size = 340 }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const lastTokenRef = useRef(spinToken);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { playSfx } = useAudio();

  const segAngle = 360 / prizes.length;

  useEffect(() => {
    if (spinToken === lastTokenRef.current || resultPrizeId === null) return;
    lastTokenRef.current = spinToken;

    const idx = prizes.findIndex((p) => p.id === resultPrizeId);
    if (idx === -1) return;

    setSpinning(true);
    playSfx("spin_start");

    // Pointer is fixed at the top (12 o'clock / 0deg). We want the *center*
    // of the winning segment to end up there, with a little randomness so
    // it doesn't look mechanically identical every time, plus several full
    // spins for drama.
    const segCenter = idx * segAngle + segAngle / 2;
    const jitter = (Math.random() - 0.5) * (segAngle * 0.5);
    // CSS `rotate(Rdeg)` turns the wheel clockwise by R; the pointer is
    // fixed at the top (viewport angle 0). A point drawn at local angle A
    // (measured clockwise from top) ends up at viewport angle (A + R) mod
    // 360, so to land the winning segment's center under the pointer we
    // need R mod 360 == (360 - segCenter) mod 360.
    const landingMod = (((360 - segCenter + jitter) % 360) + 360) % 360;
    const extraSpins = 5 + Math.floor(Math.random() * 2); // 5-6 full turns

    setRotation((prev) => {
      const prevMod = ((prev % 360) + 360) % 360;
      const deltaToLanding = ((landingMod - prevMod) % 360 + 360) % 360;
      return prev + extraSpins * 360 + deltaToLanding;
    });

    let tickDelay = 70;
    let elapsed = 0;
    function scheduleTick() {
      tickTimerRef.current = setTimeout(() => {
        elapsed += tickDelay;
        playSfx("wheel_tick");
        tickDelay = Math.min(tickDelay * 1.12, 260);
        if (elapsed < SPIN_DURATION_MS - 200) scheduleTick();
      }, tickDelay);
    }
    scheduleTick();

    const doneTimer = setTimeout(() => {
      setSpinning(false);
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
      const prize = prizes[idx];
      if (prize.id === "grand_prize") {
        confetti({ particleCount: 180, spread: 100, origin: { y: 0.5 }, colors: ["#d4a52f", "#f3d98b", "#7fb25d"] });
        playSfx("win_jackpot");
      } else if (prize.weight <= 70) {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 } });
        playSfx("win_rare");
      } else if (prize.weight <= 150) {
        playSfx("win_mid");
      } else {
        playSfx("win_common");
      }
      onSpinComplete?.(prize.id);
    }, SPIN_DURATION_MS);

    return () => {
      clearTimeout(doneTimer);
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken, resultPrizeId]);

  const r = size / 2;
  const center = r;

  return (
    <div className="relative flex flex-col items-center">
      {/* pointer */}
      <div
        className="absolute z-10 -translate-x-1/2"
        style={{ top: -6, left: "50%" }}
      >
        <svg width="36" height="40" viewBox="0 0 36 40">
          <path d="M18 40 L2 8 Q18 -4 34 8 Z" fill="#9c4166" stroke="#fff" strokeWidth="2" />
        </svg>
      </div>

      <div
        className="rounded-full shadow-lift border-[6px] border-cream-50"
        style={{
          width: size,
          height: size,
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17,0.89,0.24,1)` : "none",
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {prizes.map((p, i) => {
            const startAngle = (i * segAngle - 90) * (Math.PI / 180);
            const endAngle = ((i + 1) * segAngle - 90) * (Math.PI / 180);
            const x1 = center + r * Math.cos(startAngle);
            const y1 = center + r * Math.sin(startAngle);
            const x2 = center + r * Math.cos(endAngle);
            const y2 = center + r * Math.sin(endAngle);
            const midAngle = (i * segAngle + segAngle / 2 - 90) * (Math.PI / 180);
            const labelX = center + r * 0.62 * Math.cos(midAngle);
            const labelY = center + r * 0.62 * Math.sin(midAngle);
            return (
              <g key={p.id}>
                <path
                  d={`M${center},${center} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`}
                  fill={p.color}
                  stroke="#fffdf7"
                  strokeWidth="2"
                />
                <text
                  x={labelX}
                  y={labelY}
                  fill="#2b4220"
                  fontSize={size * 0.032}
                  fontWeight={700}
                  textAnchor="middle"
                  transform={`rotate(${(i * segAngle + segAngle / 2)}, ${labelX}, ${labelY})`}
                >
                  {p.shortLabel}
                </text>
              </g>
            );
          })}
          <circle cx={center} cy={center} r={r * 0.14} fill="#fffdf7" stroke="#c98a4b" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
}
