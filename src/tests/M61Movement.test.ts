import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import type { InputSnapshot, Action } from '../core/input/InputManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { PLAYER } from '../gameplay/player/PlayerController';
import { advanceVerticalVelocity, horizontalDisplacement, interpolatePosition } from '../gameplay/player/MovementMath';

const dt = 1 / 60;
function input(held: Action[] = [], pressed: Action[] = [], x = 0, y = 0): InputSnapshot {
  return { held: new Set(held), pressed: new Set(pressed), moveX: x, moveY: y };
}
function advance(world: PhysicsWorld, ticks: number, data: InputSnapshot = input()): void {
  for (let i = 0; i < ticks; i++) world.step(dt, data, 0);
}

describe('M6.1 — matemática e estabilidade do movimento', () => {
  it('diagonal W+D nunca corre mais que andar reto', () => {
    const straight = horizontalDisplacement(0, -1, 0, PLAYER.walkSpeed, dt);
    const diagonal = horizontalDisplacement(1, -1, 0, PLAYER.walkSpeed, dt);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(Math.hypot(straight.x, straight.z), 8);
  });
  it('giro da câmera afeta apenas direção horizontal', () => {
    const v = horizontalDisplacement(0, -1, Math.PI / 2, 4, 1);
    expect(v.x).toBeCloseTo(-4);expect(v.z).toBeCloseTo(0);
  });
  it('pulo só inicia estando no chão e sem agachar', () => {
    const c = { gravity: -9.81, jumpSpeed: 5.3, terminalFallSpeed: 32, groundStickSpeed: .6 };
    expect(advanceVerticalVelocity(0, true, true, false, dt, c).jumped).toBe(true);
    expect(advanceVerticalVelocity(0, false, true, false, dt, c).jumped).toBe(false);
    expect(advanceVerticalVelocity(0, true, true, true, dt, c).jumped).toBe(false);
  });
  it('interpolação nunca extrapola ao reiniciar e pausar', () => {
    const a = { x: 1, y: 2, z: 3 }, b = { x: 3, y: 6, z: 9 };
    expect(interpolatePosition(a, b, .5)).toEqual({ x: 2, y: 4, z: 6 });
    expect(interpolatePosition(a, b, 2)).toEqual(b);
  });
});

describe('M6.1 — integração real com Rapier (requer npm install)', () => {
  beforeAll(async () => { await RAPIER.init(); });

  it('assenta no piso e não oscila parado', () => {
    const world = new PhysicsWorld();
    try {
      advance(world, 100);
      const y = world.snapshot().current.position[1];
      expect(world.snapshot().current.grounded).toBe(true);
      expect(y).toBeGreaterThan(.83);
      expect(y).toBeLessThan(1);
      advance(world, 100);
      expect(Math.abs(world.snapshot().current.position[1] - y)).toBeLessThan(.03);
    } finally { world.dispose(); }
  });

  it('não atravessa a parede norte, mesmo mantendo W pressionado', () => {
    const world = new PhysicsWorld();
    try {
      advance(world, 100);
      advance(world, 220, input(['forward'], [], 0, -1));
      expect(world.snapshot().current.position[2]).toBeGreaterThan(-7.6);
      const before = world.snapshot().current.position;
      advance(world, 90, input(['forward'], [], 0, -1));
      const after = world.snapshot().current.position;
      expect(Math.abs(after[2] - before[2])).toBeLessThan(.04);
    } finally { world.dispose(); }
  });

  it('desliza paralelamente à parede sem recuar bruscamente', () => {
    const world = new PhysicsWorld();
    try {
      advance(world, 100);
      advance(world, 150, input(['forward'], [], 0, -1));
      const before = world.snapshot().current.position;
      let previousX = before[0];
      for (let i = 0; i < 70; i++) {
        world.step(dt, input(['forward', 'right'], [], 1, -1), 0);
        const x = world.snapshot().current.position[0];
        expect(x).toBeGreaterThanOrEqual(previousX - .03);
        previousX = x;
      }
      const after = world.snapshot().current.position;
      expect(after[0]).toBeGreaterThan(before[0] + 2);
      expect(after[2]).toBeGreaterThan(-7.6);
    } finally { world.dispose(); }
  });

  it('pula e volta ao chão sem pulo duplo', () => {
    const world = new PhysicsWorld();
    try {
      advance(world, 100);
      const baseline = world.snapshot().current.position[1];
      world.step(dt, input([], ['jump']), 0);
      advance(world, 12);
      expect(world.snapshot().current.position[1]).toBeGreaterThan(baseline + .35);
      world.step(dt, input([], ['jump']), 0);
      advance(world, 130);
      expect(world.snapshot().current.grounded).toBe(true);
      expect(Math.abs(world.snapshot().current.position[1] - baseline)).toBeLessThan(.04);
    } finally { world.dispose(); }
  });

  it('porta sólida bloqueia movimento e libera após abertura', () => {
    const world = new PhysicsWorld();
    try {
      advance(world, 100);
      advance(world, 180, input(['right'], [], 1, 0));
      expect(world.snapshot().current.position[0]).toBeLessThan(7.6);
      world.setDoorOpen(true);
      advance(world, 160, input(['right'], [], 1, 0));
      expect(world.snapshot().current.position[0]).toBeGreaterThan(9);
    } finally { world.dispose(); }
  });

  it('ao parar, o personagem não é empurrado pela parede', () => {
    const world = new PhysicsWorld();
    try {
      advance(world, 100);
      advance(world, 220, input(['forward'], [], 0, -1));
      const before = world.snapshot().current.position;
      advance(world, 120);
      const after = world.snapshot().current.position;
      expect(Math.hypot(after[0] - before[0], after[2] - before[2])).toBeLessThan(.03);
      world.syncInterpolation();
      expect(world.snapshot().previous.position).toEqual(world.snapshot().current.position);
    } finally { world.dispose(); }
  });
});
