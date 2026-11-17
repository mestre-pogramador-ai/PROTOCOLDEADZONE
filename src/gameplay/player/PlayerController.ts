import type RAPIER from '@dimforge/rapier3d-compat';
import { M9 } from '../weapons/M9';
import type { InputSnapshot } from '../../core/input/InputManager';
import { advanceVerticalVelocity, horizontalDisplacement } from './MovementMath';

export const PLAYER = {
  spawn: [-1, 1.05, 0] as const,
  radius: 0.38,
  halfHeight: 0.48,
  eyeOffset: 0.65,
  crouchEyeOffset: 0.38,
  walkSpeed: 4.6,
  sprintSpeed: 7,
  crouchSpeed: 2.5,
  jumpSpeed: 5.3,
  gravity: -9.81,
  terminalFallSpeed: 32,
  groundStickSpeed: 0.6,
} as const;

export type PlayerPose = { position: [number, number, number]; eyeHeight: number; grounded: boolean; crouching: boolean };
export interface PlayerMovementDiagnostics {
  grounded: boolean;
  verticalVelocity: number;
  requestedHorizontalMeters: number;
  resolvedHorizontalMeters: number;
  collisions: number;
  reversePrevented: boolean;
}

/**
 * M6.1: collision-aware kinematic controller. Rapier projects requested motion along
 * obstacles BEFORE moving the player; there is no dynamic-body depenetration fighting
 * an imposed horizontal velocity on the next frame.
 *
 * PhysicsWorld owns both the KCC and its collider. The clock owns the one fixed-step.
 */
export class PlayerController {
  private grounded = false;
  private crouching = false;
  private verticalVelocity = 0;
  private diagnostic: PlayerMovementDiagnostics = {
    grounded: false, verticalVelocity: 0, requestedHorizontalMeters: 0, resolvedHorizontalMeters: 0, collisions: 0, reversePrevented: false,
  };

  constructor(
    private readonly body: RAPIER.RigidBody,
    private readonly collider: RAPIER.Collider,
    private readonly controller: RAPIER.KinematicCharacterController,
  ) {}

  tick(input: InputSnapshot, yaw: number, dt: number, speedMultiplier=1): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.crouching = input.held.has('crouch');
    const speed = this.crouching
      ? PLAYER.crouchSpeed
      : input.held.has('ads') ? M9.adsMoveSpeed
      : input.held.has('sprint') ? PLAYER.sprintSpeed
      : PLAYER.walkSpeed;

    const horizontal = horizontalDisplacement(input.moveX, input.moveY, yaw, speed*(Number.isFinite(speedMultiplier)&&speedMultiplier>0?speedMultiplier:1), dt);
    const vertical = advanceVerticalVelocity(
      this.verticalVelocity, this.grounded, input.pressed.has('jump'), this.crouching, dt,
      { gravity: PLAYER.gravity, jumpSpeed: PLAYER.jumpSpeed,
        terminalFallSpeed: PLAYER.terminalFallSpeed, groundStickSpeed: PLAYER.groundStickSpeed },
    );
    this.verticalVelocity = vertical.velocity;
    const desired = { x: horizontal.x, y: this.verticalVelocity * dt, z: horizontal.z };

    // Rapier shape-casts the capsule against the level and returns a safe sliding displacement.
    this.controller.computeColliderMovement(this.collider, desired);
    let allowed = this.controller.computedMovement();
    // At multi-plane corners Rapier may return horizontal travel opposite to intent.
    // Re-query a stationary horizontal step instead of applying or clamping that result.
    const horizontalLength = Math.hypot(desired.x, desired.z);
    const reversePrevented = this.grounded && horizontalLength > 1e-7 &&
      (allowed.x * desired.x + allowed.z * desired.z) / horizontalLength < -.001;
    if (reversePrevented) {
      this.controller.computeColliderMovement(this.collider, { x: 0, y: desired.y, z: 0 });
      allowed = this.controller.computedMovement();
    }
    // A ceiling contact must stop upward velocity, rather than pinning the capsule
    // against the ceiling until gravity eventually reverses the jump.
    if (desired.y > 0 && allowed.y < desired.y - .001) this.verticalVelocity = 0;
    const current = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: current.x + allowed.x,
      y: current.y + allowed.y,
      z: current.z + allowed.z,
    });

    this.grounded = this.controller.computedGrounded() && !vertical.jumped;
    if (this.grounded && this.verticalVelocity < 0) this.verticalVelocity = 0;
    this.diagnostic = {
      grounded: this.grounded,
      verticalVelocity: this.verticalVelocity,
      requestedHorizontalMeters: Math.hypot(desired.x, desired.z),
      resolvedHorizontalMeters: Math.hypot(allowed.x, allowed.z),
      collisions: this.controller.numComputedCollisions(),
      reversePrevented,
    };
  }

  pose(): PlayerPose {
    const p = this.body.translation();
    return {
      position: [p.x, p.y, p.z],
      eyeHeight: this.crouching ? PLAYER.crouchEyeOffset : PLAYER.eyeOffset,
      grounded: this.grounded,
      crouching: this.crouching,
    };
  }

  diagnostics(): PlayerMovementDiagnostics { return { ...this.diagnostic }; }
}
