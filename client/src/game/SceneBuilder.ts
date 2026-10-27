import * as THREE from 'three';

export interface SceneElements {
  scene: THREE.Scene;
  roadMesh: THREE.Mesh;
  safeZoneMesh: THREE.Mesh;
  crossingZ: number;
  roadWidth: number;
  roadLength: number;
  curbLeftX: number;
  curbRightX: number;
}

export class SceneBuilder {
  public static buildIndianUrbanRoad(): SceneElements {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1422); // Dusk / evening Indian sky
    scene.fog = new THREE.FogExp2(0x0e1422, 0.015);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404860, 1.2);
    scene.add(ambientLight);

    // Directional moon/dusk light
    const dirLight = new THREE.DirectionalLight(0xaaccff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);

    const roadWidth = 14;   // 4 lanes
    const roadLength = 120; // Extends along Z
    const crossingZ = 0;    // Dad crosses at Z = 0
    const curbLeftX = -roadWidth / 2;
    const curbRightX = roadWidth / 2;

    // 1. Asphalt Road
    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.85,
      metalness: 0.1
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.y = 0;
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // 2. Yellow Center Dividing Line
    const centerLineGeo = new THREE.PlaneGeometry(0.3, roadLength);
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5 });
    const centerLine = new THREE.Mesh(centerLineGeo, yellowMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.set(0, 0.01, 0);
    scene.add(centerLine);

    // 3. Dashed White Lane Markings
    const dashLength = 3;
    const dashGap = 3;
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });

    [-3.5, 3.5].forEach((laneX) => {
      for (let z = -roadLength / 2; z < roadLength / 2; z += dashLength + dashGap) {
        // Skip over pedestrian crossing
        if (Math.abs(z - crossingZ) < 4) continue;
        const dashGeo = new THREE.PlaneGeometry(0.2, dashLength);
        const dash = new THREE.Mesh(dashGeo, whiteMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(laneX, 0.01, z);
        scene.add(dash);
      }
    });

    // 4. Zebra Crossing (Pedestrian Crossing where Dad is walking)
    const zebraStripeWidth = 0.8;
    const zebraStripeLength = 10; // Covers road
    const numStripes = 6;
    for (let i = 0; i < numStripes; i++) {
      const zOffset = (i - (numStripes - 1) / 2) * 1.4;
      const stripeGeo = new THREE.PlaneGeometry(zebraStripeLength, zebraStripeWidth);
      const stripe = new THREE.Mesh(stripeGeo, whiteMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.015, crossingZ + zOffset);
      scene.add(stripe);
    }

    // 5. Left Footpath (Son starts here) & Right Footpath (Opposite side)
    const footpathWidth = 6;
    const footpathGeo = new THREE.BoxGeometry(footpathWidth, 0.4, roadLength);
    const footpathMat = new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.9 });

    // Left Footpath (X < -roadWidth/2)
    const leftFootpath = new THREE.Mesh(footpathGeo, footpathMat);
    leftFootpath.position.set(curbLeftX - footpathWidth / 2, 0.2, 0);
    leftFootpath.receiveShadow = true;
    scene.add(leftFootpath);

    // Right Footpath (X > roadWidth/2)
    const rightFootpath = new THREE.Mesh(footpathGeo, footpathMat);
    rightFootpath.position.set(curbRightX + footpathWidth / 2, 0.2, 0);
    rightFootpath.receiveShadow = true;
    scene.add(rightFootpath);

    // 6. Safe Zone Marking on Left Footpath
    const safeZoneGeo = new THREE.PlaneGeometry(4.5, 6);
    const safeZoneMat = new THREE.MeshStandardMaterial({
      color: 0x00e676,
      transparent: true,
      opacity: 0.45,
      roughness: 0.6
    });
    const safeZoneMesh = new THREE.Mesh(safeZoneGeo, safeZoneMat);
    safeZoneMesh.rotation.x = -Math.PI / 2;
    safeZoneMesh.position.set(curbLeftX - 2.5, 0.41, crossingZ);
    scene.add(safeZoneMesh);

    // Safe Zone Border Outline
    const borderGeo = new THREE.RingGeometry(2.5, 2.7, 32);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide });
    const safeRing = new THREE.Mesh(borderGeo, borderMat);
    safeRing.rotation.x = -Math.PI / 2;
    safeRing.position.set(curbLeftX - 2.5, 0.42, crossingZ);
    scene.add(safeRing);

    // 7. Indian Curbs with alternating Yellow & Black paint
    const curbSegmentLength = 2.0;
    const curbGeo = new THREE.BoxGeometry(0.3, 0.42, curbSegmentLength);
    const yellowCurbMat = new THREE.MeshStandardMaterial({ color: 0xffb703 });
    const blackCurbMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    for (let z = -roadLength / 2; z < roadLength / 2; z += curbSegmentLength) {
      const isYellow = Math.floor(z / curbSegmentLength) % 2 === 0;
      const mat = isYellow ? yellowCurbMat : blackCurbMat;

      const leftCurb = new THREE.Mesh(curbGeo, mat);
      leftCurb.position.set(curbLeftX, 0.21, z);
      scene.add(leftCurb);

      const rightCurb = new THREE.Mesh(curbGeo, mat);
      rightCurb.position.set(curbRightX, 0.21, z);
      scene.add(rightCurb);
    }

    // 8. Streetlights with Warm Halogen Light (Indian Sodium-Vapor glow)
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 8, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
    const lampHeadGeo = new THREE.BoxGeometry(0.5, 0.2, 0.8);
    const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xffeeaa, emissive: 0xffaa33, emissiveIntensity: 0.8 });

    [-30, -10, 10, 30].forEach((zPos, idx) => {
      const isLeft = idx % 2 === 0;
      const poleX = isLeft ? curbLeftX - 1.2 : curbRightX + 1.2;

      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(poleX, 4, zPos);
      pole.castShadow = true;
      scene.add(pole);

      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.rotation.z = isLeft ? -Math.PI / 3 : Math.PI / 3;
      arm.position.set(poleX + (isLeft ? 1.0 : -1.0), 7.8, zPos);
      scene.add(arm);

      const head = new THREE.Mesh(lampHeadGeo, lampHeadMat);
      head.position.set(poleX + (isLeft ? 1.8 : -1.8), 7.4, zPos);
      scene.add(head);

      // Warm Point Light
      const streetLight = new THREE.PointLight(0xffa500, 1.8, 22, 1.2);
      streetLight.position.set(poleX + (isLeft ? 1.8 : -1.8), 7.2, zPos);
      scene.add(streetLight);
    });

    // 9. Urban Buildings / Hostel & Shop Facades along the Road
    const buildingColors = [0x3a3f4d, 0x473e3b, 0x2b3846, 0x484234, 0x353a40];
    for (let z = -roadLength / 2 + 10; z < roadLength / 2 - 10; z += 18) {
      // Left buildings (behind footpath)
      const bGeoL = new THREE.BoxGeometry(8, 12 + (z % 6), 14);
      const bMatL = new THREE.MeshStandardMaterial({
        color: buildingColors[Math.abs(Math.floor(z)) % buildingColors.length],
        roughness: 0.9
      });
      const bL = new THREE.Mesh(bGeoL, bMatL);
      bL.position.set(curbLeftX - 10, 6 + (z % 3), z);
      scene.add(bL);

      // Right buildings
      const bGeoR = new THREE.BoxGeometry(8, 14 + (z % 8), 15);
      const bMatR = new THREE.MeshStandardMaterial({
        color: buildingColors[(Math.abs(Math.floor(z)) + 2) % buildingColors.length],
        roughness: 0.9
      });
      const bR = new THREE.Mesh(bGeoR, bMatR);
      bR.position.set(curbRightX + 10, 7 + (z % 4), z);
      scene.add(bR);

      // Add warm window glow points on buildings
      for (let w = 0; w < 3; w++) {
        const winGeo = new THREE.PlaneGeometry(0.8, 1.2);
        const winMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(curbLeftX - 5.95, 3 + w * 2.5, z - 2 + w * 2);
        win.rotation.y = Math.PI / 2;
        scene.add(win);
      }
    }

    return {
      scene,
      roadMesh,
      safeZoneMesh,
      crossingZ,
      roadWidth,
      roadLength,
      curbLeftX,
      curbRightX
    };
  }
}
