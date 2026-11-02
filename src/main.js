import './style.css';
import { Game } from './core/Game.js';
import { MapPreview } from './ui/MapPreview.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let mapData = null;
let terrainData = null;
let carModel = null;
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

try {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  const model = await new GLTFLoader().setDRACOLoader(dracoLoader).loadAsync('/models/cars/bugatti-chiron.glb');
  carModel = model.scene;
  dracoLoader.dispose();
} catch (error) {
  console.error('Bugatti Chiron model could not be loaded; using the fallback car.', error);
}

const game = new Game(document.querySelector('#game-canvas'), mapData, terrainData, carModel);
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

const cameraNames = ['MEDIUM CHASE', 'COCKPIT', 'REAR CHASE', 'TOP VIEW'];
game.onCameraChange = mode => {
  app.classList.toggle('cockpit-view', mode === 1);
  showToast(`CAMERA · ${cameraNames[mode]}`);
};

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

game.onSpeed = ({ speed, rpm, gear, steer = 0, throttle = 0 }) => {
  const roundedSpeed = String(Math.round(speed)).padStart(3, '0');
  const roundedRpm = Math.round(rpm);
  document.querySelector('#speed').textContent = roundedSpeed;
  document.querySelector('#rpm').textContent = roundedRpm.toLocaleString('en-US');
  document.querySelector('#gear').textContent = gear;
  document.querySelector('#rpm-fill').style.width = `${Math.min(rpm / 8000 * 100, 100)}%`;
  document.querySelector('#cockpit-speed').textContent = roundedSpeed;
  document.querySelector('#cockpit-rpm').textContent = roundedRpm.toLocaleString('en-US');
  document.querySelector('#cockpit-gear').textContent = gear;
  document.querySelector('#cockpit-boost').style.width = `${Math.round(throttle * 100)}%`;
  document.querySelector('#cockpit-rpm-needle').style.transform = `rotate(${-130 + Math.min(rpm / 8000, 1) * 260}deg)`;
  document.querySelector('#cockpit-wheel').style.setProperty('--steering-angle', `${steer * 125}deg`);
};
