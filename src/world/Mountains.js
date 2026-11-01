import * as THREE from 'three';

export function addMountains(scene) {
  const geometry = new THREE.IcosahedronGeometry(1, 4);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const rough = 1 + 0.1 * Math.sin(x * 11 + z * 7) * Math.cos(y * 13 - x * 5) + 0.045 * Math.sin(z * 23 + y * 14);
    positions.setXYZ(i, x * rough, y * rough, z * rough);
  }
  geometry.computeVertexNormals();
  const colors = ['#647872', '#70827b', '#819087', '#6c7b77', '#8a9890'];
  const material = colors.map(color => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
  const mountains = new THREE.Group();
  for (let i = 0; i < 35; i++) {
    const angle = i / 35 * Math.PI * 2 + Math.random() * 0.12;
    const radius = 130 + Math.random() * 90;
    const height = 45 + Math.random() * 88;
    const mountain = new THREE.Mesh(geometry, material[i % material.length]);
    mountain.position.set(Math.cos(angle) * radius, height * 0.28 - 4, Math.sin(angle) * radius);
    mountain.scale.set(28 + Math.random() * 30, height, 28 + Math.random() * 30);
    mountain.rotation.y = Math.random() * Math.PI;
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    mountains.add(mountain);
  }
  scene.add(mountains);
}
