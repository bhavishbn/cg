import * as THREE from 'three';

const ROAD_TYPES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service', 'track', 'pedestrian'];
const ROAD_WIDTHS = { motorway: 12, trunk: 10, primary: 9, secondary: 7.4, tertiary: 6.2, unclassified: 5.6, residential: 5.2, living_street: 4.8, service: 3.7, track: 4.4, pedestrian: 2.8 };
const ROAD_COLORS = { motorway: '#777875', trunk: '#666966', primary: '#555755', secondary: '#505351', tertiary: '#4b4e4c', unclassified: '#484c4a', residential: '#444846', living_street: '#414543', service: '#3d413f', track: '#514f48', pedestrian: '#777b76' };
const ROAD_SURFACE_OFFSET = 0.06;

export function createMapRoads(scene, roadData, terrainData) {
  const roadPoints = roadData.roads.flatMap(road => road.points);
  const sourceBounds = roadData.bbox;
  const [west, south, east, north] = roadPoints.length
    ? [
        Math.min(sourceBounds[0], ...roadPoints.map(point => point.lon)),
        Math.min(sourceBounds[1], ...roadPoints.map(point => point.lat)),
        Math.max(sourceBounds[2], ...roadPoints.map(point => point.lon)),
        Math.max(sourceBounds[3], ...roadPoints.map(point => point.lat)),
      ]
    : sourceBounds;
  const centerLat = (south + north) * 0.5;
  const centerLon = (west + east) * 0.5;
  const xMetersPerDegree = 111320 * Math.cos(THREE.MathUtils.degToRad(centerLat));
  const zMetersPerDegree = 111320;
  const widthMeters = (east - west) * xMetersPerDegree;
  const depthMeters = (north - south) * zMetersPerDegree;
  const [terrainWest, terrainSouth, terrainEast, terrainNorth] = terrainData?.bounds ?? roadData.bbox;
  const sourceElevations = terrainData?.elevations ?? new Array(17 * 25).fill(1050);
  const gridWidth = terrainData?.width ?? 17;
  const gridHeight = terrainData?.height ?? 25;
  const elevations = smoothElevationGrid(sourceElevations, gridWidth, gridHeight, gridWidth * gridHeight > 100_000 ? 0 : 1);
  // DEM values are metres above sea level. Keep gameplay and the rendered
  // terrain in real metre units so the road, ground contact, and car agree.
  const elevationScale = 1;
  let baseElevation = Infinity;
  for (const elevation of elevations) baseElevation = Math.min(baseElevation, elevation);
  const bounds = { west, south, east, north, widthMeters, depthMeters, centerLat, centerLon, xMetersPerDegree, zMetersPerDegree };
  const group = new THREE.Group();
  group.name = 'Chamonix–Argentière OpenStreetMap and Tilezen terrain';

  const terrainGeometry = new THREE.BufferGeometry();
  const terrainPositions = [];
  const terrainUvs = [];
  const terrainIndices = [];
  // Keep the large valley grid at its source density so the terrain stays
  // detailed without multiplying more than 640,000 elevation vertices.
  const terrainSubdivisions = gridWidth * gridHeight > 100_000 ? 1 : 8;
  const terrainMeshWidth = (gridWidth - 1) * terrainSubdivisions + 1;
  const terrainMeshHeight = (gridHeight - 1) * terrainSubdivisions + 1;
  for (let row = 0; row < terrainMeshHeight; row++) {
    for (let column = 0; column < terrainMeshWidth; column++) {
      const u = column / (terrainMeshWidth - 1);
      const v = row / (terrainMeshHeight - 1);
      const longitude = THREE.MathUtils.lerp(terrainWest, terrainEast, u);
      const latitude = THREE.MathUtils.lerp(terrainNorth, terrainSouth, v);
      const gridX = (longitude - terrainWest) / (terrainEast - terrainWest) * (gridWidth - 1);
      const gridZ = (terrainNorth - latitude) / (terrainNorth - terrainSouth) * (gridHeight - 1);
      const elevation = sampleGrid(elevations, gridWidth, gridHeight, gridX, gridZ);
      const x = (longitude - centerLon) * xMetersPerDegree;
      const z = -(latitude - centerLat) * zMetersPerDegree;
      terrainPositions.push(x, (elevation - baseElevation) * elevationScale, z);
      terrainUvs.push(u, 1 - v);
      if (column < terrainMeshWidth - 1 && row < terrainMeshHeight - 1) {
        const a = row * terrainMeshWidth + column;
        terrainIndices.push(a, a + terrainMeshWidth + 1, a + 1, a, a + terrainMeshWidth, a + terrainMeshWidth + 1);
      }
    }
  }
  terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(terrainPositions, 3));
  terrainGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(terrainUvs, 2));
  terrainGeometry.setIndex(terrainIndices);
  terrainGeometry.computeVertexNormals();
  const aerialTexture = new THREE.TextureLoader().load('/data/chamonix-valley-imagery.jpg');
  aerialTexture.colorSpace = THREE.SRGBColorSpace;
  aerialTexture.anisotropy = 8;
  const terrainMaterial = new THREE.MeshStandardMaterial({ map: aerialTexture, color: '#e5e8df', roughness: 1, side: THREE.DoubleSide });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
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
    for (const point of points) point.y = elevationAt(point.x, point.z, elevations, bounds, gridWidth, gridHeight, baseElevation, elevationScale);
    if (road.type !== 'pedestrian' && road.type !== 'service' && road.type !== 'track') {
      for (let i = 0; i < points.length - 1; i++) segments.push([points[i].x, points[i].z, points[i + 1].x, points[i + 1].z]);
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const nearest = nearestOnSegment(0, 0, a.x, a.z, b.x, b.z);
        const distance = nearest.x * nearest.x + nearest.z * nearest.z;
        if (distance < spawnDistance) {
          spawnDistance = distance;
          spawn = { x: nearest.x, z: nearest.z, yaw: Math.atan2(b.x - a.x, a.z - b.z), y: elevationAt(nearest.x, nearest.z, elevations, bounds, gridWidth, gridHeight, baseElevation, elevationScale) };
        }
      }
    }
    appendRoadStrip(bucket, points, ROAD_WIDTHS[road.type], elevation => elevationAt(elevation.x, elevation.z, elevations, bounds, gridWidth, gridHeight, baseElevation, elevationScale));
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
    getElevationAt: (x, z) => elevationAt(x, z, elevations, bounds, gridWidth, gridHeight, baseElevation, elevationScale, { west: terrainWest, south: terrainSouth, east: terrainEast, north: terrainNorth }),
    getGroundHeightAt: (x, z) => elevationAt(x, z, elevations, bounds, gridWidth, gridHeight, baseElevation, elevationScale, { west: terrainWest, south: terrainSouth, east: terrainEast, north: terrainNorth }) + ROAD_SURFACE_OFFSET,
    isClearOfRoads: (x, z, margin = 18) => segments.every(([ax, az, bx, bz]) => {
      const nearest = nearestOnSegment(x, z, ax, az, bx, bz);
      return nearest.distanceSquared > margin * margin;
    }),
  };
}

function project(point, bounds) {
  return {
    x: (point.lon - bounds.centerLon) * bounds.xMetersPerDegree,
    y: 0,
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
    const centerY = getElevation(points[i]) + ROAD_SURFACE_OFFSET;
    bucket.positions.push(points[i].x + sideX, centerY, points[i].z + sideZ, points[i].x - sideX, centerY, points[i].z - sideZ);
    if (i < points.length - 1) {
      const a = start + i * 2;
      bucket.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
}

function elevationAt(x, z, grid, bounds, gridWidth, gridHeight, baseElevation, elevationScale = 1, terrainBounds = bounds) {
  const lat = bounds.centerLat - z / bounds.zMetersPerDegree;
  const lon = bounds.centerLon + x / bounds.xMetersPerDegree;
  const u = THREE.MathUtils.clamp((lon - terrainBounds.west) / (terrainBounds.east - terrainBounds.west), 0, 1) * (gridWidth - 1);
  const v = THREE.MathUtils.clamp((terrainBounds.north - lat) / (terrainBounds.north - terrainBounds.south), 0, 1) * (gridHeight - 1);
  return (sampleGrid(grid, gridWidth, gridHeight, u, v) - baseElevation) * elevationScale;
}

function smoothElevationGrid(source, width, height, passes) {
  let current = source;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Array(current.length);
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        let total = 0;
        let weights = 0;
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const sampleX = THREE.MathUtils.clamp(column + dx, 0, width - 1);
            const sampleZ = THREE.MathUtils.clamp(row + dz, 0, height - 1);
            const weight = (dx === 0 ? 2 : 1) * (dz === 0 ? 2 : 1);
            total += current[sampleZ * width + sampleX] * weight;
            weights += weight;
          }
        }
        next[row * width + column] = total / weights;
      }
    }
    current = next;
  }
  return current;
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
