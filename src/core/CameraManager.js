import * as THREE from 'three';

export class CameraManager {
  constructor(camera, target) {
    this.camera = camera;
    this.target = target;
    this.position = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();
  }

  update(dt, speed, mode) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.target.quaternion);
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.target.quaternion);
    let desired;
    if (mode === 3) {
      this.camera.up.set(0, 0, -1);
      desired = this.target.position.clone().add(new THREE.Vector3(0, 38 + speed * 0.12, 0));
      this.lookTarget.copy(this.target.position);
    } else if (mode === 1) {
      this.camera.up.set(0, 1, 0);
      desired = this.target.position.clone().add(new THREE.Vector3(0, 0.94, 0)).addScaledVector(side, -0.32).addScaledVector(forward, -0.38);
      this.lookTarget.copy(desired).add(new THREE.Vector3(0, -0.16, 0)).addScaledVector(forward, 22);
    } else if (mode === 2) {
      this.camera.up.set(0, 1, 0);
      desired = this.target.position.clone().addScaledVector(forward, -16).add(new THREE.Vector3(0, 6.6 + speed * 0.012, 0));
      this.lookTarget.copy(this.target.position).add(new THREE.Vector3(0, 1.0, 0)).addScaledVector(forward, 2.4);
    } else {
      this.camera.up.set(0, 1, 0);
      const distance = 8.8 + Math.min(speed * 0.035, 2.4);
      desired = this.target.position.clone().addScaledVector(forward, -distance).add(new THREE.Vector3(0, 4.1 + speed * 0.012, 0));
      desired.addScaledVector(side, Math.min(speed * 0.004, 0.28));
      this.lookTarget.copy(this.target.position).add(new THREE.Vector3(0, 0.95, 0)).addScaledVector(forward, 3.4 + speed * 0.045);
    }
    const blend = 1 - Math.exp(-dt * (mode === 1 ? 13 : 5.2));
    this.camera.position.lerp(desired, blend);
    this.camera.lookAt(this.lookTarget);
  }
}
