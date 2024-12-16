# How to Render Tiles.
This project uses 3 canvas elements to render graphics because of animation efficiency.
1. Tile Canvas: Render tiles.
2. Interaction Canvas: Draw your cursor's path and its range of interaction.
3. Cursors Canvas: Draw user cursors

## How to make Frames
### 0. Connect Server.
This hook will attempt to reconnect the WebSocket using the specified URL and view dimensions whenever the WebSocket is not open and the start and end points are defined.
```tsx
/** you can see more in play/page.tsx */
connect(webSocketUrl + `?view_width=${endPoint.x - startPoint.x + 1}&view_height=${endPoint.y - startPoint.y + 1}`);
```
### 1. Initialize Tiles


### 2. Get tiles & cursors data from server using websocket.
To get the tiles and cursors data from the server, establish a WebSocket connection and listen for incoming messages. When a message is received, parse the data and update the state accordingly.

Send start y and end y coordinates are reversed because the y-axis is reversed.
It then destructures the received payload to extract specific values.
Finally, it uses these values in a function call to replaceTiles.
```tsx
/** You can see more in play/page.tsx */
/** Request Tile */
requestTiles(
  startPoint.x - widthReductionLength,
  endPoint.y + heightReductionLength,
  endPoint.x + widthReductionLength,
  startPoint.y - heightReductionLength,
  'A',
);

...
/** Get Tiles */
const {
  end_p: { x: end_x, y: end_y },
  start_p: { x: start_x, y: start_y },
  tiles: unsortedTiles,
} = payload;

replaceTiles(end_x, end_y, start_x, start_y, unsortedTiles);
```

### 3. Caching Path2D objects and a font.
To improve rendering performance, cache the Path2D objects and load the custom font before rendering.

```tsx
setCachedVectorImages({
  cursor: new Path2D(cursorPaths),
  flag: {
    flag: new Path2D(flagPaths[0]),
    pole: new Path2D(flagPaths[1]),
  },
  boom: {
    inner: new Path2D(boomPaths[0]),
    outer: new Path2D(boomPaths[1]),
  },
  });
  
const lotteriaChabFont = new FontFace(
  'LOTTERIACHAB',
  "url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/LOTTERIACHAB.woff2') format('woff2')",
);

Promise.all([lotteriaChabFont.load()]).then(() => {
  document.fonts.add(lotteriaChabFont);
  setLoading(false);
});
```
### 4. Render initial Tiles in Canvases.
If all properties are cached, set the loading state to load and render tiles in tile canvas.
```tsx
renderTiles();
```

### 5. Update canvases

#### 5-1. When client cursor's position changes.

#### 5-2. When other cursors's statuses changes.

#### 5-3. When any tile has been updated.

#### 5-4. When client sets the zoom level.
