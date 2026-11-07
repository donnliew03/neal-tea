import { Volume2 } from "lucide-react";
import Button from "./ui/Button";
import Logo from "./branding/Logo";
import { useAudio } from "../hooks/useAudio";

/**
 * Full-screen gate shown until the student/admin has interacted once.
 * Browsers block audio autoplay without a user gesture, so this is the
 * gesture — and it is also where the background music actually starts.
 */
export default function AudioGate({ onReady }: { onReady?: () => void }) {
  const { unlocked, unlock } = useAudio();

  if (unlocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-matcha-900/80 backdrop-blur-sm px-6">
      <div className="max-w-sm w-full rounded-3xl bg-cream-50 p-8 text-center shadow-lift animate-pop-in">
        <div className="flex justify-center mb-4">
          <Logo size={64} />
        </div>
        <h2 className="font-display text-2xl font-extrabold text-matcha-800 mb-2">Welcome to NEAL TEA</h2>
        <p className="text-matcha-600 mb-6 text-sm">
          Tap below to enable sound — music, spins, and a few surprises sound a lot better with it on.
        </p>
        <Button
          variant="primary"
          size="lg"
          icon={<Volume2 className="h-5 w-5" />}
          className="w-full"
          onClick={async () => {
            await unlock();
            onReady?.();
          }}
        >
          Enable Audio &amp; Continue
        </Button>
      </div>
    </div>
  );
}
