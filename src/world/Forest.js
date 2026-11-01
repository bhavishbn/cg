import * as THREE from 'three';

export function addForest(scene, track, count = 380) {
  const trunkGeometry = new THREE.CylinderGeometry(0.11, 0.18, 1.3, 5);
  const pineGeometry = new THREE.ConeGeometry(1, 2.3, 6);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#554638', roughness: 1 });
  const pineMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, count);
  const pines = new THREE.InstancedMesh(pineGeometry, pineMaterial, count);
  const dummy = new THREE.Object3D();
  const leafColors = ['#203b35', '#29453a', '#344b3d', '#263b37'].map(color => new THREE.Color(color));
  const treeGroups = track.bounds ? Math.floor(count * 2.5) : count * 14;
  let placed = 0;
  let attempts = 0;
  while (placed < count && attempts < treeGroups) {
    attempts++;
    const x = track.bounds ? (Math.random() - 0.5) * track.bounds.widthMeters : (Math.random() - 0.5) * 235;
    const z = track.bounds ? (Math.random() - 0.5) * track.bounds.depthMeters : (Math.random() - 0.5) * 235;
    if (track.bounds ? !track.isClearOfRoads(x, z, 28) : Math.hypot(x + 8, z + 6) > 112) continue;
    if (!track.bounds) {
      let minD = Infinity;
      for (let j = 0; j < 50; j++) {
        const p = track.curve.getPointAt(j / 50);
        minD = Math.min(minD, Math.hypot(x - p.x, z - p.z));
      }
      if (minD < 11.5) continue;
    }
    const scale = track.bounds ? 0.8 + Math.random() * 1.5 : 0.65 + Math.random() * 1.05;
    const y = track.bounds ? track.getElevationAt(x, z) : -0.6 + (Math.random() - 0.5) * 0.6;
    dummy.position.set(x, y + 0.65 * scale, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    dummy.position.y += 1.25 * scale;
    dummy.updateMatrix();
    pines.setMatrixAt(placed, dummy.matrix);
    pines.setColorAt(placed, leafColors[Math.floor(Math.random() * leafColors.length)]);
    placed++;
  }
  trunks.count = placed;
  pines.count = placed;
  pines.castShadow = true;
  pines.receiveShadow = true;
  scene.add(pines);
  trunks.castShadow = true;
  scene.add(trunks);
}
