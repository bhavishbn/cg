export class InputManager {
  constructor({ onInput, onCamera, onPause, onRestart, onMute }) {
    this.onInput = onInput;
    this.onCamera = onCamera;
    this.onPause = onPause;
    this.onRestart = onRestart;
    this.onMute = onMute;
    this.active = false;
    this.keys = new Set();
    window.addEventListener('keydown', event => this.keyDown(event));
    window.addEventListener('keyup', event => this.keyUp(event));
    window.addEventListener('blur', () => this.clear());
  }

  setActive(active) { this.active = active; if (!active) this.clear(); }

  keyDown(event) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (event.repeat) return;
    if (key === 'c') this.onCamera();
    if (key === 'p' || key === 'escape') this.onPause();
    if (key === 'r') this.onRestart();
    if (key === 'm') this.onMute();
    this.keys.add(key);
    this.send();
  }

  keyUp(event) { this.keys.delete(event.key.toLowerCase()); this.send(); }
  clear() { this.keys.clear(); this.send(); }

  send() {
    this.onInput({
      throttle: this.active && (this.keys.has('w') || this.keys.has('arrowup')) ? 1 : 0,
      brake: this.active && (this.keys.has('s') || this.keys.has('arrowdown')) ? 1 : 0,
      steer: this.active ? (Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'))) : 0,
      handbrake: this.active && this.keys.has(' '),
    });
  }
}
