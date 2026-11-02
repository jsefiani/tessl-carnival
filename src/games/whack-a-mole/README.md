# Whack-a-Mole

Whack the moles as they pop up from the holes, before they duck back down.

## How to play

- Moles pop up from a grid of nine holes, stay up for a moment, then drop back down.
- Click a mole while it's up to whack it.
- As the round goes on, moles pop up more often and stay up for less time:
  from one every 1.1 seconds, up for 1.4 seconds, to one every 0.35 seconds,
  up for 0.6 seconds.
- The round lasts 30 seconds.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Missing costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `popUp`, `whack`,
  `spawnInterval`, `upTime`) and the `whackAMole` entry, the default export the
  midway finds.
- `game.test.ts`: tests for the game logic.
