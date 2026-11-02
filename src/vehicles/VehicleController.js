import * as THREE from 'three';

export class VehicleController {
  constructor(root, track, collisionObjects = []) {
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
    this.collisionObjects = collisionObjects;
    this.damage = 0;
    for (const mark of this.root.userData.damageMarks ?? []) mark.visible = false;
    this.collisionCooldown = 0;
    this.onDamage = () => {};
    this.onImpact = () => {};
    this.bodyHalfWidth = root.userData.contactHalfWidth ?? 0.85;
    this.bodyHalfLength = root.userData.contactHalfLength ?? 1.4;
    this.root.rotation.order = 'YXZ';
    this.pitch = 0;
    this.roll = 0;
    this.grade = 0;
    this.onRoad = true;
    this.forward = new THREE.Vector3();
  }

  setInput(input) { this.input = input; }

  update(dt) {
    this.lastDt = dt;
    const throttle = this.input.throttle;
    const braking = this.input.brake;
    this.forward.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.root.rotation.y);
    this.grade = this.sampleForwardGrade();
    const roadInfo = this.track?.getRoadInfoAt?.(this.root.position.x, this.root.position.z);
    this.onRoad = roadInfo ? roadInfo.onRoad : true;
    const roadGrip = this.onRoad ? 1 : 0.58;
    const damagePower = 1 - this.damage / 180;
    const drag = (this.onRoad ? 0.34 : 1.5) + Math.abs(this.speed) * (this.onRoad ? 0.024 : 0.075) + (this.input.handbrake ? 8 : 0);
    let engineForce = 0;
    if (throttle > 0) {
      engineForce = this.speed < -0.15 ? 21 * throttle : (this.onRoad ? 9.2 : 5.2) * throttle;
    } else if (braking > 0) {
      engineForce = this.speed > 0.15 ? -21 * braking : -8.5 * braking;
    }
    const uphillLoad = THREE.MathUtils.clamp(Math.max(0, this.grade) * (this.onRoad ? 22 : 16), 0, 6.5);
    const gravityAlongRoad = -9.81 * this.grade;
    this.speed += (engineForce * damagePower + gravityAlongRoad - uphillLoad * Math.sign(this.speed || 1) - Math.sign(this.speed) * drag) * dt;
    const uphillLimit = Math.max(14, 67 * (1 - THREE.MathUtils.clamp(this.grade, 0, 0.32) * 1.55));
    this.speed = THREE.MathUtils.clamp(this.speed, -12, Math.min(this.onRoad ? 67 : 24, uphillLimit));
    if (!throttle && !braking && Math.abs(this.speed) < 0.13) this.speed = 0;

    const speedMagnitude = Math.abs(this.speed);
    const speedFactor = THREE.MathUtils.clamp(speedMagnitude / 24, 0, 1);
    const rollingFactor = THREE.MathUtils.clamp(speedMagnitude / 1.5, 0, 1);
    const grip = (this.input.handbrake ? 1.25 : 1) * roadGrip;
    const maxYawRate = 0.78 + speedFactor * 1.35;
    const reverseDirection = this.speed < -0.5 ? -1 : 1;
    const targetYawRate = -this.input.steer * maxYawRate * rollingFactor * grip * reverseDirection;
    const steeringResponse = 8 + speedFactor * 8;
    this.yawRate = THREE.MathUtils.damp(this.yawRate, targetYawRate, steeringResponse, dt);
    this.root.rotation.y += this.yawRate * dt;
    this.forward.set(0, 0, -1).applyQuaternion(this.root.quaternion);
    this.root.position.addScaledVector(this.forward, this.speed * dt);
    this.resolveSceneryCollision();
    this.applyGravityAndGroundContact(dt);

    const wheels = this.wheels ?? [];
    for (const wheel of wheels) {
      if (wheel.front) wheel.pivot.rotation.y = -this.input.steer * 0.5;
      if (wheel.rollPivot) wheel.rollPivot.rotation.x -= this.speed * dt / Math.max(wheel.radius, 0.1);
      if (wheel.tire) wheel.tire.rotation.x -= this.speed * dt / (wheel.radius ?? 0.46);
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
    this.pitch = this.roll = 0;
    this.damage = 0;
    for (const mark of this.root.userData.damageMarks ?? []) mark.visible = false;
    this.collisionCooldown = 0;
    this.verticalVelocity = 0;
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false };
  }

  applyGravityAndGroundContact(dt) {
    if (!this.track?.getGroundHeightAt) return;
    const yaw = this.root.rotation.y;
    const sample = (localX, localZ) => {
      const x = this.root.position.x + Math.cos(yaw) * localX + Math.sin(yaw) * localZ;
      const z = this.root.position.z - Math.sin(yaw) * localX + Math.cos(yaw) * localZ;
      return this.track.getGroundHeightAt(x, z);
    };
    const halfWidth = this.bodyHalfWidth;
    const halfLength = this.bodyHalfLength;
    const frontLeft = sample(-halfWidth, -halfLength);
    const frontRight = sample(halfWidth, -halfLength);
    const rearLeft = sample(-halfWidth, halfLength);
    const rearRight = sample(halfWidth, halfLength);
    const front = (frontLeft + frontRight) * 0.5;
    const rear = (rearLeft + rearRight) * 0.5;
    const left = (frontLeft + rearLeft) * 0.5;
    const right = (frontRight + rearRight) * 0.5;
    const targetPitch = THREE.MathUtils.clamp(Math.atan2(front - rear, halfLength * 2), -0.58, 0.58);
    const targetRoll = THREE.MathUtils.clamp(Math.atan2(right - left, halfWidth * 2), -0.42, 0.42);
    this.pitch = THREE.MathUtils.damp(this.pitch, targetPitch, 8, dt);
    this.roll = THREE.MathUtils.damp(this.roll, targetRoll, 8, dt);
    this.root.rotation.x = this.pitch;
    this.root.rotation.z = this.roll;

    const targetY = (frontLeft + frontRight + rearLeft + rearRight) * 0.25 + (this.root.userData.groundOffset ?? 0.02);
    const suspensionTarget = targetY + this.gravity / 58;
    const suspensionAcceleration = (suspensionTarget - this.root.position.y) * 58 - this.verticalVelocity * 15 - this.gravity;
    this.verticalVelocity += suspensionAcceleration * dt;
    this.root.position.y += this.verticalVelocity * dt;
    if (Math.abs(targetY - this.root.position.y) < 0.012 && Math.abs(this.verticalVelocity) < 0.08) {
      this.root.position.y = targetY;
      this.verticalVelocity = 0;
    }
  }

  sampleForwardGrade() {
    if (!this.track?.getElevationAt) return 0;
    const distance = 9;
    const frontX = this.root.position.x + this.forward.x * distance;
    const frontZ = this.root.position.z + this.forward.z * distance;
    const rearX = this.root.position.x - this.forward.x * distance;
    const rearZ = this.root.position.z - this.forward.z * distance;
    return THREE.MathUtils.clamp((this.track.getElevationAt(frontX, frontZ) - this.track.getElevationAt(rearX, rearZ)) / (distance * 2), -0.55, 0.55);
  }

  resolveSceneryCollision() {
    this.collisionCooldown = Math.max(0, this.collisionCooldown - (this.lastDt ?? 0));
    for (const obstacle of this.collisionObjects) {
      const dx = this.root.position.x - obstacle.x;
      const dz = this.root.position.z - obstacle.z;
      const carHalfHeight = this.root.userData.groundOffset ?? 0.7;
      if (obstacle.y !== undefined && Math.abs(this.root.position.y - obstacle.y) > carHalfHeight + (obstacle.halfHeight ?? 1)) continue;
      const minimum = obstacle.radius + 1.15;
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared >= minimum * minimum) continue;
      const distance = Math.sqrt(distanceSquared) || 0.001;
      const nx = dx / distance, nz = dz / distance;
      this.root.position.x = obstacle.x + nx * minimum;
      this.root.position.z = obstacle.z + nz * minimum;
      const impactSpeed = Math.abs(this.speed);
      if (this.collisionCooldown === 0 && impactSpeed > 3) {
        const hit = Math.min(36, Math.max(4, (impactSpeed - 2.5) * (obstacle.kind === 'building' ? 1.25 : 0.78)));
        this.damage = Math.min(100, this.damage + hit);
        const marks = this.root.userData.damageMarks ?? [];
        const visibleMarks = Math.min(marks.length, Math.floor(this.damage / 10));
        marks.forEach((mark, index) => { mark.visible = index < visibleMarks; });
        this.collisionCooldown = 0.85;
        this.speed *= obstacle.kind === 'building' ? 0.22 : 0.48;
        this.onDamage({ damage: this.damage, hit, kind: obstacle.kind });
        this.onImpact({ damage: this.damage, speed: impactSpeed, kind: obstacle.kind });
      } else if (impactSpeed > 0.2) {
        this.speed *= 0.88;
      }
    }
  }
}
