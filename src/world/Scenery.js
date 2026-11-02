import * as THREE from 'three';

const BUILDING_ROADS = new Set(['primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service']);

export function addValleyScenery(scene, track) {
  const random = seededRandom(0x5a17c3);
  const collisionObjects = [];
  const buildingPositions = [];
  const buildingColors = ['#d7c8ae', '#c9bfa9', '#bcae97', '#e0d7c5', '#aebbb1'];
  const roofColors = ['#514b42', '#66574b', '#4b5150', '#786550'];
  const houseGeometry = new THREE.BoxGeometry(1, 1, 1);
  const roofGeometry = new THREE.ConeGeometry(1, 1, 4);
  const houseMaterial = new THREE.MeshStandardMaterial({ roughness: 0.92 });
  const roofMaterial = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const houses = new THREE.InstancedMesh(houseGeometry, houseMaterial, 520);
  const roofs = new THREE.InstancedMesh(roofGeometry, roofMaterial, 520);
  const dummy = new THREE.Object3D();
  const houseMeta = [];

  for (const path of track.roadPaths ?? []) {
    if (!BUILDING_ROADS.has(path.type) || path.points.length < 2) continue;
    let distanceToNext = 24 + random() * 35;
    for (let i = 0; i < path.points.length - 1 && houseMeta.length < 520; i++) {
      const a = path.points[i], b = path.points[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.1) continue;
      const tangentX = dx / length, tangentZ = dz / length;
      const sideX = -tangentZ, sideZ = tangentX;
      for (let along = distanceToNext; along < length && houseMeta.length < 520; along += 48 + random() * 26) {
        const t = along / length;
        const centerX = THREE.MathUtils.lerp(a.x, b.x, t);
        const centerZ = THREE.MathUtils.lerp(a.z, b.z, t);
        for (const side of random() > 0.5 ? [-1, 1] : [1, -1]) {
          const setback = 15 + random() * 24;
          const x = centerX + sideX * setback * side;
          const z = centerZ + sideZ * setback * side;
          if (!insideBounds(track, x, z) || !track.isClearOfRoads(x, z, 8)) continue;
          const width = 5 + random() * 4;
          const depth = 6 + random() * 5;
          const radius = Math.hypot(width, depth) * 0.43;
          if (hasNearby(buildingPositions, x, z, radius + 5)) continue;
          const elevation = track.getElevationAt(x, z);
          const height = 3.8 + random() * 3.8;
          const roofHeight = 1.6 + random() * 1.7;
          const yaw = Math.atan2(tangentX, tangentZ) + (random() - 0.5) * 0.3;
          const colorIndex = Math.floor(random() * buildingColors.length);
          houseMeta.push({ x, y: elevation, z, width, depth, height, roofHeight, yaw, radius, colorIndex });
          buildingPositions.push({ x, z, radius });
          collisionObjects.push({ x, z, radius, kind: 'building', y: elevation + (height + roofHeight) / 2, halfHeight: (height + roofHeight) / 2 });
          break;
        }
        distanceToNext = 0;
      }
      distanceToNext = 24 + random() * 35;
    }
  }

  houseMeta.forEach((house, index) => {
    dummy.position.set(house.x, house.y + house.height / 2, house.z);
    dummy.rotation.set(0, house.yaw, 0);
    dummy.scale.set(house.width, house.height, house.depth);
    dummy.updateMatrix();
    houses.setMatrixAt(index, dummy.matrix);
    houses.setColorAt(index, new THREE.Color(buildingColors[house.colorIndex]));
    dummy.position.y = house.y + house.height + house.roofHeight / 2;
    dummy.scale.set(house.width * 0.76, house.roofHeight, house.depth * 0.76);
    dummy.rotation.set(0, house.yaw + Math.PI / 4, 0);
    dummy.updateMatrix();
    roofs.setMatrixAt(index, dummy.matrix);
    roofs.setColorAt(index, new THREE.Color(roofColors[Math.floor(random() * roofColors.length)]));
  });
  houses.count = roofs.count = houseMeta.length;
  houses.castShadow = roofs.castShadow = true;
  houses.receiveShadow = roofs.receiveShadow = true;
  scene.add(houses, roofs);

  const treeCount = 1600;
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.24, 0.48, 1, 7),
    new THREE.MeshStandardMaterial({ color: '#554638', roughness: 1 }),
    treeCount,
  );
  const foliage = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 1, 7),
    new THREE.MeshStandardMaterial({ roughness: 0.97 }),
    treeCount,
  );
  const treeColors = ['#183c31', '#21483a', '#2e5240', '#315541'].map(color => new THREE.Color(color));
  let treesPlaced = 0;
  for (let attempt = 0; attempt < 19000 && treesPlaced < treeCount; attempt++) {
    const point = sampleRoadPoint(track, random);
    if (!point) break;
    const angle = random() * Math.PI * 2;
    const distance = 19 + random() * 155;
    const x = point.x + Math.cos(angle) * distance;
    const z = point.z + Math.sin(angle) * distance;
    if (!insideBounds(track, x, z) || !track.isClearOfRoads(x, z, 15)) continue;
    const scale = 7.5 + random() * 11;
    const radius = 0.65 + scale * 0.025;
    if (hasNearby(buildingPositions, x, z, radius + 1)) continue;
    const ground = track.getElevationAt(x, z);
    dummy.position.set(x, ground + scale * 0.5, z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.set(scale * 0.07, scale, scale * 0.07);
    dummy.updateMatrix();
    trunk.setMatrixAt(treesPlaced, dummy.matrix);
    dummy.position.y = ground + scale * 1.1;
    dummy.scale.set(scale * 0.55, scale * 0.86, scale * 0.55);
    dummy.updateMatrix();
    foliage.setMatrixAt(treesPlaced, dummy.matrix);
    foliage.setColorAt(treesPlaced, treeColors[Math.floor(random() * treeColors.length)]);
    collisionObjects.push({ x, z, radius, kind: 'tree', y: ground + scale * 0.72, halfHeight: scale * 0.72 });
    treesPlaced++;
  }
  trunk.count = foliage.count = treesPlaced;
  trunk.castShadow = foliage.castShadow = true;
  foliage.receiveShadow = true;
  scene.add(foliage, trunk);

  const rockCount = 700;
  const rockMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: '#817e73', roughness: 1, flatShading: true }),
    rockCount,
  );
  let rocksPlaced = 0;
  for (let attempt = 0; attempt < 9000 && rocksPlaced < rockCount; attempt++) {
    const point = sampleRoadPoint(track, random);
    if (!point) break;
    const angle = random() * Math.PI * 2;
    const distance = 9 + random() * 75;
    const x = point.x + Math.cos(angle) * distance;
    const z = point.z + Math.sin(angle) * distance;
    if (!insideBounds(track, x, z) || !track.isClearOfRoads(x, z, 4)) continue;
    const radius = 0.6 + random() * 2.5;
    if (hasNearby(buildingPositions, x, z, radius + 2)) continue;
    const ground = track.getElevationAt(x, z);
    dummy.position.set(x, ground + radius * 0.48, z);
    dummy.rotation.set(random() * 0.3, random() * Math.PI * 2, random() * 0.3);
    dummy.scale.set(radius * (0.9 + random() * 0.7), radius * (0.65 + random() * 0.75), radius * (0.8 + random() * 0.8));
    dummy.updateMatrix();
    rockMesh.setMatrixAt(rocksPlaced, dummy.matrix);
    collisionObjects.push({ x, z, radius: radius * 0.82, kind: 'rock', y: ground + radius * 0.45, halfHeight: radius * 0.75 });
    rocksPlaced++;
  }
  rockMesh.count = rocksPlaced;
  rockMesh.castShadow = rockMesh.receiveShadow = true;
  scene.add(rockMesh);

  return { collisionObjects, counts: { buildings: houseMeta.length, trees: treesPlaced, rocks: rocksPlaced } };
}

function sampleRoadPoint(track, random) {
  const paths = track.roadPaths;
  if (!paths?.length) return null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const path = paths[Math.floor(random() * paths.length)];
    if (!path || path.points.length < 2) continue;
    const index = Math.floor(random() * (path.points.length - 1));
    const a = path.points[index], b = path.points[index + 1];
    const t = random();
    return { x: THREE.MathUtils.lerp(a.x, b.x, t), z: THREE.MathUtils.lerp(a.z, b.z, t) };
  }
  return null;
}

function insideBounds(track, x, z) {
  return x > -track.bounds.widthMeters * 0.49 && x < track.bounds.widthMeters * 0.49
    && z > -track.bounds.depthMeters * 0.49 && z < track.bounds.depthMeters * 0.49;
}

function hasNearby(objects, x, z, minimumDistance) {
  const minDistanceSquared = minimumDistance * minimumDistance;
  return objects.some(object => (object.x - x) ** 2 + (object.z - z) ** 2 < minDistanceSquared);
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
