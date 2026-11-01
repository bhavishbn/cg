import './style.css';
import { Game } from './core/Game.js';
import { MapPreview } from './ui/MapPreview.js';

let mapData = null;
let terrainData = null;
try {
  const [roadsResponse, terrainResponse] = await Promise.all([
    fetch('/data/chamonix-roads.json'),
    fetch('/data/chamonix-terrain.json'),
  ]);
  if (!roadsResponse.ok || !terrainResponse.ok) throw new Error('Local Chamonix map files could not be loaded.');
  [mapData, terrainData] = await Promise.all([roadsResponse.json(), terrainResponse.json()]);
} catch (error) {
  console.error('Real map data could not be loaded; opening the procedural fallback.', error);
}

const game = new Game(document.querySelector('#game-canvas'), mapData, terrainData);
game.start();
if (mapData && game.track.bounds) {
  const mapPreview = new MapPreview(document.querySelector('#map-preview'), mapData);
  mapPreview.update({ x: game.car.root.position.x, z: game.car.root.position.z, widthMeters: game.track.bounds.widthMeters, depthMeters: game.track.bounds.depthMeters });
  game.onPosition = position => mapPreview.update(position);
}

const app = document.querySelector('#app');
const driveButton = document.querySelector('#drive-button');
const soundButton = document.querySelector('#sound-toggle');
const toast = document.querySelector('#toast');
let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 1800);
}

function startDriving() {
  app.classList.add('driving');
  game.input.setActive(true);
  game.setPaused(false);
  try {
    game.audio.enable();
  } catch (error) {
    console.warn('Engine audio is unavailable in this browser.', error);
  }
  showToast('GREEN LIGHT — FIND YOUR LINE');
}

driveButton.addEventListener('click', startDriving);
driveButton.addEventListener('pointerup', event => {
  // Some embedded browser surfaces deliver pointer events without synthesizing click.
  if (event.pointerType !== 'mouse') startDriving();
});

window.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !app.classList.contains('driving')) startDriving();
});

soundButton.addEventListener('click', () => {
  const muted = game.audio.toggleMute();
  soundButton.textContent = muted ? '×' : '◖';
  showToast(muted ? 'ENGINE SOUND MUTED' : 'ENGINE SOUND ON');
});

game.onPauseChange = paused => {
  app.classList.toggle('paused', paused);
  if (paused) {
    game.input.setActive(false);
    showToast('PAUSED — PRESS P OR CLICK TAKE THE WHEEL');
    driveButton.querySelector('span:first-child').textContent = 'RESUME DRIVE';
    app.classList.remove('driving');
  } else {
    driveButton.querySelector('span:first-child').textContent = 'TAKE THE WHEEL';
    app.classList.add('driving');
  }
};

game.onSpeed = ({ speed, rpm, gear }) => {
  document.querySelector('#speed').textContent = String(Math.round(speed)).padStart(3, '0');
  document.querySelector('#rpm').textContent = Math.round(rpm).toLocaleString('en-US');
  document.querySelector('#gear').textContent = gear;
  document.querySelector('#rpm-fill').style.width = `${Math.min(rpm / 8000 * 100, 100)}%`;
};
