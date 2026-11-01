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
    if (mode === 1) {
      desired = this.target.position.clone().add(new THREE.Vector3(0, 1.55, 0)).addScaledVector(forward, 0.55);
      this.lookTarget.copy(desired).addScaledVector(forward, 13);
    } else {
      const distance = 8.3 + Math.min(speed * 0.06, 3.4);
      desired = this.target.position.clone().addScaledVector(forward, -distance).add(new THREE.Vector3(0, 4.0 + speed * 0.018, 0));
      desired.addScaledVector(side, Math.min(speed * 0.004, 0.28));
      this.lookTarget.copy(this.target.position).add(new THREE.Vector3(0, 0.95, 0)).addScaledVector(forward, 4.8 + speed * 0.09);
    }
    const blend = 1 - Math.exp(-dt * (mode === 1 ? 13 : 4.2));
    this.camera.position.lerp(desired, blend);
    this.camera.lookAt(this.lookTarget);
  }
}
