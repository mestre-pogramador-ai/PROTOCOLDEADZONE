import RAPIER from '@dimforge/rapier3d-compat';
import type { InputSnapshot } from '../core/input/InputManager';
import { CONTAINMENT_MODULES, DOOR } from '../world/maps/containment';
import { PLAYER, PlayerController, type PlayerPose, type PlayerMovementDiagnostics } from '../gameplay/player/PlayerController';

export interface PhysicsSnapshot { previous: PlayerPose; current: PlayerPose; doorOpen: boolean }

/** Single authoritative Rapier world, stepped only by Runtime's fixed GameClock. */
export class PhysicsWorld {
  readonly world: RAPIER.World;
  private readonly player: PlayerController;
  private readonly characterController: RAPIER.KinematicCharacterController;
  private readonly doorCollider: RAPIER.Collider;
  private doorOpen = false;
  private previous: PlayerPose;
  private disposed = false;

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: PLAYER.gravity, z: 0 });
    for (const m of CONTAINMENT_MODULES) {
      if (!m.collision) continue;
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...m.position));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(m.size[0]/2, m.size[1]/2, m.size[2]/2), body);
    }
    const doorBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...DOOR.position));
    this.doorCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(DOOR.size[0]/2, DOOR.size[1]/2, DOOR.size[2]/2), doorBody,
    );

    // Position-based kinematic bodies are moved by setNextKinematicTranslation + world.step().
    // We deliberately do not use setLinvel on a dynamic capsule (M6 rubber-banding source).
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(...PLAYER.spawn),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(PLAYER.halfHeight, PLAYER.radius).setFriction(0), body,
    );
    this.characterController = this.world.createCharacterController(0.015);
    this.characterController.setSlideEnabled(true);
    this.characterController.setMaxSlopeClimbAngle(Math.PI / 4);
    this.characterController.enableAutostep(0.26, 0.19, false);
    this.characterController.enableSnapToGround(0.28);
    this.characterController.setApplyImpulsesToDynamicBodies(false);
    this.player = new PlayerController(body, collider, this.characterController);
    this.previous = this.player.pose();
  }

  setDoorOpen(open: boolean): void {
    this.doorOpen = open;
    this.doorCollider.setEnabled(!open);
  }
  isDoorOpen(): boolean { return this.doorOpen; }

  step(dt: number, input: InputSnapshot, yaw: number): void {
    if (this.disposed) return;
    this.previous = this.player.pose();
    this.world.timestep = dt;
    this.player.tick(input, yaw, dt);
    this.world.step();
  }

  /** Prevents a stale prior pose from reappearing on resume or after a long pause. */
  syncInterpolation(): void { this.previous = this.player.pose(); }
  snapshot(): PhysicsSnapshot { return { previous: this.previous, current: this.player.pose(), doorOpen: this.doorOpen }; }
  movementDiagnostics(): PlayerMovementDiagnostics { return this.player.diagnostics(); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.world.removeCharacterController(this.characterController);
    this.world.free();
  }
}
