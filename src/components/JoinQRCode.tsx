import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Live QR code pointing at this deployment's own /join page, generated
 * entirely client-side (no external QR API call — works even if the
 * projector has no internet access to a third party).
 */
export default function JoinQRCode({ size = 220 }: { size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join` : "";

  useEffect(() => {
    if (!joinUrl) return;
    let cancelled = false;
    QRCode.toDataURL(joinUrl, {
      width: size,
      margin: 1,
      color: { dark: "#324e24", light: "#fffdf7" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [joinUrl, size]);

  if (!joinUrl) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      {dataUrl ? (
        <img
          src={dataUrl}
          width={size}
          height={size}
          alt="Scan to join NEAL TEA"
          className="rounded-2xl shadow-lift border-4 border-white"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="rounded-2xl bg-cream-100 animate-pulse flex items-center justify-center text-xs text-matcha-400"
        >
          Generating QR…
        </div>
      )}
      <p className="text-sm font-mono text-matcha-500">{joinUrl.replace(/^https?:\/\//, "")}</p>
    </div>
  );
}
