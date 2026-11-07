import { useCallback, useEffect, useState } from "react";
import { getAudioEngine } from "../lib/audio";
import type { SfxName } from "../lib/audio";

// Module-level (not per-component) so "unlocked" state is shared across the
// whole app once the student/admin has interacted once.
let unlockedGlobal = false;

export function useAudio() {
  const [unlocked, setUnlocked] = useState(unlockedGlobal);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [volume, setVolume] = useState(0.7);

  useEffect(() => {
    const engine = getAudioEngine();
    engine.setMusicEnabled(musicOn);
  }, [musicOn]);

  useEffect(() => {
    const engine = getAudioEngine();
    engine.setSfxEnabled(sfxOn);
  }, [sfxOn]);

  useEffect(() => {
    const engine = getAudioEngine();
    engine.setVolume(volume);
  }, [volume]);

  const unlock = useCallback(async () => {
    const engine = getAudioEngine();
    await engine.unlock();
    engine.startMusic();
    unlockedGlobal = true;
    setUnlocked(true);
  }, []);

  const playSfx = useCallback(
    (name: SfxName) => {
      if (!unlockedGlobal) return;
      getAudioEngine().playSfx(name);
    },
    []
  );

  return { unlocked, musicOn, setMusicOn, sfxOn, setSfxOn, volume, setVolume, unlock, playSfx };
}
