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
    this.verticalVelocity = 0;
    this.gravity = 22;
    this.wheels = root.userData.wheels;
    this.forward = new THREE.Vector3();
  }

  setInput(input) { this.input = input; }

  update(dt) {
    const throttle = this.input.throttle;
    const braking = this.input.brake;
    const drag = 0.33 + Math.abs(this.speed) * 0.024 + (this.input.handbrake ? 8 : 0);
    let engineForce = 0;
    if (throttle > 0) {
      engineForce = this.speed < -0.15 ? 21 * throttle : 9.2 * throttle;
    } else if (braking > 0) {
      engineForce = this.speed > 0.15 ? -21 * braking : -8.5 * braking;
    }
    this.speed += (engineForce - Math.sign(this.speed) * drag) * dt;
    this.speed = THREE.MathUtils.clamp(this.speed, -12, 67);
    if (!throttle && !braking && Math.abs(this.speed) < 0.13) this.speed = 0;

    const speedMagnitude = Math.abs(this.speed);
    const speedFactor = THREE.MathUtils.clamp(speedMagnitude / 24, 0, 1);
    const rollingFactor = THREE.MathUtils.clamp(speedMagnitude / 1.5, 0, 1);
    const grip = this.input.handbrake ? 1.25 : 1;
    const maxYawRate = 0.78 + speedFactor * 1.35;
    const reverseDirection = this.speed < -0.5 ? -1 : 1;
    const targetYawRate = -this.input.steer * maxYawRate * rollingFactor * grip * reverseDirection;
    const steeringResponse = 8 + speedFactor * 8;
    this.yawRate = THREE.MathUtils.damp(this.yawRate, targetYawRate, steeringResponse, dt);
    this.root.rotation.y += this.yawRate * dt;
    this.forward.set(0, 0, -1).applyQuaternion(this.root.quaternion);
    this.root.position.addScaledVector(this.forward, this.speed * dt);
    this.applyGravityAndGroundContact(dt);

    const wheels = this.wheels ?? [];
    for (const wheel of wheels) {
      if (wheel.front) wheel.pivot.rotation.y = -this.input.steer * 0.5;
      if (wheel.rollPivot) wheel.rollPivot.rotation.x -= this.speed * dt / Math.max(wheel.radius, 0.1);
      if (wheel.tire) wheel.tire.rotation.x -= this.speed * dt / 0.46;
    }

    this.rpm = 850 + Math.min(Math.abs(this.speed) / 67, 1) * 5200 + throttle * (1 - Math.min(Math.abs(this.speed) / 67, 1)) * 1950;
    const reverseSelected = braking > 0 && throttle === 0 && this.speed <= 0.25;
    this.gear = this.speed < -0.15 || reverseSelected
      ? 'R'
      : this.speed < 1
        ? 'N'
        : String(Math.min(6, Math.floor(this.speed / 11) + 1));
  }

  reset() {
    const y = this.track?.getGroundHeightAt
      ? this.track.getGroundHeightAt(this.spawn.x, this.spawn.z) + (this.root.userData.groundOffset ?? 0.02)
      : 0.48;
    this.root.position.set(this.spawn.x, y, this.spawn.z);
    this.root.rotation.set(0, this.spawn.yaw, 0);
    this.speed = 0;
    this.rpm = 900;
    this.yawRate = 0;
    this.verticalVelocity = 0;
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false };
  }

  applyGravityAndGroundContact(dt) {
    const groundHeight = this.track?.getGroundHeightAt?.(this.root.position.x, this.root.position.z);
    if (groundHeight === undefined) return;

    const carBottom = groundHeight + (this.root.userData.groundOffset ?? 0.02);
    this.verticalVelocity -= this.gravity * dt;
    this.root.position.y += this.verticalVelocity * dt;
    if (this.root.position.y <= carBottom) {
      this.root.position.y = carBottom;
      this.verticalVelocity = 0;
    }
  }
}
