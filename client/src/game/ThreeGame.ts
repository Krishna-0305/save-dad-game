import * as THREE from 'three';
import { SceneBuilder, SceneElements } from './SceneBuilder.js';
import { Character } from './entities/Character.js';
import { Motorcycle } from './entities/Motorcycle.js';
import { InputController } from './InputController.js';
import { DifficultyManager } from './DifficultyManager.js';
import { TrafficDifficultyManager } from './TrafficDifficultyManager.js';
import { HazardScenario, VehicleHazard } from './ScenarioGenerator.js';
import { sound } from './audio/SoundEffects.js';
import { GameState, DangerWarning, DebugMetrics, RescueEventSummary, RoundSummary, RoundCompleteData } from '../types/game.js';

export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onStatsUpdate: (stats: {
    score: number;
    saves: number;
    combo: number;
    timeLeft: number;
    roundNumber: number;
    speedName: string;
    danger: DangerWarning;
    fastestRescueMs: number | null;
    rescueSuccessFlash: boolean;
  }) => void;
  onDebugUpdate: (metrics: DebugMetrics) => void;
  onRoundComplete?: (data: RoundCompleteData) => void;
  onRoundAdvance?: (info: {
    completedRound: number;
    nextRound: number;
    score: number;
    totalSaves: number;
    fastestRescueMs: number | null;
  }) => void;
  onRoundEnd: (summary: RoundSummary) => void;
}

interface PendingDelayedSpawn {
  hazard: VehicleHazard;
  timerSec: number;
}

export class ThreeGame {
  private container: HTMLElement;
  private callbacks: GameCallbacks;

  // Three.js core
  private sceneElements!: SceneElements;
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Entities
  private son!: Character;
  private dad!: Character;
  private motorcycles: Motorcycle[] = [];
  private readonly MAX_MOTORCYCLES = 16;

  // Controllers
  public input: InputController;
  public difficulty: DifficultyManager;
  public traffic: TrafficDifficultyManager;

  // Game state
  private state: GameState = 'MENU';
  private roundTimeRemaining: number = 60.0;
  private roundElapsedSeconds: number = 0.0;
  private score: number = 0;
  private savesCount: number = 0;
  private combo: number = 1.0;
  private bestCombo: number = 1.0;
  private fastestRescueMs: number | null = null;
  private events: RescueEventSummary[] = [];
  private failureReason: string | undefined;

  // Round transition state (prevents duplicate rescues and controls the <= 0.5s visual effect)
  private isTransitioning: boolean = false;
  private rescueSuccessFlash: boolean = false;

  // Danger Event Management
  private waveIndex: number = 0;
  private currentScenario: HazardScenario | null = null;
  private pendingSpawns: PendingDelayedSpawn[] = [];
  private dangerActive: boolean = false;
  private dangerStartTime: number = 0;
  private nextEventTimer: number = 1.0; // Initial calm period
  private isDadSafe: boolean = false;
  private rescueStartTime: number = 0;

  // Debug visualizers
  private isDebug: boolean = false;
  private rescueRadiusMesh!: THREE.LineLoop;
  private sonBoxHelper?: THREE.Box3Helper;
  private dadBoxHelper?: THREE.Box3Helper;
  private bikeBoxHelpers: THREE.Box3Helper[] = [];

  constructor(container: HTMLElement, callbacks: GameCallbacks, seed?: number) {
    this.container = container;
    this.callbacks = callbacks;
    this.input = new InputController();
    this.difficulty = new DifficultyManager(seed);
    this.traffic = new TrafficDifficultyManager(seed);

    this.initScene();
    this.initEntities();
    this.initDebugHelpers();
    this.bindHandlers();
  }

  private initScene(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.sceneElements = SceneBuilder.buildIndianUrbanRoad();

    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 200);
    this.camera.position.set(-14, 9, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  private initEntities(): void {
    const { scene, curbLeftX, crossingZ } = this.sceneElements;

    // 1. Son
    this.son = new Character(true);
    this.son.group.position.set(curbLeftX - 2.5, 0.2, crossingZ + 2);
    scene.add(this.son.group);

    // 2. Dad
    this.dad = new Character(false);
    this.dad.group.position.set(0, 0, crossingZ);
    scene.add(this.dad.group);

    // 3. Motorcycle Object Pool
    for (let i = 0; i < this.MAX_MOTORCYCLES; i++) {
      const bike = new Motorcycle();
      scene.add(bike.group);
      this.motorcycles.push(bike);
    }
  }

  private initDebugHelpers(): void {
    const { scene } = this.sceneElements;

    // Rescue radius circle
    const points: THREE.Vector3[] = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * 3.2, 0.05, Math.sin(theta) * 3.2));
    }
    const rescueGeo = new THREE.BufferGeometry().setFromPoints(points);
    const rescueMat = new THREE.LineBasicMaterial({ color: 0x00ffcc });
    this.rescueRadiusMesh = new THREE.LineLoop(rescueGeo, rescueMat);
    this.rescueRadiusMesh.visible = false;
    scene.add(this.rescueRadiusMesh);

    // Development-only collision debug helpers (disabled in production)
    const isProd = Boolean((import.meta as any).env?.PROD);
    if (!isProd) {
      this.sonBoxHelper = new THREE.Box3Helper(this.son.collider, new THREE.Color(0x00ff88)); // Green
      this.sonBoxHelper.visible = false;
      scene.add(this.sonBoxHelper);

      this.dadBoxHelper = new THREE.Box3Helper(this.dad.collider, new THREE.Color(0x00d4ff)); // Cyan
      this.dadBoxHelper.visible = false;
      scene.add(this.dadBoxHelper);

      for (const bike of this.motorcycles) {
        const helper = new THREE.Box3Helper(bike.collider, new THREE.Color(0xff2244)); // Red
        helper.visible = false;
        scene.add(helper);
        this.bikeBoxHelpers.push(helper);
      }
    }
  }

  private bindHandlers(): void {
    window.addEventListener('resize', this.onResize);

    this.input.setOnPause(() => {
      if (this.state === 'PLAYING' || this.state === 'RESCUING') {
        this.pause();
      } else if (this.state === 'PAUSED') {
        this.resume();
      }
    });

    this.input.setOnRescue(() => {
      this.attemptRescue();
    });

    this.input.setOnDebugToggle(() => {
      this.toggleDebug();
    });
  }

  public toggleDebug(): void {
    // Disabled in production
    if (Boolean((import.meta as any).env?.PROD)) {
      this.isDebug = false;
      return;
    }

    this.isDebug = !this.isDebug;
    this.rescueRadiusMesh.visible = this.isDebug;
    if (this.sonBoxHelper) this.sonBoxHelper.visible = this.isDebug;
    if (this.dadBoxHelper) this.dadBoxHelper.visible = this.isDebug;
    this.bikeBoxHelpers.forEach((h, idx) => {
      h.visible = this.isDebug && this.motorcycles[idx].isActive;
    });
  }

  /**
   * Starts a round.
   * If preserveCumulative is true, score, total saves, combo, and fastest rescue
   * are preserved across the round progression.
   */
  public startRound(roundNumber?: number, preserveCumulative: boolean = false): void {
    if (typeof roundNumber === 'number') {
      this.difficulty.setRound(roundNumber);
      this.traffic.setRound(roundNumber);
    }

    this.roundTimeRemaining = 60.0;
    this.roundElapsedSeconds = 0.0;

    if (!preserveCumulative) {
      this.score = 0;
      this.savesCount = 0;
      this.combo = 1.0;
      this.bestCombo = 1.0;
      this.fastestRescueMs = null;
      this.events = [];
    }

    this.failureReason = undefined;
    this.dangerActive = false;
    this.isDadSafe = false;
    this.isTransitioning = false;
    this.rescueSuccessFlash = false;
    this.waveIndex = 0;
    this.currentScenario = null;
    this.pendingSpawns = [];
    this.nextEventTimer = 0.8; // Brief warm-up before danger wave begins

    // Position Son on safe curb
    const { curbLeftX, crossingZ } = this.sceneElements;
    this.son.group.position.set(curbLeftX - 2.5, 0.2, crossingZ + 2);
    this.son.setRescuing(false);

    // Position Dad on street
    this.dad.group.position.set(1.0, 0, crossingZ);
    this.dad.group.rotation.y = -Math.PI / 2;

    // Reset all bikes
    this.motorcycles.forEach((b) => b.deactivate());

    this.setState('PLAYING');
    sound.startHeartbeat();

    this.lastTime = performance.now();
    this.startLoop();
  }

  public pause(): void {
    if (this.state !== 'PLAYING' && this.state !== 'RESCUING') return;
    this.setState('PAUSED');
    sound.stopHeartbeat();
    sound.stopEngineSound();
  }

  public resume(): void {
    if (this.state !== 'PAUSED') return;
    this.setState('PLAYING');
    sound.startHeartbeat();
    this.lastTime = performance.now();
  }

  private setState(newState: GameState): void {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  private startLoop(): void {
    if (this.animFrameId !== null) return;
    const animate = (timestamp: number) => {
      this.animFrameId = requestAnimationFrame(animate);
      const delta = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      if (this.state === 'PLAYING' || this.state === 'RESCUING') {
        this.updateGame(delta);
      }

      this.updateCamera();
      this.renderer.render(this.sceneElements.scene, this.camera);
    };
    this.animFrameId = requestAnimationFrame(animate);
  }

  public stopLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    sound.stopHeartbeat();
    sound.stopEngineSound();
  }

  private updateGame(delta: number): void {
    // 1. Advance Timers
    this.roundTimeRemaining = Math.max(0, this.roundTimeRemaining - delta);
    this.roundElapsedSeconds += delta;

    // If 60-second timer expires before rescue, round fails
    if (this.roundTimeRemaining <= 0) {
      this.failureReason = 'Time expired (60s) before you could reach Dad!';
      this.endRound('GAME_OVER');
      return;
    }

    // 2. Player Input & Movement
    const inputState = this.input.getInput();
    const moveSpeed = inputState.sprint ? 10.5 : 6.0;

    const isMoving = inputState.moveX !== 0 || inputState.moveZ !== 0;

    if (isMoving && this.state !== 'RESCUING' && !this.isTransitioning) {
      const moveX = inputState.moveX * moveSpeed * delta;
      const moveZ = inputState.moveZ * moveSpeed * delta;

      this.son.group.position.x += moveX;
      this.son.group.position.z += moveZ;

      // Constrain within road boundaries
      this.son.group.position.x = Math.max(-11.5, Math.min(11.5, this.son.group.position.x));
      this.son.group.position.z = Math.max(-25, Math.min(25, this.son.group.position.z));

      // Rotate Son towards movement direction
      const angle = Math.atan2(inputState.moveX, inputState.moveZ);
      this.son.group.rotation.y = angle;
    }

    this.son.update(delta, moveSpeed, isMoving);

    // 3. Danger Events & Wave Generation
    this.updateDangerCycle(delta);

    // 4. Motorcycle Physics & Collision
    this.updateMotorcycles(delta);

    // 5. Rescue Mechanics
    if (this.state === 'RESCUING') {
      this.processRescuePull(delta);
    } else {
      // Gentle Dad idle crossing
      this.dad.update(delta, 1.0, !this.isDadSafe);
    }

    // 6. Update HUD Stats & Danger Warnings
    this.emitStats();
  }

  private updateDangerCycle(delta: number): void {
    if (this.isTransitioning) return;

    // Process pending delayed spawns within the active wave
    for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
      const p = this.pendingSpawns[i];
      p.timerSec -= delta;
      if (p.timerSec <= 0) {
        this.spawnMotorcycle(p.hazard);
        this.pendingSpawns.splice(i, 1);
      }
    }

    const currentRound = this.difficulty.getRound();
    const activeCount = this.motorcycles.filter((b) => b.isActive).length;

    this.nextEventTimer -= delta;
    if (this.nextEventTimer <= 0) {
      if (this.traffic.canSpawnVehicle(activeCount, currentRound)) {
        // Collect lanes that currently have an active motorcycle near the crossing
        const activeCrossingLanes = this.motorcycles
          .filter((b) => b.isActive && Math.abs(b.group.position.z) < 26)
          .map((b) => b.laneX);

        const spawn = this.traffic.generateNextSpawn(
          currentRound,
          this.dad.group.position.x,
          activeCrossingLanes
        );

        this.spawnMotorcycle({
          laneX: spawn.laneX,
          startZ: spawn.startZ,
          direction: spawn.direction,
          speed: spawn.speed,
          delaySec: 0
        });

        this.dangerActive = true;
        this.dangerStartTime = performance.now();

        // Audio cues
        sound.playHornHonk();
        sound.playWarningFlash();

        // Next spawn interval determined by TrafficDifficultyManager
        this.nextEventTimer = this.traffic.getNextSpawnInterval(currentRound);
      } else {
        // Reached active target or cap, poll shortly for opening
        this.nextEventTimer = 0.35;
      }
    }
  }

  private spawnNextWaveScenario(): void {
    if (this.isTransitioning) return;
    this.waveIndex++;
    const sonX = this.son.group.position.x;
    const scenario = this.difficulty.generateWaveScenario(this.waveIndex, sonX);
    this.currentScenario = scenario;

    // Reposition Dad at target position if previously saved
    if (this.isDadSafe) {
      this.dad.group.position.set(scenario.dadTargetX, 0, this.sceneElements.crossingZ);
      this.isDadSafe = false;
    }

    // Spawn first vehicle immediately, queue delayed ones
    for (const v of scenario.vehicles) {
      if (v.delaySec <= 0) {
        this.spawnMotorcycle(v);
      } else {
        this.pendingSpawns.push({ hazard: v, timerSec: v.delaySec });
      }
    }

    this.dangerActive = true;
    this.dangerStartTime = performance.now();

    // Trigger warning audio cues
    sound.playHornHonk();
    sound.playWarningFlash();
  }

  private spawnMotorcycle(hazard: VehicleHazard): void {
    const bike = this.motorcycles.find((b) => !b.isActive);
    if (bike) {
      bike.spawn(hazard.laneX, hazard.startZ, hazard.direction, hazard.speed);
    }
  }

  private updateMotorcycles(delta: number): void {
    // If transitioning, in rescue-success flash, or ended, disarm all collision checks
    if (this.isTransitioning || this.rescueSuccessFlash || this.state === 'GAME_OVER' || this.state === 'ROUND_COMPLETE' || this.state === 'PAUSED') {
      for (const bike of this.motorcycles) {
        if (!bike.isActive) continue;
        bike.update(delta);
        if (Math.abs(bike.group.position.z) > 58) {
          bike.deactivate();
        }
      }
      return;
    }

    let closestBikeDistance = 999;
    let anyBikeActive = false;
    let activeCount = 0;

    for (const bike of this.motorcycles) {
      if (!bike.isActive) continue;
      anyBikeActive = true;
      activeCount++;
      bike.update(delta);

      const bikeZ = bike.group.position.z;
      const distToDad = Math.abs(bikeZ - this.dad.group.position.z);
      if (distToDad < closestBikeDistance) closestBikeDistance = distToDad;

      // Safe sidewalk threshold (curbLeftX - 1.0)
      const curbSafeX = this.sceneElements.curbLeftX - 1.0;

      // 1. Dad collision check:
      // Dad is vulnerable ONLY if not yet marked safe, not already pulled onto the safe curb,
      // Dad is within the bike's lane corridor in X, and their colliders genuinely intersect.
      const isDadOnStreet = this.dad.group.position.x > curbSafeX;
      const isDadInLaneCorridor = Math.abs(this.dad.group.position.x - bike.laneX) < 0.8;

      if (!this.isDadSafe && isDadOnStreet && isDadInLaneCorridor && bike.collider.intersectsBox(this.dad.collider)) {
        sound.playCrashBoom();
        const dirText = bike.direction === 1 ? 'North' : 'South';
        this.failureReason = `A high-speed motorcycle coming from ${dirText} struck Dad before you could reach him.`;
        this.endRound('GAME_OVER');
        return;
      }

      // 2. Son collision check:
      // Son is vulnerable ONLY if on the road, within the vehicle's lane corridor in X,
      // and their colliders genuinely intersect.
      const isSonOnStreet = this.son.group.position.x > curbSafeX;
      const isSonInLaneCorridor = Math.abs(this.son.group.position.x - bike.laneX) < 0.8;

      if (isSonOnStreet && isSonInLaneCorridor && bike.collider.intersectsBox(this.son.collider)) {
        sound.playCrashBoom();
        this.failureReason = 'You were struck by oncoming traffic while running across the road.';
        this.endRound('GAME_OVER');
        return;
      }

      // Despawn once well past crossing
      if (Math.abs(bikeZ) > 58) {
        bike.deactivate();
      }
    }

    // Wave is clear when no bikes are active and no pending delayed spawns remain
    if (activeCount === 0 && this.pendingSpawns.length === 0 && this.dangerActive) {
      this.dangerActive = false;
      const config = this.difficulty.getConfig();
      this.nextEventTimer = config.spawnIntervalSec;
    }

    sound.updateEngineSound(anyBikeActive, Math.max(0, 1 - closestBikeDistance / 40));
  }

  private attemptRescue(): void {
    if (this.state !== 'PLAYING' || this.isDadSafe || this.isTransitioning) return;

    const dist = this.son.group.position.distanceTo(this.dad.group.position);
    if (dist <= 3.2) {
      this.setState('RESCUING');
      this.rescueStartTime = performance.now();
      this.son.setRescuing(true);
      this.dad.setRescuing(true);
    }
  }

  private processRescuePull(delta: number): void {
    if (this.isTransitioning) return;

    // Son pulls Dad towards safe zone on the left sidewalk (X = -9.5)
    const safeTarget = new THREE.Vector3(this.sceneElements.curbLeftX - 2.5, 0.2, this.sceneElements.crossingZ);

    const pullSpeed = 9.0;
    const dirToSafe = safeTarget.clone().sub(this.son.group.position).normalize();

    this.son.group.position.addScaledVector(dirToSafe, pullSpeed * delta);
    this.son.group.lookAt(safeTarget);

    // Dad moves alongside Son
    this.dad.group.position.copy(this.son.group.position);
    this.dad.group.position.x += 0.8; // Hand in hand

    // Continuous physics update: update colliders every single frame to prevent stale positions
    this.son.updateCollider();
    this.dad.updateCollider();

    // Check if reached safe footpath
    if (this.son.group.position.x <= this.sceneElements.curbLeftX - 1.5) {
      this.completeSuccessfulRescue();
    }
  }

  /**
   * One successful rescue immediately completes the current round,
   * registers the score and saves, shows a brief success effect (<= 0.5s),
   * and dispatches onRoundComplete to advance the round.
   */
  private completeSuccessfulRescue(): void {
    // 1. Prevent duplicate rescue events or multiple increments
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.rescueSuccessFlash = true;

    // Disarm collisions immediately and clear active traffic so no old vehicles persist into next round
    this.isDadSafe = true;
    this.son.setRescuing(false);
    this.dad.setRescuing(false);
    this.motorcycles.forEach((b) => b.deactivate());
    this.pendingSpawns = [];

    // 2. Register successful rescue and calculate score immediately
    const roundElapsed = this.roundElapsedSeconds;
    const reactionTimeMs = Math.max(120, Math.round(performance.now() - this.dangerStartTime));
    const reactionBonus = Math.max(0, Math.min(50, Math.round((2000 - reactionTimeMs) / 30)));
    const roundPoints = Math.round((100 + reactionBonus) * this.combo);

    this.score += roundPoints;
    this.savesCount += 1;

    // Track fastest rescue
    if (this.fastestRescueMs === null || reactionTimeMs < this.fastestRescueMs) {
      this.fastestRescueMs = reactionTimeMs;
    }

    // Combo multiplier
    this.combo = Math.min(2.0, +(this.combo + 0.2).toFixed(1));
    if (this.combo > this.bestCombo) {
      this.bestCombo = this.combo;
    }

    const roundEvent: RescueEventSummary = {
      eventIndex: 0,
      reactionTimeMs,
      pointsAwarded: roundPoints,
      comboAtRescue: this.combo,
      timestampOffsetMs: Math.round(roundElapsed * 1000)
    };
    this.events.push(roundEvent);

    // Sound
    sound.playRescueSuccess(this.combo);
    this.emitStats();

    const completedRound = this.difficulty.getRound();
    const roundData: RoundCompleteData = {
      roundNumber: completedRound,
      score: this.score,
      roundScore: roundPoints,
      successfulSaves: 1,
      totalCumulativeSaves: this.savesCount,
      fastestRescueMs: this.fastestRescueMs,
      survivalTimeSeconds: Math.max(1, Math.round(roundElapsed)),
      bestCombo: this.bestCombo,
      events: [roundEvent],
      outcome: 'ROUND_COMPLETE'
    };

    // If an external round-complete handler is provided (e.g., App for ranked server verification),
    // delegate round advance to it
    if (this.callbacks.onRoundComplete) {
      this.callbacks.onRoundComplete(roundData);
    } else {
      // Default / unranked automatic transition after brief 400ms effect (<= 0.5s)
      setTimeout(() => {
        if (this.state === 'PAUSED' || this.state === 'GAME_OVER') return;
        const nextRound = this.difficulty.nextRound();
        if (this.callbacks.onRoundAdvance) {
          this.callbacks.onRoundAdvance({
            completedRound,
            nextRound,
            score: this.score,
            totalSaves: this.savesCount,
            fastestRescueMs: this.fastestRescueMs
          });
        }
        this.startRound(nextRound, true);
      }, 400);
    }
  }

  public handleRoundVerificationFailure(reason: string): void {
    this.failureReason = reason || 'Server rejected round verification.';
    this.endRound('GAME_OVER');
  }

  private endRound(outcome: 'GAME_OVER' | 'ROUND_COMPLETE'): void {
    this.setState(outcome);
    this.stopLoop();

    this.callbacks.onRoundEnd({
      roundNumber: this.difficulty.getRound(),
      score: this.score,
      successfulSaves: this.savesCount,
      fastestRescueMs: this.fastestRescueMs,
      survivalTimeSeconds: Math.round(this.roundElapsedSeconds),
      bestCombo: this.bestCombo,
      events: this.events,
      outcome,
      failureReason: this.failureReason
    });
  }

  private emitStats(): void {
    let bikeDist = 999;
    let bikeDir: 'left' | 'right' = 'left';

    for (const b of this.motorcycles) {
      if (b.isActive) {
        const d = Math.abs(b.group.position.z - this.dad.group.position.z);
        if (d < bikeDist) {
          bikeDist = d;
          bikeDir = b.direction === 1 ? 'left' : 'right';
        }
      }
    }

    const dangerIntensity = this.dangerActive && !this.isDadSafe
      ? Math.max(0, Math.min(1, 1 - bikeDist / 40))
      : 0;

    const config = this.traffic.getConfig(this.difficulty.getRound());

    this.callbacks.onStatsUpdate({
      score: this.score,
      saves: this.savesCount,
      combo: this.combo,
      timeLeft: Math.ceil(this.roundTimeRemaining),
      roundNumber: this.difficulty.getRound(),
      speedName: config.speedName,
      danger: {
        active: this.dangerActive && !this.isDadSafe,
        intensity: dangerIntensity,
        motorcycleDirection: bikeDir,
        distanceToDad: bikeDist
      },
      fastestRescueMs: this.fastestRescueMs,
      rescueSuccessFlash: this.rescueSuccessFlash
    });

    if (this.isDebug) {
      this.rescueRadiusMesh.position.copy(this.dad.group.position);
      if (this.sonBoxHelper) (this.sonBoxHelper as any).updateMatrixWorld(true);
      if (this.dadBoxHelper) (this.dadBoxHelper as any).updateMatrixWorld(true);
      this.bikeBoxHelpers.forEach((h, idx) => {
        h.visible = this.isDebug && Boolean(this.motorcycles[idx]?.isActive);
      });
      this.callbacks.onDebugUpdate({
        fps: 60,
        activeMotorcycles: this.motorcycles.filter((b) => b.isActive).length,
        distanceSonDad: +this.son.group.position.distanceTo(this.dad.group.position).toFixed(1),
        distanceBikeDad: +bikeDist.toFixed(1),
        rescueRadius: 3.2,
        difficultyLevel: this.difficulty.getRound(),
        bikeSpeed: config.baseSpeed,
        roundNumber: this.difficulty.getRound(),
        patternName: config.pattern
      });
    }
  }

  private updateCamera(): void {
    const targetPos = this.son.group.position.clone();
    const camOffset = new THREE.Vector3(-6, 7, 7);
    const desiredPos = targetPos.clone().add(camOffset);

    this.camera.position.lerp(desiredPos, 0.08);
    this.camera.lookAt(targetPos.clone().add(new THREE.Vector3(2, 1, 0)));
  }

  private onResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy(): void {
    this.stopLoop();
    window.removeEventListener('resize', this.onResize);
    this.input.destroy();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
