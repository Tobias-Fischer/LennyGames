export type GameSound =
  | "alarm"
  | "siren"
  | "taser"
  | "blaster"
  | "cuffs"
  | "success"
  | "damage"
  | "car"
  | "order"
  | "oven"
  | "delivery"
  | "ambience"
  | "click"
  | "blocked";

export class AudioSystem {
  muted = false;
  musicEnabled = false;
  private context: AudioContext | null = null;
  private lastSoundAt = new Map<GameSound, number>();
  private musicTimer: number | null = null;
  private musicStep = 0;

  unlock(): void {
    if (this.context) {
      void this.context.resume();
      return;
    }
    this.context = new AudioContext();
    this.play("click");
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.unlock();
      this.play("click");
      if (this.musicEnabled) {
        this.startMusic();
      }
    } else {
      this.stopMusic();
    }
    return this.muted;
  }

  toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    window.localStorage.setItem("police-and-crimes:music-enabled", String(this.musicEnabled));
    if (this.musicEnabled) {
      this.unlock();
      this.startMusic();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  restoreMusicPreference(): void {
    this.musicEnabled = window.localStorage.getItem("police-and-crimes:music-enabled") === "true";
  }

  play(sound: GameSound): void {
    if (this.muted) {
      return;
    }
    this.unlockIfPossible();
    if (!this.context) {
      return;
    }
    const now = this.context.currentTime;
    const previous = this.lastSoundAt.get(sound) ?? -10;
    if (now - previous < 0.08) {
      return;
    }
    this.lastSoundAt.set(sound, now);

    if (sound === "success") {
      this.tone(523, 0.08, 0.06, "triangle", 0);
      this.tone(659, 0.08, 0.06, "triangle", 0.08);
      this.tone(784, 0.16, 0.07, "triangle", 0.16);
      return;
    }
    if (sound === "alarm" || sound === "siren") {
      this.tone(660, 0.13, 0.08, "square", 0);
      this.tone(420, 0.16, 0.08, "square", 0.14);
      return;
    }
    if (sound === "taser") {
      this.tone(140, 0.05, 0.08, "sawtooth", 0);
      this.tone(920, 0.12, 0.06, "square", 0.02);
      return;
    }
    if (sound === "blaster") {
      this.tone(190, 0.08, 0.09, "triangle", 0);
      this.tone(95, 0.12, 0.07, "square", 0.04);
      return;
    }
    if (sound === "cuffs") {
      this.tone(1200, 0.04, 0.08, "square", 0);
      this.tone(900, 0.05, 0.07, "square", 0.06);
      return;
    }
    if (sound === "damage") {
      this.tone(120, 0.12, 0.08, "sawtooth", 0);
      return;
    }
    if (sound === "car") {
      this.tone(82, 0.2, 0.05, "sawtooth", 0);
      this.tone(110, 0.18, 0.03, "triangle", 0.04);
      return;
    }
    if (sound === "order") {
      this.tone(440, 0.06, 0.05, "triangle", 0);
      this.tone(660, 0.08, 0.045, "triangle", 0.06);
      return;
    }
    if (sound === "oven") {
      this.tone(180, 0.18, 0.035, "sawtooth", 0);
      this.tone(260, 0.22, 0.025, "triangle", 0.08);
      return;
    }
    if (sound === "delivery") {
      this.tone(392, 0.08, 0.05, "triangle", 0);
      this.tone(523, 0.08, 0.05, "triangle", 0.08);
      this.tone(659, 0.1, 0.05, "triangle", 0.16);
      return;
    }
    if (sound === "ambience") {
      this.tone(220, 0.4, 0.015, "sine", 0);
      return;
    }
    if (sound === "blocked") {
      this.tone(160, 0.08, 0.05, "square", 0);
      return;
    }
    this.tone(760, 0.05, 0.04, "triangle", 0);
  }

  dispose(): void {
    this.stopMusic();
    void this.context?.close();
  }

  private startMusic(): void {
    if (this.muted || !this.musicEnabled) {
      return;
    }
    this.unlockIfPossible();
    if (!this.context || this.musicTimer !== null) {
      return;
    }
    this.musicStep = 0;
    const playStep = () => {
      if (this.muted || !this.musicEnabled || !this.context) {
        this.stopMusic();
        return;
      }
      const melody = [262, 330, 392, 330, 294, 349, 440, 349];
      const bass = [131, 131, 147, 147, 165, 165, 147, 147];
      const index = this.musicStep % melody.length;
      this.tone(melody[index], 0.18, 0.022, "triangle", 0);
      if (index % 2 === 0) {
        this.tone(bass[index], 0.32, 0.018, "sine", 0);
      }
      this.musicStep += 1;
    };
    playStep();
    this.musicTimer = window.setInterval(playStep, 360);
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private unlockIfPossible(): void {
    if (!this.context && document.hasFocus()) {
      try {
        this.context = new AudioContext();
      } catch {
        this.context = null;
      }
    }
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    delay: number
  ): void {
    if (!this.context) {
      return;
    }
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}
