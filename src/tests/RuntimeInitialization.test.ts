import { expect, it } from 'vitest';
import { Runtime } from '../app/Runtime';

it('concurrent runtime creation shares WASM initialization and keeps worlds independent', async () => {
  const [cancelled, active] = await Promise.all([Runtime.create(), Runtime.create()]);
  cancelled.dispose();
  try {
    expect(active.getSnapshot().current.position).toEqual([-1, expect.any(Number), 0]);
    active.setDoorOpen(true);
    expect(active.isDoorOpen()).toBe(true);
    expect(active.getSnapshot().current.position.every(Number.isFinite)).toBe(true);
  } finally {
    active.dispose();
  }
});
