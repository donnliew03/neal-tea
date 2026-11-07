// Decorative, purely-ornamental floating tapioca pearls + tea-drop blobs
// used behind page content. Pure SVG/CSS, no images, no emoji.

const BUBBLES = [
  { top: "8%", left: "6%", size: 26, delay: "0s", color: "#4a2e1c" },
  { top: "72%", left: "10%", size: 18, delay: "1.2s", color: "#c98a4b" },
  { top: "18%", left: "88%", size: 22, delay: "0.6s", color: "#4a2e1c" },
  { top: "60%", left: "92%", size: 16, delay: "1.8s", color: "#f6a0c3" },
  { top: "40%", left: "4%", size: 14, delay: "2.4s", color: "#7fb25d" },
  { top: "85%", left: "80%", size: 20, delay: "0.9s", color: "#e8c158" },
];

export default function BubbleField() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-30 animate-float"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            background: b.color,
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  );
}
