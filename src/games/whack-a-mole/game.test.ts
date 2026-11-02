import { describe, expect, it } from 'vitest';
import {
  HOLE_RADIUS,
  POINTS_PER_WHACK,
  ROUND_SECONDS,
  SPAWN_INTERVAL,
  UP_TIME,
  createState,
  isUp,
  popUp,
  spawnInterval,
  step,
  upTime,
  whack,
} from './game';

const first = () => 0;
const headOf = (hole: { x: number; y: number }) => ({ x: hole.x, y: hole.y - HOLE_RADIUS * 0.4 });

describe('whack-a-mole', () => {
  it('starts a full round with no score and every mole down', () => {
    const state = createState();
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.holes).toHaveLength(9);
    expect(state.holes.some(isUp)).toBe(false);
  });

  it('pops a mole up once the first spawn time passes', () => {
    const state = createState();
    step(state, SPAWN_INTERVAL.start + 0.01, first);
    expect(state.holes.filter(isUp)).toHaveLength(1);
  });

  it('scores a whack on a mole that is up and knocks it down', () => {
    const state = createState();
    popUp(state, first);
    const { x, y } = headOf(state.holes[0]);
    expect(whack(state, x, y)).toBe(true);
    expect(state.score).toBe(POINTS_PER_WHACK);
    expect(isUp(state.holes[0])).toBe(false);
  });

  it('does not score the same mole twice', () => {
    const state = createState();
    popUp(state, first);
    const { x, y } = headOf(state.holes[0]);
    whack(state, x, y);
    expect(whack(state, x, y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_WHACK);
  });

  it('does not score a miss or an empty hole', () => {
    const state = createState();
    const { x, y } = headOf(state.holes[0]);
    expect(whack(state, x, y)).toBe(false);
    popUp(state, first);
    expect(whack(state, 0, 0)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    popUp(state, first);
    state.nextSpawn = 100;
    step(state, UP_TIME.start + 0.01, first);
    expect(isUp(state.holes[0])).toBe(false);
  });

  it('pops moles up faster and for less time as the round goes on', () => {
    const state = createState();
    const early = { spawn: spawnInterval(state), up: upTime(state) };
    state.timeLeft = 1;
    expect(spawnInterval(state)).toBeLessThan(early.spawn);
    expect(upTime(state)).toBeLessThan(early.up);
  });

  it('never pops two moles from the same hole', () => {
    const state = createState();
    for (let i = 0; i < state.holes.length; i++) expect(popUp(state, first)).toBe(true);
    expect(popUp(state, first)).toBe(false);
  });

  it('ends the round when time runs out, and ignores whacks after that', () => {
    const state = createState();
    popUp(state, first);
    step(state, ROUND_SECONDS, first);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    const { x, y } = headOf(state.holes[0]);
    expect(whack(state, x, y)).toBe(false);
  });
});
