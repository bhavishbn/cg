import * as THREE from 'three';

const points = [
  [-18, 0, 0], [-18, 0, -34], [-14, 1, -63], [-2, 2.4, -82], [27, 3, -81],
  [51, 3.7, -69], [61, 3, -46], [55, 1.5, -24], [39, 0, -9], [36, 0, 14],
  [45, 1.6, 36], [38, 4, 59], [15, 5, 69], [-6, 4, 61], [-22, 2, 43],
  [-41, 1, 36], [-62, 1.8, 43], [-78, 3, 31], [-80, 2.2, 7], [-65, 1, -12],
  [-43, 0, -17], [-26, 0, -13],
].map(([x, y, z]) => new THREE.Vector3(x, y, z));

export function createTrack(scene) {
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.35);
  const divisions = 620;
  const roadWidth = 12.5;
  const roadGeometry = new THREE.BufferGeometry();
  const vertices = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions;
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    for (const edge of [-1, 1]) {
      const p = center.clone().addScaledVector(normal, edge * roadWidth * 0.5);
      vertices.push(p.x, p.y, p.z);
      uvs.push(edge === -1 ? 0 : 1, t * 92);
    }
    if (i < divisions) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  roadGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeometry.setIndex(indices);
  roadGeometry.computeVertexNormals();
  const roadMaterial = new THREE.MeshStandardMaterial({ color: '#393e3b', roughness: 0.93, metalness: 0.02, side: THREE.DoubleSide });
  const road = new THREE.Mesh(roadGeometry, roadMaterial);
  road.receiveShadow = true;
  road.name = 'procedural closed circuit';
  scene.add(road);

  const edges = new THREE.Group();
  const centerLines = new THREE.Group();
  const startIndex = 11 / divisions;
  const stripeGeometry = new THREE.BoxGeometry(0.22, 0.035, 2.2);
  const whiteMaterial = new THREE.MeshStandardMaterial({ color: '#e7e7da', roughness: 0.85 });
  const yellowMaterial = new THREE.MeshStandardMaterial({ color: '#d9f36a', roughness: 0.8 });
  for (let i = 0; i < divisions; i += 2) {
    const t = i / divisions;
    const center = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    for (const side of [-1, 1]) {
      const line = new THREE.Mesh(stripeGeometry, yellowMaterial);
      line.position.copy(center).addScaledVector(normal, side * (roadWidth * 0.5 - 0.23));
      line.position.y += 0.045;
      line.rotation.y = Math.atan2(tangent.x, tangent.z);
      edges.add(line);
    }
    if (i % 10 === 0) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.025, 2.0), whiteMaterial);
      dash.position.copy(center);
      dash.position.y += 0.055;
      dash.rotation.y = Math.atan2(tangent.x, tangent.z);
      centerLines.add(dash);
    }
  }
  scene.add(edges, centerLines);
  addGrid(scene, curve, roadWidth, startIndex);
  return { curve, roadWidth, length: curve.getLength(), startIndex };
}

function addGrid(scene, curve, roadWidth, t) {
  const center = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t).normalize();
  const across = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
  const group = new THREE.Group();
  const tile = new THREE.BoxGeometry(1.25, 0.045, 0.8);
  const white = new THREE.MeshBasicMaterial({ color: '#f5f2e8' });
  const dark = new THREE.MeshBasicMaterial({ color: '#18201d' });
  for (let i = 0; i < 12; i++) {
    for (let row = 0; row < 2; row++) {
      const square = new THREE.Mesh(tile, (i + row) % 2 ? white : dark);
      square.position.copy(center).addScaledVector(across, -roadWidth / 2 + (i + 0.5) * roadWidth / 12);
      square.position.addScaledVector(tangent, (row - 0.5) * 0.82);
      square.position.y += 0.07;
      square.rotation.y = Math.atan2(tangent.x, tangent.z);
      group.add(square);
    }
  }
  scene.add(group);
}
