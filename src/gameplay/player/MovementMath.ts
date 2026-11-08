/** M6.1: pure deterministic movement helpers, independent of the renderer and Rapier WASM. */
export interface Vec3Like { x: number; y: number; z: number }
export interface VerticalStep { velocity: number; jumped: boolean }

/** MoveX: A=-1/D=+1; MoveY: W=-1/S=+1 (from InputManager). */
export function horizontalDisplacement(moveX: number, moveY: number, yaw: number, speed: number, dt: number): { x: number; z: number } {
  if (![moveX, moveY, yaw, speed, dt].every(Number.isFinite) || dt <= 0 || speed < 0) return { x: 0, z: 0 };
  // Normalize here too; direct callers must never gain speed by moving diagonally.
  const length = Math.hypot(moveX, moveY);
  if (length < 1e-7) return { x: 0, z: 0 };
  const normalizedX = moveX / Math.max(1, length);
  const normalizedY = moveY / Math.max(1, length);
  return {
    x: (normalizedX * Math.cos(yaw) + normalizedY * Math.sin(yaw)) * speed * dt,
    z: (-normalizedX * Math.sin(yaw) + normalizedY * Math.cos(yaw)) * speed * dt,
  };
}

export interface VerticalMotionConfig { gravity: number; jumpSpeed: number; terminalFallSpeed: number; groundStickSpeed: number }
/** Gravity is controlled here because a kinematic rigid body does not react to world gravity. */
export function advanceVerticalVelocity(
  previous: number,
  grounded: boolean,
  jumpPressed: boolean,
  crouching: boolean,
  dt: number,
  config: VerticalMotionConfig,
): VerticalStep {
  if (!Number.isFinite(dt) || dt <= 0) return { velocity: previous, jumped: false };
  if (grounded && jumpPressed && !crouching) return { velocity: config.jumpSpeed, jumped: true };
  // Tiny downward intent maintains contact and enables Rapier's snap-to-ground on edges.
  if (grounded) return { velocity: -config.groundStickSpeed, jumped: false };
  return { velocity: Math.max(-config.terminalFallSpeed, previous + config.gravity * dt), jumped: false };
}

export function interpolatePosition(previous: Vec3Like, current: Vec3Like, alpha: number): Vec3Like {
  const t = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
  return {
    x: previous.x + (current.x - previous.x) * t,
    y: previous.y + (current.y - previous.y) * t,
    z: previous.z + (current.z - previous.z) * t,
  };
}
