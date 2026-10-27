export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  rescue: boolean;
  pause: boolean;
  // Normalized analog vector for joystick: [-1, 1]
  moveX: number;
  moveZ: number;
}

export class InputController {
  private keys: Record<string, boolean> = {};
  private joystickVector: { x: number; y: number } = { x: 0, y: 0 };
  private mobileSprint: boolean = false;
  private mobileRescue: boolean = false;
  private onPauseCallback: (() => void) | null = null;
  private onRescueCallback: (() => void) | null = null;
  private onDebugToggleCallback: (() => void) | null = null;

  constructor() {
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;

    if (e.code === 'KeyE' || e.code === 'Space') {
      if (this.onRescueCallback) this.onRescueCallback();
    }

    if (e.code === 'Escape') {
      if (this.onPauseCallback) this.onPauseCallback();
    }

    if (e.code === 'F3') {
      e.preventDefault();
      if (this.onDebugToggleCallback) this.onDebugToggleCallback();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  public setOnPause(cb: () => void): void {
    this.onPauseCallback = cb;
  }

  public setOnRescue(cb: () => void): void {
    this.onRescueCallback = cb;
  }

  public setOnDebugToggle(cb: () => void): void {
    this.onDebugToggleCallback = cb;
  }

  public setJoystickVector(x: number, y: number): void {
    this.joystickVector.x = Math.max(-1, Math.min(1, x));
    this.joystickVector.y = Math.max(-1, Math.min(1, y));
  }

  public setMobileSprint(active: boolean): void {
    this.mobileSprint = active;
  }

  public triggerMobileRescue(): void {
    if (this.onRescueCallback) this.onRescueCallback();
  }

  public getInput(): InputState {
    const k = this.keys;
    const forward = !!(k['KeyW'] || k['ArrowUp']);
    const backward = !!(k['KeyS'] || k['ArrowDown']);
    const left = !!(k['KeyA'] || k['ArrowLeft']);
    const right = !!(k['KeyD'] || k['ArrowRight']);
    const sprint = !!(k['ShiftLeft'] || k['ShiftRight'] || this.mobileSprint);
    const rescue = !!(k['KeyE'] || k['Space'] || this.mobileRescue);
    const pause = !!k['Escape'];

    // Combine keyboard and joystick into normalized move vector
    let moveX = this.joystickVector.x;
    let moveZ = this.joystickVector.y;

    if (left) moveX -= 1;
    if (right) moveX += 1;
    if (forward) moveZ -= 1;
    if (backward) moveZ += 1;

    const len = Math.hypot(moveX, moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }

    return {
      forward,
      backward,
      left,
      right,
      sprint,
      rescue,
      pause,
      moveX,
      moveZ
    };
  }
}

