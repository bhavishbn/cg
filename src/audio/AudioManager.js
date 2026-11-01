export class AudioManager {
  constructor() { this.context = null; this.oscillator = null; this.gain = null; this.enabled = false; this.muted = false; }

  enable() {
    if (this.enabled) { this.context?.resume(); return; }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    this.context = new Context();
    this.oscillator = this.context.createOscillator();
    const overtone = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    this.gain = this.context.createGain();
    const overtoneGain = this.context.createGain();
    this.oscillator.type = 'sawtooth';
    overtone.type = 'triangle';
    overtone.frequency.value = 67;
    overtoneGain.gain.value = 0.18;
    filter.type = 'lowpass';
    filter.frequency.value = 680;
    this.oscillator.connect(filter);
    overtone.connect(overtoneGain).connect(filter);
    filter.connect(this.gain).connect(this.context.destination);
    this.gain.gain.value = 0.0001;
    this.oscillator.start();
    overtone.start();
    this.enabled = true;
  }

  update(speed, rpm) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    this.oscillator.frequency.setTargetAtTime(55 + rpm * 0.11, now, 0.06);
    this.gain.gain.setTargetAtTime(this.muted ? 0.0001 : 0.008 + Math.min(Math.abs(speed) / 67, 1) * 0.025, now, 0.08);
  }

  toggleMute() { this.muted = !this.muted; if (this.gain && this.context) this.gain.gain.setTargetAtTime(this.muted ? 0.0001 : 0.02, this.context.currentTime, 0.05); return this.muted; }
}
