import * as THREE from 'three';
import { createTrack } from './Track.js';
import { createMapRoads } from './MapRoads.js';
import { addForest } from './Forest.js';
import { addMountains } from './Mountains.js';

export function createEnvironment(scene, mapData, terrainData) {
  const hemisphere = new THREE.HemisphereLight('#e1f1ed', '#53645a', 2.0);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight('#ffe8bd', 3.1);
  sun.position.set(-95, 155, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.00015;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshStandardMaterial({ color: '#596a50', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.4;
  ground.receiveShadow = true;
  scene.add(ground);

  let track;
  if (mapData && terrainData) {
    track = createMapRoads(scene, mapData, terrainData);
  } else {
    addMountains(scene);
    track = createTrack(scene);
    addRoadsideDetails(scene, track);
  }
  if (!mapData) addForest(scene, track, 290);
  return { track, spawn: track.spawn };
}

function addRoadsideDetails(scene, track) {
  const posts = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.24, 0.82, 0.2);
  const postMat = new THREE.MeshStandardMaterial({ color: '#e9e6d6', roughness: 0.8 });
  const capMat = new THREE.MeshStandardMaterial({ color: '#d9f36a', roughness: 0.7 });
  const caps = new THREE.Group();
  const capGeo = new THREE.BoxGeometry(0.26, 0.1, 0.22);
  for (let i = 0; i < 310; i += 3) {
    const t = i / 310;
    const center = track.curve.getPointAt(t);
    const tangent = track.curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.copy(center).addScaledVector(normal, side * (track.roadWidth / 2 + 1.0));
      post.position.y += 0.41;
      posts.add(post);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.copy(post.position);
      cap.position.y += 0.41;
      caps.add(cap);
    }
  }
  scene.add(posts, caps);
}
