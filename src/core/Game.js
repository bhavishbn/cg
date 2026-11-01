import * as THREE from 'three';
import { createEnvironment } from '../world/Environment.js';
import { createCar } from '../vehicles/CarFactory.js';
import { VehicleController } from '../vehicles/VehicleController.js';
import { CameraManager } from './CameraManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { InputManager } from '../ui/InputManager.js';

export class Game {
  constructor(container, mapData = null, terrainData = null) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#a9c3cb');
    this.scene.fog = new THREE.FogExp2('#a9c3cb', 0.00175);
    this.camera = new THREE.PerspectiveCamera(54, 1, 0.1, 1500);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    const world = createEnvironment(this.scene, mapData, terrainData);
    this.track = world.track;
    this.car = createCar();
    this.car.root.position.set(world.spawn.x, world.spawn.y + (world.track.bounds ? 0.88 : 0.48), world.spawn.z);
    this.car.root.rotation.y = world.spawn.yaw;
    this.scene.add(this.car.root);
    this.vehicle = new VehicleController(this.car.root, this.track);
    this.cameraManager = new CameraManager(this.camera, this.car.root);
    this.audio = new AudioManager();
    this.input = new InputManager({
      onInput: input => this.vehicle.setInput(input),
      onCamera: () => this.cycleCamera(),
      onPause: () => this.setPaused(!this.paused),
      onRestart: () => this.restart(),
      onMute: () => this.audio.toggleMute(),
    });
    this.clock = new THREE.Clock();
    this.paused = true;
    this.cameraMode = 0;
    this.speedTick = 0;
    this.onSpeed = () => {};
    this.onPosition = () => {};
    this.onPauseChange = () => {};
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  start() { this.renderer.setAnimationLoop(() => this.update()); }

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.04);
    if (!this.paused) {
      this.vehicle.update(dt);
      this.audio.update(this.vehicle.speed, this.vehicle.rpm);
    }
    this.cameraManager.update(dt, this.vehicle.speed, this.cameraMode);
    this.renderer.render(this.scene, this.camera);
    this.speedTick += dt;
    if (this.speedTick > 0.08) {
      this.speedTick = 0;
      this.onSpeed({ speed: Math.abs(this.vehicle.speed) * 3.6, rpm: this.vehicle.rpm, gear: this.vehicle.gear });
      this.onPosition({ x: this.car.root.position.x, z: this.car.root.position.z, widthMeters: this.track.bounds?.widthMeters ?? 1, depthMeters: this.track.bounds?.depthMeters ?? 1 });
    }
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  cycleCamera() { this.cameraMode = (this.cameraMode + 1) % 2; }
  setPaused(value) { this.paused = value; this.clock.getDelta(); this.onPauseChange(value); }
  restart() { this.vehicle.reset(); this.input.setActive(true); this.setPaused(false); }
}
