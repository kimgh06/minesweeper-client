# About Interactions.

## Tile States
Here are the four possible states of a tile in Minesweeper:
1. "CLOSED" (Nothing action on a tile)
2. "OPENED" (Activated a tile without a mine)
3. "EXPLODED" (Activated a tile with a mine) 
4. "FLAGGED" (Set own flag on a tile)
## Activate a Neighboring Tile.
You can activate a tile using by "GENERAL CLICK" (Left click on desktop) or "SPECIAL CLICK" (Right click on desktop)

### GENERAL CLICK (Left Click): 
- If "OPENED" or "EXPLODED": You can move to a clicked tile if there is a path (5 tiles per second).
- If "CLOSED": You can "OPEN" the tile to check if it has a mine. If It has, you lose control because tile has mine. If it doesn't, you will get the number of neighboring mines.

However, if any neighboring tile explodes, and you will LOSE control of all tiles for 3 minutes.

### SPECIAL CLICK (Right Click):
- If "CLOSED": You can set your own flag on clicked tile and make its status to "FLAGGED".
- If "FLAGGED": You can remove any flag on clicked tile and make its status to "CLOSED".

## Move to Clicked Tile
When you choose "OPENED" or "EXPLODED" tile, the computer finds a path to that tile from your cursor's position.

