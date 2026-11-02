import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_WHACK = 10;
export const COLUMNS = 3;
export const ROWS = 3;
export const HOLE_RADIUS = 46;
/** Seconds between pop-ups at the start and at the end of a round. */
export const SPAWN_INTERVAL = { start: 1.1, end: 0.35 } as const;
/** Seconds a mole stays up at the start and at the end of a round. */
export const UP_TIME = { start: 1.4, end: 0.6 } as const;
/** Seconds a whacked mole shows its bonk before it drops. */
const BONK_TIME = 0.25;

export interface Hole {
  x: number;
  y: number;
  /** Seconds left before the mole drops; 0 means nobody is up. */
  up: number;
  /** Seconds left on the bonk after a whack; 0 means not bonked. */
  bonked: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  /** Seconds left in the round. */
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextSpawn: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const gapX = WIDTH / (COLUMNS + 1);
  const top = 130;
  const gapY = (HEIGHT - top - 60) / (ROWS - 1);
  const holes = Array.from({ length: COLUMNS * ROWS }, (_, i) => ({
    x: gapX * ((i % COLUMNS) + 1),
    y: top + gapY * Math.floor(i / COLUMNS),
    up: 0,
    bonked: 0,
  }));
  return {
    holes,
    timeLeft: ROUND_SECONDS,
    nextSpawn: SPAWN_INTERVAL.start,
    score: 0,
    phase: 'playing',
  };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
export function progress(state: WhackAMoleState): number {
  return Math.min(Math.max(1 - state.timeLeft / ROUND_SECONDS, 0), 1);
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Moles pop up more often as the round goes on. */
export function spawnInterval(state: WhackAMoleState): number {
  return lerp(SPAWN_INTERVAL.start, SPAWN_INTERVAL.end, progress(state));
}

/** Moles stay up for less time as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return lerp(UP_TIME.start, UP_TIME.end, progress(state));
}

export function isUp(hole: Hole): boolean {
  return hole.up > 0 && hole.bonked === 0;
}

/** Pops a mole up from a random empty hole. Returns false if every hole is busy. */
export function popUp(state: WhackAMoleState, random: () => number = Math.random): boolean {
  const empty = state.holes.filter((h) => h.up === 0 && h.bonked === 0);
  if (empty.length === 0) return false;
  const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
  hole.up = upTime(state);
  return true;
}

/** Whacks whatever is at the point. Returns true if it hit a mole that was up. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find(
    (h) => isUp(h) && Math.hypot(x - h.x, y - (h.y - HOLE_RADIUS * 0.4)) <= HOLE_RADIUS,
  );
  if (!hole) return false;
  hole.up = 0;
  hole.bonked = BONK_TIME;
  state.score += POINTS_PER_WHACK;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(state.timeLeft - dt, 0);
  for (const hole of state.holes) {
    hole.up = Math.max(hole.up - dt, 0);
    hole.bonked = Math.max(hole.bonked - dt, 0);
  }

  if (state.timeLeft === 0) {
    for (const hole of state.holes) {
      hole.up = 0;
      hole.bonked = 0;
    }
    state.phase = 'over';
    return;
  }

  state.nextSpawn -= dt;
  while (state.nextSpawn <= 0) {
    popUp(state, random);
    state.nextSpawn += spawnInterval(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    // The mole, clipped so it rises out of the hole.
    if (hole.up > 0 || hole.bonked > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(hole.x - HOLE_RADIUS, hole.y - HOLE_RADIUS * 2, HOLE_RADIUS * 2, HOLE_RADIUS * 2);
      ctx.clip();
      const headY = hole.y - HOLE_RADIUS * 0.4;
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.arc(hole.x, headY, HOLE_RADIUS * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hole.bonked > 0 ? colors.danger : colors.text;
      ctx.font = canvasFont('body', 'bold');
      ctx.textAlign = 'center';
      ctx.fillText(hole.bonked > 0 ? 'x  x' : '•  •', hole.x, headY);
      ctx.restore();
    }

    // The rim of the hole sits in front of the mole.
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y, HOLE_RADIUS, HOLE_RADIUS * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get quicker as time runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
