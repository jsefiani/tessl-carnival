import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  THROWER,
  WOBBLE,
  bottleAt,
  createState,
  land,
  step,
  throwRing,
  wobble,
} from './game';

describe('ring toss', () => {
  it('starts with a full set of rings, a grid of bottles and no score', () => {
    const state = createState();
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles).toHaveLength(15);
    expect(state.bottles.every((b) => !b.ringed)).toBe(true);
  });

  it('scores bottles further back higher', () => {
    const { bottles } = createState();
    const back = bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
    expect(back.points).toBe(30);
    expect(front.points).toBe(10);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(throwRing(state, 400, 200)).toBe(true);
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND - 1);
    expect(state.rings).toHaveLength(1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.ringsLeft = 0;
    expect(throwRing(state, 400, 200)).toBe(false);
    expect(state.rings).toHaveLength(0);
  });

  it('never throws a ring backwards past the thrower', () => {
    const state = createState();
    throwRing(state, 400, THROWER.y + 50);
    expect(state.rings[0].toY).toBeLessThan(THROWER.y);
  });

  it('drifts the throw by the wobble, never more than WOBBLE', () => {
    const state = createState();
    state.time = 0.4;
    throwRing(state, 400, 200);
    expect(state.rings[0].toX).toBeCloseTo(400 + wobble(0.4));
    for (let t = 0; t < 10; t += 0.1) expect(Math.abs(wobble(t))).toBeLessThanOrEqual(WOBBLE);
  });

  it('finds the bottle under a ring that lands on its neck', () => {
    const { bottles } = createState();
    const bottle = bottles[0];
    expect(bottleAt(bottles, bottle.x + NECK_RADIUS - 1, bottle.y)).toBe(bottle);
    expect(bottleAt(bottles, bottle.x + NECK_RADIUS + 1, bottle.y)).toBeUndefined();
  });

  it('scores a ring on a bottle neck and marks the bottle ringed', () => {
    const state = createState();
    const bottle = state.bottles[0];
    land(state, bottle.x, bottle.y);
    expect(state.score).toBe(bottle.points);
    expect(bottle.ringed).toBe(true);
  });

  it('does not score a second ring on a bottle that is already ringed', () => {
    const state = createState();
    const bottle = state.bottles[0];
    land(state, bottle.x, bottle.y);
    land(state, bottle.x, bottle.y);
    expect(state.score).toBe(bottle.points);
    expect(state.misses).toHaveLength(1);
  });

  it('counts a ring that misses every neck as a miss', () => {
    const state = createState();
    land(state, 10, 10);
    expect(state.score).toBe(0);
    expect(state.misses).toEqual([{ x: 10, y: 10 }]);
  });

  it('lands a thrown ring after its flight', () => {
    const state = createState();
    const bottle = state.bottles[2];
    state.rings = [{ fromX: 0, fromY: 0, toX: bottle.x, toY: bottle.y, age: 0 }];
    step(state, FLIGHT_TIME / 2);
    expect(state.rings).toHaveLength(1);
    expect(state.score).toBe(0);
    step(state, FLIGHT_TIME / 2);
    expect(state.rings).toHaveLength(0);
    expect(state.score).toBe(bottle.points);
  });

  it('keeps playing while the last ring is still in the air', () => {
    const state = createState();
    state.ringsLeft = 0;
    state.rings = [{ fromX: 0, fromY: 0, toX: 10, toY: 10, age: 0 }];
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
  });

  it('ends the round when the rings run out and the last one has landed', () => {
    const state = createState();
    state.ringsLeft = 0;
    state.rings = [{ fromX: 0, fromY: 0, toX: 10, toY: 10, age: 0 }];
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
  });
});
