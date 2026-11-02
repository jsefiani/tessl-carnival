import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 10;
/** The stream is an oval loop round an island. */
export const STREAM = { x: WIDTH / 2, y: 280, rx: 300, ry: 140 } as const;
/** Where the rod holds the hook when it is reeled in. */
export const ROD_Y = 50;
/** How fast the hook drops and reels in, in pixels per second. */
export const HOOK_SPEED = 600;
/** How close the hook must land to a duck's middle to catch it. */
export const CATCH_RADIUS = 24;
/** Radians per second round the loop. */
export const DUCK_SPEED = 0.5;
/** The number on each duck's base, in order round the loop. */
export const DUCK_VALUES = [10, 20, 10, 50, 10, 20, 10, 30] as const;
const DUCK_RADIUS = 20;

export interface Duck {
  /** Position round the loop, in radians. */
  angle: number;
  value: number;
  hooked: boolean;
}

export interface Hook {
  x: number;
  y: number;
  /** How far down this cast goes before the hook comes back up. */
  targetY: number;
  direction: 'down' | 'up';
  duck: Duck | null;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook | null;
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_VALUES.map((value, i) => ({
    angle: (i / DUCK_VALUES.length) * Math.PI * 2,
    value,
    hooked: false,
  }));
  return { ducks, hook: null, casts: CASTS, score: 0, phase: 'playing' };
}

/** Where a duck floats on the stream. */
export function duckPosition(duck: Duck): { x: number; y: number } {
  return {
    x: STREAM.x + STREAM.rx * Math.cos(duck.angle),
    y: STREAM.y + STREAM.ry * Math.sin(duck.angle),
  };
}

/** The floating duck nearest the point, if it is within reach of the hook. */
export function duckAt(state: HookADuckState, x: number, y: number): Duck | null {
  let nearest: Duck | null = null;
  let nearestDistance = CATCH_RADIUS;
  for (const duck of state.ducks) {
    if (duck.hooked) continue;
    const position = duckPosition(duck);
    const distance = Math.hypot(position.x - x, position.y - y);
    if (distance <= nearestDistance) {
      nearest = duck;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/** Lowers the hook towards the point. Returns false if nothing was cast. */
export function cast(state: HookADuckState, x: number, y: number): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.hook) return false;
  state.hook = {
    x: Math.min(Math.max(x, 0), WIDTH),
    y: ROD_Y,
    targetY: Math.min(Math.max(y, ROD_Y), HEIGHT),
    direction: 'down',
    duck: null,
  };
  state.casts -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    if (!duck.hooked) duck.angle = (duck.angle + DUCK_SPEED * dt) % (Math.PI * 2);
  }

  const hook = state.hook;
  if (hook) {
    if (hook.direction === 'down') {
      hook.y = Math.min(hook.y + HOOK_SPEED * dt, hook.targetY);
      if (hook.y === hook.targetY) {
        const duck = duckAt(state, hook.x, hook.y);
        if (duck) {
          duck.hooked = true;
          hook.duck = duck;
          state.score += duck.value;
        }
        hook.direction = 'up';
      }
    } else {
      hook.y = Math.max(hook.y - HOOK_SPEED * dt, ROD_Y);
      if (hook.y === ROD_Y) {
        // Put the duck back on the stream where it was caught.
        if (hook.duck) hook.duck.hooked = false;
        state.hook = null;
      }
    }
  }

  if (state.casts === 0 && !state.hook) state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, value: number | null) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, DUCK_RADIUS, DUCK_RADIUS * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10, y - 14, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x + 18, y - 17);
  ctx.lineTo(x + 28, y - 13);
  ctx.lineTo(x + 18, y - 10);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + 12, y - 17, 2, 0, Math.PI * 2);
  ctx.fill();

  // A lifted duck shows the number on its base.
  if (value !== null) {
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.arc(x, y + 24, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('small', 'bold');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x, y + 25);
    ctx.textBaseline = 'alphabetic';
  }
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream round its island.
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 80;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = colors.water;
  ctx.lineWidth = 64;
  ctx.stroke();
  ctx.fillStyle = colors.surface;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - 40, STREAM.ry - 40, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const duck of state.ducks) {
    if (duck.hooked) continue;
    const { x, y } = duckPosition(duck);
    drawDuck(ctx, x, y, null);
  }

  // The rod along the top, with the hook on its line.
  const hookX = state.hook ? state.hook.x : Math.min(Math.max(aim.x, 0), WIDTH);
  const hookY = state.hook ? state.hook.y : ROD_Y;
  ctx.fillStyle = colors.wood;
  ctx.fillRect(hookX - 60, ROD_Y - 8, 120, 8);
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hookX, ROD_Y);
  ctx.lineTo(hookX, hookY);
  ctx.stroke();
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hookX - 5, hookY, 5, 0, Math.PI);
  ctx.stroke();

  if (state.hook?.duck) drawDuck(ctx, hookX, hookY + 18, state.hook.duck.value);

  // Where the next cast will land.
  if (!state.hook && state.phase === 'playing') {
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, CATCH_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description:
    'Lower your hook to catch the ducks floating round the stream. Each scores its number.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.y + STREAM.ry };

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
        cast(state, aim.x, aim.y);
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
        recordScore(hookADuck.id, state.score);
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

export default hookADuck;
