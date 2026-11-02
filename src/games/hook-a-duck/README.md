# Hook a Duck

Rubber ducks float round a stream in a loop. Lower your hook to catch one as it passes.

## How to play

- Move the mouse to aim: the ring shows where the hook will drop.
- Click to cast. The hook drops to the ring, catches a duck if one is under it,
  then reels back up to the rod.
- You can't cast again until the hook is back on the rod.
- You have 10 casts. The round ends when the last cast is reeled in.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, which shows when you lift it. A caught duck
scores its number, and goes back on the stream once the hook is reeled in.

| Number | Ducks on the stream |
| ------ | ------------------- |
| 10     | 4                   |
| 20     | 2                   |
| 30     | 1                   |
| 50     | 1                   |

A cast that misses scores nothing. Your final score is saved to the carnival's
score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `duckAt`) and the
  `hookADuck` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
