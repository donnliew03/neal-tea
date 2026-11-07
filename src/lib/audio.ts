// Original, synthesized-in-the-browser audio engine for NEAL TEA Lucky
// Spin. No external audio files, no copyrighted samples — everything here
// is generated at runtime with the Web Audio API, so there is an actual
// melody, chord progression, bassline and light percussion rather than a
// single looping beep.
//
// Usage: const engine = getAudioEngine(); await engine.unlock(); engine.startMusic();

type SfxName =
  | "spin_start"
  | "wheel_tick"
  | "win_common"
  | "win_mid"
  | "win_rare"
  | "win_jackpot"
  | "offer_notify"
  | "buy_confirm"
  | "no_thanks"
  | "reveal_cue";

const BPM = 128;
const BEAT = 60 / BPM;
const STEP = BEAT / 4; // 16th notes

// A bright, arcade-ish two-bar progression in A minor pentatonic-ish space.
// Frequencies in Hz, 0 = rest.
const CHORDS: number[][] = [
  [220.0, 261.63, 329.63], // A minor
  [174.61, 220.0, 261.63], // F major
  [196.0, 246.94, 293.66], // G major
  [220.0, 261.63, 329.63], // A minor
];

const MELODY: number[] = [
  440, 0, 523.25, 587.33, 0, 659.25, 587.33, 0,
  523.25, 0, 440, 493.88, 0, 587.33, 523.25, 0,
  392, 0, 440, 523.25, 0, 587.33, 523.25, 0,
  440, 0, 523.25, 440, 0, 392, 349.23, 0,
];

const BASS: number[] = [110, 0, 110, 0, 87.31, 0, 87.31, 0, 98, 0, 98, 0, 110, 0, 110, 0];

// 1 = kick, 2 = hat, 0 = rest, per 16th step across one bar (16 steps).
const DRUMS: number[] = [1, 0, 2, 0, 1, 0, 2, 2, 1, 0, 2, 0, 1, 2, 2, 0];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private musicOn = true;
  private sfxOn = true;
  private volume = 0.7;

  private playing = false;
  private nextNoteTime = 0;
  private step16 = 0; // 0..31 across the two-bar loop
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;

  private ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicOn ? 0.55 : 0;
      this.musicGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxOn ? 1 : 0;
      this.sfxGain.connect(this.master);
    }
    return this.ctx!;
  }

  /** Must be called from inside a real user gesture handler (click/tap). */
  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
  }

  setMusicEnabled(on: boolean) {
    this.musicOn = on;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx!.currentTime, 0.05);
  }

  setSfxEnabled(on: boolean) {
    this.sfxOn = on;
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(on ? 1 : 0, this.ctx!.currentTime, 0.05);
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx!.currentTime, 0.05);
  }

  startMusic() {
    if (this.playing) return;
    const ctx = this.ensureContext();
    this.playing = true;
    this.step16 = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.schedulerTimer = setInterval(() => this.scheduler(), 25);
  }

  stopMusic() {
    this.playing = false;
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    this.schedulerTimer = null;
  }

  private scheduler() {
    const ctx = this.ctx!;
    while (this.nextNoteTime < ctx.currentTime + 0.1) {
      this.scheduleStep(this.step16, this.nextNoteTime);
      this.nextNoteTime += STEP;
      this.step16 = (this.step16 + 1) % 32;
    }
  }

  private scheduleStep(step: number, time: number) {
    const bar = Math.floor(step / 16) % 2;
    const stepInBar = step % 16;

    // Chords change every 4 steps across the 2-bar loop (8 slots total).
    const chordIdx = Math.floor(step / 4) % CHORDS.length;
    if (stepInBar % 16 === 0) {
      for (const freq of CHORDS[chordIdx]) this.playTone(freq, time, STEP * 15, "triangle", 0.05);
    }

    const bassFreq = BASS[stepInBar];
    if (bassFreq) this.playTone(bassFreq, time, STEP * 1.8, "sawtooth", 0.18);

    const melodyIdx = step % MELODY.length;
    const mFreq = MELODY[melodyIdx];
    if (mFreq) this.playTone(mFreq, time, STEP * 1.6, "square", 0.09);

    const drum = DRUMS[stepInBar];
    if (drum === 1) this.playKick(time);
    if (drum === 2) this.playHat(time);
  }

  private playTone(freq: number, time: number, dur: number, type: OscillatorType, gainLevel: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private playKick(time: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private playHat(time: number) {
    const ctx = this.ctx!;
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain!);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  playSfx(name: SfxName) {
    const ctx = this.ensureContext();
    const t = ctx.currentTime;
    switch (name) {
      case "spin_start":
        this.sweep(t, 300, 900, 0.18, "square", 0.2);
        break;
      case "wheel_tick":
        this.blip(t, 1200, 0.03, 0.12);
        break;
      case "win_common":
        this.arpeggio(t, [523.25, 659.25, 783.99], 0.09, 0.15);
        break;
      case "win_mid":
        this.arpeggio(t, [523.25, 659.25, 783.99, 1046.5], 0.1, 0.18);
        break;
      case "win_rare":
        this.arpeggio(t, [392, 523.25, 659.25, 783.99, 1046.5], 0.1, 0.2);
        break;
      case "win_jackpot":
        this.jackpotFanfare(t);
        break;
      case "offer_notify":
        this.blip(t, 700, 0.06, 0.15);
        this.blip(t + 0.12, 900, 0.06, 0.15);
        break;
      case "buy_confirm":
        this.arpeggio(t, [523.25, 659.25], 0.1, 0.16);
        break;
      case "no_thanks":
        this.blip(t, 440, 0.12, 0.12);
        break;
      case "reveal_cue":
        this.sweep(t, 220, 110, 0.9, "sawtooth", 0.18);
        break;
    }
  }

  private blip(time: number, freq: number, dur: number, gainLevel: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private sweep(time: number, from: number, to: number, dur: number, type: OscillatorType, gainLevel: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, time);
    osc.frequency.exponentialRampToValueAtTime(to, time + dur);
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private arpeggio(time: number, freqs: number[], step: number, gainLevel: number) {
    freqs.forEach((f, i) => this.blip(time + i * step, f, step * 1.4, gainLevel));
  }

  private jackpotFanfare(time: number) {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => this.arpeggio(time + i * 0.09, [f], 0.12, 0.22));
    // a little shimmer tail
    for (let i = 0; i < 6; i++) {
      this.blip(time + 0.5 + i * 0.05, 1200 + i * 150, 0.08, 0.1);
    }
  }
}

let engine: AudioEngine | null = null;
export function getAudioEngine(): AudioEngine {
  if (!engine) engine = new AudioEngine();
  return engine;
}
export type { SfxName };
