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

**Marks (?)**:
The player's preference, named after the original's menu item, for whether the right button and a Long Touch can put a Question on a Cell or only a Flag.
_Avoid_: Marks on its own, Question mode

**Chord**:
The player's action on a Cell that, when the Cell is Revealed and its Clue equals the number of its Flagged Neighbors, Reveals all of that Cell's other Hidden Neighbors at once; on any other Cell it does nothing.
_Avoid_: Double-click, Area open

**Press**:
The player holding mouse buttons down on the Board, from the first button going down over a Cell until one of them is released; while it lasts, the Cells it would act on look pressed in.
_Avoid_: Gesture, Hold, Click

**Touch**:
The player holding one finger or a stylus on the Board, from touching a Cell until lifting it; it acts only on the Cell it began on, and while it lasts, the Cells it would act on look pressed in.
_Avoid_: Press, Gesture

**Tap**:
A Touch that ends before it becomes a Long Touch.
_Avoid_: Click, Short touch

**Long Touch**:
A Touch held on a Hidden Cell long enough to put, change or remove its Flag or Question, as the right button does, without waiting for the finger to lift.
_Avoid_: Long press, Long tap, Hold

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

**Timer**:
The three-digit count of a Game's seconds: 1 from the first Reveal, one more for each whole second after it, stopping when the Game ends or at 999.
_Avoid_: Clock, Stopwatch

**Best Time**:
The time in seconds, with its holder's name, that a Win on a given Difficulty must beat to replace it; every Difficulty starts with 999 seconds held by Anonymous, and Reset Scores restores that.
_Avoid_: Record, High score
