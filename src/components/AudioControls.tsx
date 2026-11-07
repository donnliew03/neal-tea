import { useState } from "react";
import { Music, Music as MusicOff, Volume1, Volume2, VolumeX } from "lucide-react";
import { useAudio } from "../hooks/useAudio";

/** Small persistent corner widget: music toggle, sfx toggle, volume slider. */
export default function AudioControls() {
  const { unlocked, musicOn, setMusicOn, sfxOn, setSfxOn, volume, setVolume } = useAudio();
  const [open, setOpen] = useState(false);

  if (!unlocked) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="h-11 w-11 rounded-full bg-white/90 shadow-soft border border-cream-200 flex items-center justify-center text-matcha-700 hover:bg-cream-50"
          aria-label="Audio settings"
        >
          {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>

        {open && (
          <div className="absolute bottom-14 right-0 w-56 rounded-2xl bg-white shadow-lift border border-cream-200 p-4 space-y-3 animate-pop-in">
            <button
              onClick={() => setMusicOn(!musicOn)}
              className="w-full flex items-center justify-between text-sm font-semibold text-matcha-700"
            >
              <span className="flex items-center gap-2">
                {musicOn ? <Music className="h-4 w-4" /> : <MusicOff className="h-4 w-4 opacity-40" />}
                Music
              </span>
              <span className={musicOn ? "text-matcha-600" : "text-matcha-300"}>{musicOn ? "On" : "Off"}</span>
            </button>
            <button
              onClick={() => setSfxOn(!sfxOn)}
              className="w-full flex items-center justify-between text-sm font-semibold text-matcha-700"
            >
              <span className="flex items-center gap-2">
                <Volume1 className="h-4 w-4" />
                Sound Effects
              </span>
              <span className={sfxOn ? "text-matcha-600" : "text-matcha-300"}>{sfxOn ? "On" : "Off"}</span>
            </button>
            <div>
              <label className="text-xs font-semibold text-matcha-500 block mb-1">Volume</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-matcha-600"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
