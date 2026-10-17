# Minesweeper

A browser version of classic Windows Minesweeper: the player clears a Board of hidden Mines using Clues, on one of three Difficulties, against the clock.

## Language

### Board

**Board**:
The rectangular grid of Cells that a single Game is played on.
_Avoid_: Field, Grid, Minefield

**Cell**:
One square of the Board; it is either Hidden or Revealed and may contain a Mine.
_Avoid_: Tile, Square

**Hidden / Revealed**:
The two states of a Cell: not yet uncovered by the player, or uncovered.
_Avoid_: Covered, Closed / Opened, Uncovered

**Mine**:
A hazard concealed in a Cell; Revealing it loses the Game.
_Avoid_: Bomb

**Neighbor**:
One of the up to eight Cells touching a given Cell, diagonals included.
_Avoid_: Adjacent cell

**Clue**:
The number of Mines among a Revealed Cell's Neighbors, from 0 to 8.
_Avoid_: Number, Hint

**Layout**:
The positions of all Mines on a Board, fixed by the first Reveal of a Game.
_Avoid_: Mine map, Placement

### Player actions

**Reveal**:
The player's action of uncovering a Hidden Cell.
_Avoid_: Open, Click, Dig

**Flag**:
The player's marker on a Hidden Cell asserting that it contains a Mine.
_Avoid_: Mark

**Question**:
The player's "?" marker on a Hidden Cell, meaning the player is unsure whether it contains a Mine.
_Avoid_: Mark, Maybe

**Chord**:
The player's action on a Revealed Cell whose Clue equals the number of its Flagged Neighbors: it Reveals all of that Cell's other Hidden Neighbors at once.
_Avoid_: Double-click, Area open

**Cascade**:
The automatic Reveal of every Neighbor of a Cell whose Clue is 0, continuing through each newly Revealed Cell whose Clue is also 0.
_Avoid_: Flood fill, Opening

### Games

**Game**:
One attempt to clear one Board, ending in a Win or a Loss.
_Avoid_: Round, Match

**Win**:
The end of a Game in which every Cell without a Mine has been Revealed.
_Avoid_: Victory, Clear

**Loss**:
The end of a Game in which a Cell with a Mine was Revealed.
_Avoid_: Defeat, Game over

**Difficulty**:
One of three presets fixing the Board size and Mine count: Beginner (9×9, 10 Mines), Intermediate (16×16, 40 Mines), Expert (30×16, 99 Mines).
_Avoid_: Level, Mode

**Best Time**:
The fastest Win on a given Difficulty, in seconds, together with the name of the player who set it.
_Avoid_: Record, High score
