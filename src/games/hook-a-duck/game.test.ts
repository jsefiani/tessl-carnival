import { describe, expect, it } from 'vitest';
import {
  CASTS,
  DUCK_VALUES,
  HOOK_SPEED,
  ROD_Y,
  cast,
  createState,
  duckAt,
  duckPosition,
  step,
} from './game';

/** Runs the game until the hook is back on the rod. */
function reelIn(state: ReturnType<typeof createState>) {
  for (let i = 0; i < 1000 && state.hook; i++) step(state, 0.01);
}

describe('hook a duck', () => {
  it('starts with every cast left, no score and a duck for every number', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.value)).toEqual([...DUCK_VALUES]);
  });

  it('floats the ducks round the loop', () => {
    const state = createState();
    const before = duckPosition(state.ducks[0]);
    step(state, 0.5);
    expect(duckPosition(state.ducks[0])).not.toEqual(before);
  });

  it('uses one cast per drop of the hook', () => {
    const state = createState();
    expect(cast(state, 400, 300)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook?.y).toBe(ROD_Y);
  });

  it('cannot cast while the hook is still out', () => {
    const state = createState();
    cast(state, 400, 300);
    expect(cast(state, 400, 300)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts run out', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state, 400, 300)).toBe(false);
    expect(state.hook).toBeNull();
  });

  it('scores the number on the duck it catches', () => {
    const state = createState();
    const duck = state.ducks[3];
    state.ducks = [duck];
    const { x, y } = duckPosition(duck);
    cast(state, x, y);
    state.hook!.y = y;
    step(state, 0);
    expect(state.score).toBe(duck.value);
    expect(state.hook?.duck).toBe(duck);
    expect(state.hook?.direction).toBe('up');
  });

  it('scores nothing when the hook misses', () => {
    const state = createState();
    const { x, y } = duckPosition(state.ducks[0]);
    cast(state, x, y - 100);
    reelIn(state);
    expect(state.score).toBe(0);
  });

  it('puts the caught duck back on the stream when the hook is reeled in', () => {
    const state = createState();
    const duck = state.ducks[0];
    state.ducks = [duck];
    const { x, y } = duckPosition(duck);
    cast(state, x, y);
    state.hook!.y = y;
    step(state, 0);
    expect(duck.hooked).toBe(true);
    reelIn(state);
    expect(duck.hooked).toBe(false);
    expect(state.hook).toBeNull();
  });

  it('lowers the hook at a steady speed', () => {
    const state = createState();
    cast(state, 400, 400);
    step(state, 0.1);
    expect(state.hook?.y).toBeCloseTo(ROD_Y + HOOK_SPEED * 0.1);
  });

  it('only reaches a duck within the catch radius', () => {
    const state = createState();
    const { x, y } = duckPosition(state.ducks[0]);
    expect(duckAt(state, x + 10, y)).toBe(state.ducks[0]);
    expect(duckAt(state, x, y - 60)).toBeNull();
  });

  it('ends the round once the last cast is reeled in', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 400, 300);
    step(state, 0.01);
    expect(state.phase).toBe('playing');
    reelIn(state);
    expect(state.phase).toBe('over');
  });
});
