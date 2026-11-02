import * as THREE from 'three';

export function createCar(model = null) {
  const root = new THREE.Group();
  const chassis = new THREE.Group();
  root.add(chassis);
  if (model) {
    model.name = 'Bugatti Chiron 2017';
    model.updateMatrixWorld(true);
    const modelBounds = new THREE.Box3().setFromObject(model);
    const wheels = createWheelPivots(model, modelBounds);
    model.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    chassis.add(model);
    const center = modelBounds.getCenter(new THREE.Vector3());
    const size = modelBounds.getSize(new THREE.Vector3());
    chassis.position.set(-center.x, -center.y, -center.z);
    root.userData.groundOffset = size.y * 0.5;
    root.userData.contactHalfWidth = Math.max(0.65, size.x * 0.34);
    root.userData.contactHalfLength = Math.max(1.2, size.z * 0.31);
    root.userData.wheels = wheels;
    root.userData.damageMarks = addDamageMarks(root, size.x, size.z);
    return { root, chassis, wheels, model };
  }

  const paint = new THREE.MeshPhysicalMaterial({ color: '#c9e94f', metalness: 0.72, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.18 });
  const darkPaint = new THREE.MeshStandardMaterial({ color: '#1c2422', metalness: 0.65, roughness: 0.3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#263b3d', metalness: 0.55, roughness: 0.16, transmission: 0.08, transparent: true, opacity: 0.92 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#101312', roughness: 0.92 });
  const alloy = new THREE.MeshStandardMaterial({ color: '#a6b0ac', metalness: 0.84, roughness: 0.25 });
  const red = new THREE.MeshBasicMaterial({ color: '#ff3430' });
  const white = new THREE.MeshBasicMaterial({ color: '#f4ffe5' });

  addMesh(chassis, new THREE.BoxGeometry(1.9, 0.42, 4.45), paint, [0, 0.7, 0.03]);
  addMesh(chassis, new THREE.BoxGeometry(1.84, 0.17, 1.05), paint, [0, 0.86, 1.61]);
  addMesh(chassis, new THREE.BoxGeometry(1.83, 0.16, 0.9), paint, [0, 0.85, -1.55]);
  addMesh(chassis, new THREE.BoxGeometry(1.42, 0.72, 1.82), glass, [0, 1.22, -0.06], [0.16, 0, 0]);
  addMesh(chassis, new THREE.BoxGeometry(1.83, 0.12, 1.92), paint, [0, 1.61, -0.04], [0.16, 0, 0]);
  addMesh(chassis, new THREE.BoxGeometry(1.45, 0.08, 1.7), darkPaint, [0, 1.29, -0.03]);
  addMesh(chassis, new THREE.BoxGeometry(1.92, 0.17, 0.48), darkPaint, [0, 0.5, -2.04]);
  addMesh(chassis, new THREE.BoxGeometry(1.9, 0.17, 0.42), darkPaint, [0, 0.48, 2.16]);
  addMesh(chassis, new THREE.BoxGeometry(1.62, 0.07, 0.12), darkPaint, [0, 0.44, -2.34]);
  addMesh(chassis, new THREE.BoxGeometry(1.7, 0.12, 0.11), paint, [0, 1.62, -1.72]);
  for (const x of [-0.88, 0.88]) {
    addMesh(chassis, new THREE.BoxGeometry(0.12, 0.12, 0.17), red, [x, 0.79, -2.25]);
    addMesh(chassis, new THREE.BoxGeometry(0.28, 0.1, 0.14), white, [x * 0.75, 0.93, 2.25]);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.23), paint);
    mirror.position.set(x * 1.17, 1.25, 0.57);
    chassis.add(mirror);
  }
  addMesh(chassis, new THREE.BoxGeometry(1.23, 0.1, 0.28), darkPaint, [0, 1.67, -2.1]);
  // Keep the root at chassis center so all four contact points can pitch and
  // roll the whole vehicle around its suspension instead of around its floor.
  chassis.position.y = -0.87;
  const wheels = [];
  for (const x of [-1.0, 1.0]) for (const z of [-1.46, 1.48]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.48, z);
    chassis.add(pivot);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.29, 24), rubber);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    pivot.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.305, 16), alloy);
    rim.rotation.z = Math.PI / 2;
    pivot.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.32, 12), darkPaint);
    hub.rotation.z = Math.PI / 2;
    pivot.add(hub);
    wheels.push({ pivot, tire, radius: 0.46, front: z < 0 });
  }
  root.position.set(-18, 0.48, -10);
  root.rotation.y = 0;
  root.userData.groundOffset = 0.87;
  root.userData.contactHalfWidth = 0.84;
  root.userData.contactHalfLength = 1.44;
  root.userData.wheels = wheels;
  root.userData.damageMarks = addDamageMarks(root, 1.9, 4.7);
  return { root, chassis, wheels };
}

function addDamageMarks(root, width, length) {
  const material = new THREE.MeshStandardMaterial({ color: '#28221f', roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  const marks = [];
  for (const side of [-1, 1]) for (const z of [-0.31, 0.12, 0.48]) {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.2), material);
    mark.position.set(side * width * 0.48, -0.04, z * length);
    mark.rotation.y = side * Math.PI / 2;
    mark.visible = false;
    mark.castShadow = false;
    root.add(mark);
    marks.push(mark);
  }
  return marks;
}

function createWheelPivots(model, modelBounds) {
  const frontWheelMeshes = [];
  model.traverse(object => {
    if (object.isMesh && /Cube\.046|Cube\.048/i.test(object.name)) frontWheelMeshes.push(object);
  });

  // The supplied Chiron file separates only one axle into wheel meshes.
  // Duplicate its left/right wheel assemblies onto the other axle so all four
  // wheels can steer (front) and roll visibly while driving.
  if (frontWheelMeshes.length === 2) {
    const averageZ = frontWheelMeshes.reduce((sum, wheel) => sum + new THREE.Box3().setFromObject(wheel).getCenter(new THREE.Vector3()).z, 0) / frontWheelMeshes.length;
    const wheelbase = modelBounds.getSize(new THREE.Vector3()).z * 0.56;
    const offset = averageZ >= 0 ? -wheelbase : wheelbase;
    for (const original of [...frontWheelMeshes]) {
      const duplicate = original.clone();
      duplicate.name = `${original.name} opposite axle`;
      duplicate.position.z += offset;
      model.add(duplicate);
      frontWheelMeshes.push(duplicate);
    }
  }

  const modelWorldInverse = model.matrixWorld.clone().invert();
  const centers = frontWheelMeshes.map(wheelMesh => {
    const bounds = new THREE.Box3().setFromObject(wheelMesh);
    const center = bounds.getCenter(new THREE.Vector3()).applyMatrix4(modelWorldInverse);
    return { wheelMesh, center, bounds };
  });
  const averageZ = centers.reduce((sum, wheel) => sum + wheel.center.z, 0) / centers.length;
  return centers.map(({ wheelMesh, center, bounds }) => {
    const size = bounds.getSize(new THREE.Vector3());
    const pivot = new THREE.Group();
    pivot.name = `${wheelMesh.name} steering pivot`;
    pivot.position.copy(center);
    model.add(pivot);
    const rollPivot = new THREE.Group();
    rollPivot.name = `${wheelMesh.name} roll pivot`;
    pivot.add(rollPivot);
    rollPivot.attach(wheelMesh);
    return { pivot, rollPivot, radius: Math.max(size.y, size.z) * 0.5, front: center.z < averageZ - 0.2 };
  });
}

function addMesh(parent, geometry, material, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
