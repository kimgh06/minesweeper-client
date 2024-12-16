# About Tiles
The tile has a 4 status. You can change the status of this when status is "CLOSED".
1. "CLOSED" (Nothing action on a tile)
2. "OPENED" (Activated a tile without a mine)
3. "EXPLODED" (Activated a tile with a mine) 
4. "FLAGED" (Set own flag on a tile)
## Activate a Tile
You can activate a tile using by "GENERAL CLICK" (Left click on desktop) or "SPECIAL CLICK" (Right click on desktop)

- GENERAL CLICK (Left Click): 
  - If "OPENED" or "EXPLODED": You can move to a clicked tile if there is a path (5 tiles per second).
  - If "CLOSED": You can "OPEN" the tile to check if it has a mine. If it doesn't, you will get the number of neighboring mines. However, if it does have a mine, it will explode, and you will lose control of all tiles for 3 minutes.
  - If "FLAGED": Nothing happens.

- SPECIAL CLICK (Right Click):
  - If "CLOSED": You can set your own flag on clicked tile and make its status to "FLAGED".
  - If "FLAGED": You can remove any flag on clicked tile and make its status to "CLOSED".
  - If "OPENED" or "EXPLODED": Nothing happens.
