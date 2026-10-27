import * as THREE from 'three';

export class Character {
  public group: THREE.Group;
  public isSon: boolean;

  // Body parts for procedural animation
  private head: THREE.Mesh;
  private torso: THREE.Mesh;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;

  // Collision box
  public collider: THREE.Box3;
  private animTime: number = 0;
  private isRescuing: boolean = false;
  private rescueProgress: number = 0;

  constructor(isSon: boolean) {
    this.isSon = isSon;
    this.group = new THREE.Group();
    this.collider = new THREE.Box3();

    // Palette
    const skinMat = new THREE.MeshStandardMaterial({
      color: isSon ? 0xd49b6a : 0xba8252,
      roughness: 0.8
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: isSon ? 0x1f1917 : 0x73706e, // Son dark hair, Dad graying hair
      roughness: 0.9
    });
    const clothTopMat = new THREE.MeshStandardMaterial({
      color: isSon ? 0x2563eb : 0xf5f3ee, // Son varsity blue hoodie, Dad crisp cream kurta
      roughness: 0.7
    });
    const clothBottomMat = new THREE.MeshStandardMaterial({
      color: isSon ? 0x1e293b : 0x57534e, // Son denim, Dad dark trousers
      roughness: 0.8
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: isSon ? 0xffffff : 0x292524,
      roughness: 0.6
    });

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
    this.torso = new THREE.Mesh(torsoGeo, clothTopMat);
    this.torso.position.y = 1.25;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.42, 0.45, 0.4);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.set(0, 1.95, 0);
    this.head.castShadow = true;
    this.group.add(this.head);

    // Hair
    const hairGeo = new THREE.BoxGeometry(0.46, 0.2, 0.44);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.18, 0);
    this.head.add(hair);

    // Dad's Spectacles
    if (!isSon) {
      const glassesGeo = new THREE.BoxGeometry(0.36, 0.08, 0.05);
      const glassesMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 });
      const glasses = new THREE.Mesh(glassesGeo, glassesMat);
      glasses.position.set(0, 0, 0.21);
      this.head.add(glasses);
    }

    // 3. Left & Right Arms (Pivoted at shoulders)
    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    armGeo.translate(0, -0.35, 0); // Translate so rotation pivot is shoulder

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.48, 1.6, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, clothTopMat);
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.48, 1.6, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, clothTopMat);
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);
    this.group.add(this.rightArm);

    // 4. Left & Right Legs (Pivoted at hips)
    const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    legGeo.translate(0, -0.4, 0); // Translate so rotation pivot is hip

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, 0.8, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, clothBottomMat);
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    // Shoes
    const shoeGeo = new THREE.BoxGeometry(0.26, 0.15, 0.4);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.75, 0.06);
    this.leftLeg.add(leftShoe);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, 0.8, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, clothBottomMat);
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.75, 0.06);
    this.rightLeg.add(rightShoe);
    this.group.add(this.rightLeg);

    this.updateCollider();
  }

  public updateCollider(): void {
    const pos = this.group.position;
    // Accurate tight bounding box matching character mesh: 0.6m wide, 1.9m high, 0.6m deep
    this.collider.min.set(pos.x - 0.3, pos.y, pos.z - 0.3);
    this.collider.max.set(pos.x + 0.3, pos.y + 1.9, pos.z + 0.3);
  }

  public setRescuing(active: boolean): void {
    this.isRescuing = active;
    if (!active) {
      this.rescueProgress = 0;
    }
  }

  public update(delta: number, speed: number, isMoving: boolean): void {
    this.animTime += delta * (isMoving ? Math.max(4, speed * 1.5) : 1.5);

    if (this.isRescuing) {
      this.rescueProgress += delta * 2.5;
      // Reaching out arms animation
      const reachAngle = Math.min(Math.PI / 2.2, this.rescueProgress * Math.PI);
      this.leftArm.rotation.x = -reachAngle;
      this.rightArm.rotation.x = -reachAngle;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.torso.rotation.x = 0.2;
      this.updateCollider();
      return;
    }

    if (isMoving) {
      // Natural running limb oscillation
      const swing = Math.sin(this.animTime) * 0.75;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.8;
      this.rightArm.rotation.x = swing * 0.8;
      this.torso.position.y = 1.25 + Math.abs(Math.sin(this.animTime * 2)) * 0.08;
      this.torso.rotation.x = 0.15; // Lean forward when running
    } else {
      // Gentle breathing idle
      const breath = Math.sin(this.animTime) * 0.03;
      this.torso.position.y = 1.25 + breath;
      this.head.position.y = 1.95 + breath;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.torso.rotation.x = 0;
    }

    this.updateCollider();
  }
}

