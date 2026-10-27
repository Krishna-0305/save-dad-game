import * as THREE from 'three';

export class Motorcycle {
  public group: THREE.Group;
  public collider: THREE.Box3;
  public speed: number = 0;
  public direction: 1 | -1 = 1; // 1 = driving along +Z, -1 = driving along -Z
  public laneX: number = 0;
  public isActive: boolean = false;
  private wheels: THREE.Mesh[] = [];
  public headlightBeam: THREE.SpotLight;

  constructor() {
    this.group = new THREE.Group();
    this.collider = new THREE.Box3();

    // Motorcycle Body Materials
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0xd90429, metalness: 0.7, roughness: 0.3 }); // Indian sport red
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2421, metalness: 0.9, roughness: 0.4 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.1 });
    const riderSkinMat = new THREE.MeshStandardMaterial({ color: 0xb5835a });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.4, roughness: 0.2 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });

    // 1. Frame / Chassis
    const tankGeo = new THREE.BoxGeometry(0.5, 0.45, 1.1);
    const tank = new THREE.Mesh(tankGeo, chassisMat);
    tank.position.set(0, 1.0, 0);
    tank.castShadow = true;
    this.group.add(tank);

    const seatGeo = new THREE.BoxGeometry(0.44, 0.25, 0.9);
    const seat = new THREE.Mesh(seatGeo, frameMat);
    seat.position.set(0, 1.05, -0.7);
    this.group.add(seat);

    const engineGeo = new THREE.BoxGeometry(0.48, 0.5, 0.7);
    const engine = new THREE.Mesh(engineGeo, chromeMat);
    engine.position.set(0, 0.65, -0.1);
    this.group.add(engine);

    // 2. Wheels (Front & Rear)
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.22, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.position.set(0, 0.45, 1.1);
    frontWheel.castShadow = true;
    this.wheels.push(frontWheel);
    this.group.add(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rearWheel.position.set(0, 0.45, -1.1);
    rearWheel.castShadow = true;
    this.wheels.push(rearWheel);
    this.group.add(rearWheel);

    // 3. Handlebars & Headlamp
    const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8);
    barGeo.rotateZ(Math.PI / 2);
    const bar = new THREE.Mesh(barGeo, chromeMat);
    bar.position.set(0, 1.35, 0.8);
    this.group.add(bar);

    const lampGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.2, 12);
    lampGeo.rotateX(Math.PI / 2);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffee,
      emissiveIntensity: 1.5
    });
    const headlamp = new THREE.Mesh(lampGeo, lampMat);
    headlamp.position.set(0, 1.25, 1.25);
    this.group.add(headlamp);

    // 4. Headlight Spotlight Beam
    this.headlightBeam = new THREE.SpotLight(0xfffaed, 3.5, 30, Math.PI / 7, 0.5, 1.2);
    this.headlightBeam.position.set(0, 1.25, 1.25);
    this.headlightBeam.target.position.set(0, 0, 15);
    this.group.add(this.headlightBeam);
    this.group.add(this.headlightBeam.target);

    // 5. Rider with Helmet
    const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.35), jacketMat);
    riderTorso.position.set(0, 1.55, -0.4);
    riderTorso.rotation.x = 0.35; // Leaning into the handlebars
    riderTorso.castShadow = true;
    this.group.add(riderTorso);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), helmetMat);
    helmet.position.set(0, 2.05, -0.2);
    helmet.castShadow = true;
    this.group.add(helmet);

    // Visor
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.12, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 })
    );
    visor.position.set(0, 2.05, -0.05);
    this.group.add(visor);

    this.group.visible = false;
    this.updateCollider();
  }

  public spawn(laneX: number, startZ: number, direction: 1 | -1, speed: number): void {
    this.laneX = laneX;
    this.direction = direction;
    this.speed = speed;
    this.isActive = true;
    this.group.visible = true;

    this.group.position.set(laneX, 0, startZ);

    if (direction === 1) {
      this.group.rotation.y = 0; // facing +Z
      this.headlightBeam.target.position.set(0, 0, 20);
    } else {
      this.group.rotation.y = Math.PI; // facing -Z
      this.headlightBeam.target.position.set(0, 0, 20);
    }

    this.updateCollider();
  }

  public deactivate(): void {
    this.isActive = false;
    this.group.visible = false;
  }

  public update(delta: number): void {
    if (!this.isActive) return;

    // Move along Z
    this.group.position.z += this.direction * this.speed * delta;

    // Spin wheels
    const wheelRot = (this.speed / 0.45) * delta * this.direction;
    this.wheels.forEach((w) => {
      w.rotation.x += wheelRot;
    });

    this.updateCollider();
  }

  public updateCollider(): void {
    const pos = this.group.position;
    // Accurate tight bounding box matching visible 3D mesh: 0.6m wide, 1.8m high, 2.2m long
    this.collider.min.set(pos.x - 0.3, pos.y, pos.z - 1.1);
    this.collider.max.set(pos.x + 0.3, pos.y + 1.8, pos.z + 1.1);
  }
}

