import { PhysicsWorld } from './PhysicsWorldCore';

export type SimState = 'idle' | 'running' | 'paused' | 'stopped';

export class SimulationController {
  private world: PhysicsWorld;
  private state: SimState = 'idle';
  private timeScale = 1;
  private accumulator = 0;
  private lastTime = 0;
  private rafId: number | null = null;
  private onTick: ((dt: number) => void) | null = null;
  private onComplete: (() => void) | null = null;

  constructor(world: PhysicsWorld) { this.world = world; }

  getState(): SimState { return this.state; }
  getTimeScale(): number { return this.timeScale; }
  setTimeScale(ts: number): void { this.timeScale = Math.max(0, Math.min(10, ts)); }
  getTime(): number { return this.world.getTime(); }

  onTickCallback(fn: (dt: number) => void): void { this.onTick = fn; }
  onCompleteCallback(fn: () => void): void { this.onComplete = fn; }

  play(): void {
    if (this.state === 'running') return;
    this.state = 'running';
    this.world.start();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  pause(): void {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.world.pause();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  stop(): void {
    this.state = 'stopped';
    this.world.stop();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.accumulator = 0;
    this.onComplete?.();
  }

  reset(): void {
    this.state = 'idle';
    this.world.reset();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.accumulator = 0;
  }

  stepOnce(dt?: number): void {
    const stepDt = dt ?? this.world.getSettings().fixedTimestep;
    this.world.step(stepDt);
    this.onTick?.(stepDt);
  }

  private loop = (now: number): void => {
    if (this.state !== 'running') return;
    const frameDt = Math.min((now - this.lastTime) / 1000, 0.1) * this.timeScale;
    this.lastTime = now;
    this.accumulator += frameDt;
    const fixedDt = this.world.getSettings().fixedTimestep;
    while (this.accumulator >= fixedDt) {
      this.world.step(fixedDt);
      this.onTick?.(fixedDt);
      this.accumulator -= fixedDt;
    }
    this.rafId = requestAnimationFrame(this.loop);
  };
}
