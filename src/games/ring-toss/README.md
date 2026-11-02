# Ring Toss

Land rings on the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim, and click to throw a ring at the yellow crosshair.
- Your hand wobbles: the crosshair drifts up to 36 px left and right, so time your throw.
- You have 8 rings. The round ends when you have thrown them all and the last ring has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands within 14 px of a bottle's neck. Each bottle takes
one ring; a ring on a bottle that is already ringed is a miss.

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwRing`, `land`, `step`, `bottleAt`,
  `wobble`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
