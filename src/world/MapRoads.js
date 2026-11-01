import * as THREE from 'three';

const ROAD_TYPES = ['primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service', 'pedestrian'];
const ROAD_WIDTHS = { primary: 9, secondary: 7.4, tertiary: 6.2, unclassified: 5.6, residential: 5.2, living_street: 4.8, service: 3.7, pedestrian: 2.8 };
const ROAD_COLORS = { primary: '#555755', secondary: '#505351', tertiary: '#4b4e4c', unclassified: '#484c4a', residential: '#444846', living_street: '#414543', service: '#3d413f', pedestrian: '#777b76' };

export function createMapRoads(scene, roadData, terrainData) {
  const [west, south, east, north] = roadData.bbox;
  const centerLat = (south + north) * 0.5;
  const centerLon = (west + east) * 0.5;
  const xMetersPerDegree = 111320 * Math.cos(THREE.MathUtils.degToRad(centerLat));
  const zMetersPerDegree = 111320;
  const widthMeters = (east - west) * xMetersPerDegree;
  const depthMeters = (north - south) * zMetersPerDegree;
  const elevations = terrainData?.elevations ?? new Array(17 * 25).fill(1050);
  const gridWidth = terrainData?.width ?? 17;
  const gridHeight = terrainData?.height ?? 25;
  const baseElevation = Math.min(...elevations);
  const bounds = { west, south, east, north, widthMeters, depthMeters, centerLat, centerLon, xMetersPerDegree, zMetersPerDegree };
  const group = new THREE.Group();
  group.name = 'Chamonix OpenStreetMap and Copernicus terrain';

  const terrainGeometry = new THREE.BufferGeometry();
  const terrainPositions = [];
  const terrainUvs = [];
  const terrainIndices = [];
  const terrainSubdivisions = 5;
  const terrainMeshWidth = (gridWidth - 1) * terrainSubdivisions + 1;
  const terrainMeshHeight = (gridHeight - 1) * terrainSubdivisions + 1;
  for (let row = 0; row < terrainMeshHeight; row++) {
    for (let column = 0; column < terrainMeshWidth; column++) {
      const u = column / (terrainMeshWidth - 1);
      const v = row / (terrainMeshHeight - 1);
      const gridX = u * (gridWidth - 1);
      const gridZ = v * (gridHeight - 1);
      const elevation = sampleGrid(elevations, gridWidth, gridHeight, gridX, gridZ);
      terrainPositions.push(-widthMeters / 2 + u * widthMeters, elevation - baseElevation, -depthMeters / 2 + v * depthMeters);
      terrainUvs.push(u, 1 - v);
      if (column < terrainMeshWidth - 1 && row < terrainMeshHeight - 1) {
        const a = row * terrainMeshWidth + column;
        terrainIndices.push(a, a + terrainMeshWidth, a + 1, a + 1, a + terrainMeshWidth, a + terrainMeshWidth + 1);
      }
    }
  }
  terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(terrainPositions, 3));
  terrainGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(terrainUvs, 2));
  terrainGeometry.setIndex(terrainIndices);
  terrainGeometry.computeVertexNormals();
  const aerialTexture = new THREE.TextureLoader().load('/data/chamonix-aerial.jpg');
  aerialTexture.colorSpace = THREE.SRGBColorSpace;
  aerialTexture.anisotropy = 8;
  const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({ map: aerialTexture, color: '#ffffff', roughness: 1, side: THREE.DoubleSide }));
  terrain.receiveShadow = true;
  group.add(terrain);

  const buckets = new Map(ROAD_TYPES.map(type => [type, { positions: [], indices: [] }]));
  const segments = [];
  let spawn = null;
  let spawnDistance = Infinity;
  for (const road of roadData.roads) {
    const bucket = buckets.get(road.type);
    if (!bucket || road.points.length < 2) continue;
    const points = road.points.map(point => project(point, bounds));
    if (road.type !== 'pedestrian' && road.type !== 'service') {
      for (let i = 0; i < points.length - 1; i++) segments.push([points[i].x, points[i].z, points[i + 1].x, points[i + 1].z]);
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const nearest = nearestOnSegment(0, 0, a.x, a.z, b.x, b.z);
        const distance = nearest.x * nearest.x + nearest.z * nearest.z;
        if (distance < spawnDistance) {
          spawnDistance = distance;
          spawn = { x: nearest.x, z: nearest.z, yaw: Math.atan2(b.x - a.x, a.z - b.z), y: elevationAt(nearest.x, nearest.z, elevations, bounds, gridWidth, gridHeight, baseElevation) };
        }
      }
    }
    appendRoadStrip(bucket, points, ROAD_WIDTHS[road.type], elevation => elevationAt(elevation.x, elevation.z, elevations, bounds, gridWidth, gridHeight, baseElevation));
  }

  for (const [type, bucket] of buckets) {
    if (!bucket.positions.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
    geometry.setIndex(bucket.indices);
    geometry.computeVertexNormals();
    const road = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: ROAD_COLORS[type], roughness: 0.96, side: THREE.DoubleSide }));
    road.receiveShadow = true;
    road.name = `OpenStreetMap ${type} roads`;
    group.add(road);
  }

  scene.add(group);
  return {
    group,
    bounds,
    spawn: spawn ?? { x: 0, z: 0, yaw: 0, y: 0 },
    roadCount: roadData.roads.length,
    getElevationAt: (x, z) => elevationAt(x, z, elevations, bounds, gridWidth, gridHeight, baseElevation),
    isClearOfRoads: (x, z, margin = 18) => segments.every(([ax, az, bx, bz]) => {
      const nearest = nearestOnSegment(x, z, ax, az, bx, bz);
      return nearest.distanceSquared > margin * margin;
    }),
  };
}

function project(point, bounds) {
  return {
    x: (point.lon - bounds.centerLon) * bounds.xMetersPerDegree,
    z: -(point.lat - bounds.centerLat) * bounds.zMetersPerDegree,
  };
}

function appendRoadStrip(bucket, points, width, getElevation) {
  const start = bucket.positions.length / 3;
  const halfWidth = width / 2;
  for (let i = 0; i < points.length; i++) {
    const before = points[Math.max(i - 1, 0)];
    const after = points[Math.min(i + 1, points.length - 1)];
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const length = Math.hypot(dx, dz) || 1;
    const sideX = dz / length * halfWidth;
    const sideZ = -dx / length * halfWidth;
    const centerY = getElevation(points[i]) + 0.9;
    bucket.positions.push(points[i].x + sideX, centerY, points[i].z + sideZ, points[i].x - sideX, centerY, points[i].z - sideZ);
    if (i < points.length - 1) {
      const a = start + i * 2;
      bucket.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
}

function elevationAt(x, z, grid, bounds, gridWidth, gridHeight, baseElevation) {
  const u = THREE.MathUtils.clamp((x + bounds.widthMeters / 2) / bounds.widthMeters, 0, 1) * (gridWidth - 1);
  const v = THREE.MathUtils.clamp((z + bounds.depthMeters / 2) / bounds.depthMeters, 0, 1) * (gridHeight - 1);
  return sampleGrid(grid, gridWidth, gridHeight, u, v) - baseElevation;
}

function sampleGrid(grid, gridWidth, gridHeight, u, v) {
  const x0 = Math.floor(u), z0 = Math.floor(v);
  const x1 = Math.min(gridWidth - 1, x0 + 1), z1 = Math.min(gridHeight - 1, z0 + 1);
  const tx = u - x0, tz = v - z0;
  const top = THREE.MathUtils.lerp(grid[z0 * gridWidth + x0], grid[z0 * gridWidth + x1], tx);
  const bottom = THREE.MathUtils.lerp(grid[z1 * gridWidth + x0], grid[z1 * gridWidth + x1], tx);
  return THREE.MathUtils.lerp(top, bottom, tz);
}

function nearestOnSegment(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const lengthSquared = dx * dx + dz * dz || 1;
  const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / lengthSquared, 0, 1);
  const nearestX = ax + dx * t, nearestZ = az + dz * t;
  return { x: nearestX, z: nearestZ, distanceSquared: (x - nearestX) ** 2 + (z - nearestZ) ** 2 };
}
