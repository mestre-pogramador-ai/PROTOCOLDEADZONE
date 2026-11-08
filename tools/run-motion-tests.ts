/** Standalone, dependency-free deterministic checks of the movement mathematics. */
import { horizontalDisplacement, advanceVerticalVelocity, interpolatePosition } from '../src/gameplay/player/MovementMath.js';

let passed = 0;
function check(name: string, condition: boolean): void {
  if (!condition) throw new Error(`FAIL: ${name}`);
  passed++;
  console.log(`OK ${passed.toString().padStart(2)} ${name}`);
}
function close(a: number, b: number, tolerance = 1e-8): boolean { return Math.abs(a-b) <= tolerance; }
const dt = 1 / 60;
const config = { gravity: -9.81, jumpSpeed: 5.3, terminalFallSpeed: 32, groundStickSpeed: .6 };
const straight = horizontalDisplacement(0, -1, 0, 4.6, dt);
const diagonal = horizontalDisplacement(1, -1, 0, 4.6, dt);
check('W avança no eixo -Z', straight.z < 0 && close(straight.x, 0));
check('diagonais não aumentam velocidade', close(Math.hypot(straight.x, straight.z), Math.hypot(diagonal.x, diagonal.z)));
check('W com yaw 90 graus avança -X', close(horizontalDisplacement(0, -1, Math.PI/2, 4, 1).x, -4));
check('movimento com dt zero é nulo', horizontalDisplacement(1, 0, 0, 4, 0).x === 0);
check('input de movimento inválido não gera NaN', horizontalDisplacement(Infinity, 0, 0, 4, dt).x === 0);
check('pulo só começa no chão', advanceVerticalVelocity(0, true, true, false, dt, config).jumped);
check('pulo no ar é ignorado', !advanceVerticalVelocity(0, false, true, false, dt, config).jumped);
check('agachar impede salto', !advanceVerticalVelocity(0, true, true, true, dt, config).jumped);
check('velocidade terminal limita queda', close(advanceVerticalVelocity(-500, false, false, false, dt, config).velocity, -32));
check('solo mantém intenção descendente pequena', close(advanceVerticalVelocity(0, true, false, false, dt, config).velocity, -.6));
const a={x:1,y:1,z:1}, b={x:3,y:3,z:3};
check('interpolação 50% fica no meio', close(interpolatePosition(a,b,.5).x, 2));
check('interpolação não extrapola', close(interpolatePosition(a,b,2).x, 3));
check('alpha inválido usa posição atual', close(interpolatePosition(a,b,Number.NaN).x, 3));
console.log(`${passed} verificações isoladas passaram. Integração Rapier requer npm install e Vitest.`);
