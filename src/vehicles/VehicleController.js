import * as THREE from 'three';

export class VehicleController {
  constructor(root, track) {
    this.root = root;
    this.track = track;
    this.spawn = track?.bounds ? track.spawn : { x: -18, y: 0, z: -10, yaw: 0 };
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    this.speed = 0;
    this.rpm = 900;
    this.gear = 'N';
    this.yawRate = 0;
    this.wheels = root.userData.wheels;
    this.forward = new THREE.Vector3();
  }

  setInput(input) { this.input = input; }

  update(dt) {
    const throttle = this.input.throttle;
    const braking = this.input.brake;
    const drag = 0.33 + Math.abs(this.speed) * 0.024 + (this.input.handbrake ? 8 : 0);
    const engine = this.speed < 0 ? braking * 8.5 : throttle * 9.2;
    const brakeForce = braking > 0 && this.speed > 0 ? braking * 21 : 0;
    this.speed += (engine - Math.sign(this.speed) * drag - brakeForce) * dt;
    this.speed = THREE.MathUtils.clamp(this.speed, -12, 67);
    if (!throttle && !braking && Math.abs(this.speed) < 0.13) this.speed = 0;

    const grip = this.input.handbrake ? 0.58 : 1;
    const speedFactor = THREE.MathUtils.clamp(Math.abs(this.speed) / 3.2, 0, 1);
    const steering = this.input.steer * (0.92 - Math.min(Math.abs(this.speed) * 0.0085, 0.48)) * speedFactor;
    this.yawRate += (steering * (this.speed < -0.5 ? -1 : 1) * grip - this.yawRate * 2.6) * dt;
    this.root.rotation.y += this.yawRate * dt;
    this.forward.set(0, 0, -1).applyQuaternion(this.root.quaternion);
    this.root.position.addScaledVector(this.forward, this.speed * dt);

    const wheels = this.wheels ?? [];
    for (const wheel of wheels) {
      if (wheel.front) wheel.pivot.rotation.y = -this.input.steer * 0.42;
      wheel.tire.rotation.x -= this.speed * dt / 0.46;
    }

    this.rpm = 850 + Math.min(Math.abs(this.speed) / 67, 1) * 5200 + throttle * (1 - Math.min(Math.abs(this.speed) / 67, 1)) * 1950;
    this.gear = this.speed < -0.8 ? 'R' : this.speed < 1 ? 'N' : String(Math.min(6, Math.floor(this.speed / 11) + 1));
  }

  reset() {
    this.root.position.set(this.spawn.x, this.spawn.y + (this.track?.bounds ? 0.88 : 0.48), this.spawn.z);
    this.root.rotation.set(0, this.spawn.yaw, 0);
    this.speed = 0;
    this.rpm = 900;
    this.yawRate = 0;
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false };
  }
}
