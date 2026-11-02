import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** How close to a bottle's neck, in pixels, a ring must land to score. */
export const NECK_RADIUS = 14;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How far, in pixels, the throw drifts either side of the aim. */
export const WOBBLE = 36;
const WOBBLE_SPEED = 2.4;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
/** Back row first: bottles further back score more. */
const ROWS = [
  { y: 130, points: 30 },
  { y: 200, points: 20 },
  { y: 270, points: 10 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  x: number;
  y: number;
  points: number;
  ringed: boolean;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface Miss {
  x: number;
  y: number;
}

export interface RingTossState {
  bottles: Bottle[];
  rings: Ring[];
  misses: Miss[];
  ringsLeft: number;
  score: number;
  /** Seconds since the round began; drives the wobble. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = 110;
  const left = WIDTH / 2 - (spacing * (BOTTLES_PER_ROW - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      points: row.points,
      ringed: false,
    })),
  );
  return {
    bottles,
    rings: [],
    misses: [],
    ringsLeft: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** The sideways drift of the throw at `time`, between -WOBBLE and WOBBLE. */
export function wobble(time: number): number {
  return Math.sin(time * WOBBLE_SPEED) * WOBBLE;
}

/** The bottle a ring landing at (x, y) goes over, if any. A ringed bottle takes no more rings. */
export function bottleAt(bottles: readonly Bottle[], x: number, y: number): Bottle | undefined {
  return bottles.find((b) => !b.ringed && Math.hypot(x - b.x, y - b.y) <= NECK_RADIUS);
}

/** Throws one ring at the aim, drifted by the wobble. Returns false if nothing was thrown. */
export function throwRing(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.ringsLeft === 0) return false;
  state.rings.push({
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + wobble(state.time),
    toY: Math.min(aimY, THROWER.y - 1),
    age: 0,
  });
  state.ringsLeft -= 1;
  return true;
}

/** Lands a ring: it scores on a free bottle neck and misses anywhere else. */
export function land(state: RingTossState, x: number, y: number): void {
  const bottle = bottleAt(state.bottles, x, y);
  if (bottle) {
    bottle.ringed = true;
    state.score += bottle.points;
  } else {
    state.misses.push({ x, y });
  }
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  const flying: Ring[] = [];
  for (const ring of state.rings) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) land(state, ring.toX, ring.toY);
    else flying.push(ring);
  }
  state.rings = flying;

  if (state.ringsLeft === 0 && state.rings.length === 0) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.strokeStyle = theme.colors.stripeA;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Shelves, one per row of bottles.
  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(100, row.y + 34, WIDTH - 200, 8);
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 12, bottle.y + 6, 24, 28);
    ctx.fillRect(bottle.x - 4, bottle.y - 8, 8, 16);
    ctx.fillStyle = colors.muted;
    ctx.fillRect(bottle.x - 5, bottle.y - 12, 10, 4);
    if (bottle.ringed) drawRing(ctx, bottle.x, bottle.y + 4, 0.8);
  }

  ctx.globalAlpha = 0.5;
  for (const miss of state.misses) drawRing(ctx, miss.x, miss.y, 0.7);
  ctx.globalAlpha = 1;

  // A ring in the air rises in an arc and shrinks as it flies away.
  for (const ring of state.rings) {
    const t = ring.age / FLIGHT_TIME;
    const x = ring.fromX + (ring.toX - ring.fromX) * t;
    const y = ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(t * Math.PI) * 80;
    drawRing(ctx, x, y, 1.4 - t * 0.6);
  }

  // Where a ring thrown now would land.
  if (state.phase === 'playing') {
    const x = aim.x + wobble(state.time);
    const y = Math.min(aim.y, THROWER.y - 1);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
  }

  if (state.ringsLeft > 0) drawRing(ctx, THROWER.x, THROWER.y, 1.4);

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.ringsLeft}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: ROWS[1].y };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        throwRing(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
