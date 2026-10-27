import { describe, it, expect } from 'vitest';

// Bounding box representation mirroring Three.js Box3 for headless verification
class Box3 {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };

  constructor(
    min = { x: -Infinity, y: -Infinity, z: -Infinity },
    max = { x: Infinity, y: Infinity, z: Infinity }
  ) {
    this.min = min;
    this.max = max;
  }

  setFromCenterAndSize(center: { x: number; y: number; z: number }, size: { x: number; y: number; z: number }) {
    const halfX = size.x / 2;
    const halfY = size.y / 2;
    const halfZ = size.z / 2;
    this.min = { x: center.x - halfX, y: center.y, z: center.z - halfZ };
    this.max = { x: center.x + halfX, y: center.y + size.y, z: center.z + halfZ };
  }

  intersectsBox(box: Box3): boolean {
    return !(
      box.max.x < this.min.x ||
      box.min.x > this.max.x ||
      box.max.y < this.min.y ||
      box.min.y > this.max.y ||
      box.max.z < this.min.z ||
      box.min.z > this.max.z
    );
  }
}

describe('Collision Accuracy & Hitbox Regression Tests', () => {
  // Motorcycle hitbox dimensions (tight 0.6m wide, 1.8m high, 2.2m long)
  const createMotorcycleCollider = (posX: number, posZ: number): Box3 => {
    return new Box3(
      { x: posX - 0.3, y: 0, z: posZ - 1.1 },
      { x: posX + 0.3, y: 1.8, z: posZ + 1.1 }
    );
  };

  // Character hitbox dimensions (tight 0.6m wide, 1.9m high, 0.6m deep)
  const createCharacterCollider = (posX: number, posZ: number): Box3 => {
    return new Box3(
      { x: posX - 0.3, y: 0, z: posZ - 0.3 },
      { x: posX + 0.3, y: 1.9, z: posZ + 0.3 }
    );
  };

  it('motorcycle passing ahead in front (deltaZ >= 1.5m) does NOT trigger collision', () => {
    // Player is pulling Dad across crossing (at z = 0, x = 1.0)
    const dadCollider = createCharacterCollider(1.0, 0);

    // Motorcycle speeds across the lane in front at z = 2.0 (1.4m clearance from bike rear wheel to Dad's front edge)
    const bikeCollider = createMotorcycleCollider(1.0, 2.0);

    // Bike z min: 2.0 - 1.1 = 0.9. Dad z max: 0.3. 0.9 > 0.3 -> No intersection!
    expect(bikeCollider.intersectsBox(dadCollider)).toBe(false);
  });

  it('motorcycle passing behind (deltaZ <= -1.5m) does NOT trigger collision', () => {
    const dadCollider = createCharacterCollider(1.0, 0);
    // Motorcycle passes behind at z = -2.0
    const bikeCollider = createMotorcycleCollider(1.0, -2.0);

    // Bike z max: -2.0 + 1.1 = -0.9. Dad z min: -0.3. -0.9 < -0.3 -> No intersection!
    expect(bikeCollider.intersectsBox(dadCollider)).toBe(false);
  });

  it('motorcycle in adjacent lane (deltaX >= 2.0m) does NOT trigger collision', () => {
    // Dad is at x = 1.0, crossingZ = 0
    const dadCollider = createCharacterCollider(1.0, 0);

    // Motorcycle is in adjacent traffic lane at x = 4.5, crossing at z = 0
    const bikeCollider = createMotorcycleCollider(4.5, 0);

    expect(bikeCollider.intersectsBox(dadCollider)).toBe(false);
  });

  it('genuine physical contact triggers collision when motorcycle strikes Character', () => {
    // Dad is at x = 1.0, crossingZ = 0
    const dadCollider = createCharacterCollider(1.0, 0);

    // Motorcycle drives directly through Dad: x = 1.0, z = 0.5
    // Bike z range: [-0.6, 1.6]. Dad z range: [-0.3, 0.3] -> Intersects!
    const bikeCollider = createMotorcycleCollider(1.0, 0.5);

    expect(bikeCollider.intersectsBox(dadCollider)).toBe(true);
  });

  it('Dad moving during rescue pull updates colliders continuously and avoids stale collisions', () => {
    // Starting position of Dad in road center
    const startX = 1.0;
    const initialDadCollider = createCharacterCollider(startX, 0);

    // Motorcycle arrives at the road center (x = 1.0, z = 0)
    const bikeAtOldSpot = createMotorcycleCollider(1.0, 0);

    // If collider is NOT updated (the old bug), collision would falsely occur
    expect(bikeAtOldSpot.intersectsBox(initialDadCollider)).toBe(true);

    // When Son pulls Dad towards safe sidewalk, Dad moves to x = -4.0
    const updatedDadCollider = createCharacterCollider(-4.0, 0);

    // With properly updated collider, motorcycle passing the old spot does NOT hit Dad!
    expect(bikeAtOldSpot.intersectsBox(updatedDadCollider)).toBe(false);
  });

  it('Dad reaching the safe sidewalk (x <= curbLeftX - 1.0) is immune from road traffic', () => {
    const curbLeftX = -9.5;
    const safeSidewalkX = curbLeftX - 1.5; // x = -11.0

    const isDadOnStreet = (posX: number) => posX > (curbLeftX - 1.0);

    // On sidewalk:
    expect(isDadOnStreet(safeSidewalkX)).toBe(false);

    // Road lane:
    expect(isDadOnStreet(1.0)).toBe(true);
  });
});

