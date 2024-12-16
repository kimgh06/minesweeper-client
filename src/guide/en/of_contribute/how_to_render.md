# How to Render Tiles

This project uses three `<canvas>` elements to render graphics for animation efficiency:

1. Tile Canvas: Renders tiles.
2. Interaction Canvas: Draws your cursor's path and its range of interaction.
3. Cursors Canvas: Draws user cursors.

## How to Make Frames

### 0. Initialize Start & End Points.

Initialize the tiles and set up the start & end point based on client's window size and tile size.
They're calculated based on how many tiles can be rendered in client's window.

### 1. Connect to the Server

This hook attempts to reconnect the WebSocket using the specified URL and view dimensions whenever the WebSocket is not open and the start & end points are defined.

### 2. Get Tiles Data from Server Using WebSocket

To get the tiles and cursors data from the server, establish a WebSocket connection and listen for incoming messages. When a message is received, parse the data and update the state accordingly.

- The `start_y` and `end_y` coordinates are reversed because the y-axis is inverted.
- The received payload is destructured to extract specific values.
- The extracted values are then used in the `replaceTiles` function to update the tiles.

```tsx
/** More details can be found in play/page.tsx */
/** Request Tiles */
requestTiles(
  startPoint.x - widthReductionLength,
  endPoint.y + heightReductionLength,
  endPoint.x + widthReductionLength,
  startPoint.y - heightReductionLength,
  'A',
);
```

```tsx
...
/** Get Tiles */
const {
  end_p: { x: end_x, y: end_y },
  start_p: { x: start_x, y: start_y },
  tiles: unsortedTiles,
} = payload;

/** Replace old tiles to updated tiles.*/
replaceTiles(end_x, end_y, start_x, start_y, unsortedTiles);
```

### 3. Caching Path2D Objects and a Font

To improve rendering performance, cache the Path2D objects and load the custom font before rendering.

```tsx
/** More details can be found in components/canvas/index.tsx */
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
  setLoading(false); // Start to render
});
```

### 4. Render Tiles in Canvases

Once all properties are cached, set the loading state to `false` and render the tiles on the tile canvas. Rendering will depend on properties such as tile map, tile size, cursor positions, click position, color, and zoom.

The tile canvas is rendered based on CanvasRenderingContext2D refer to Cached Path2D Objects.

Example:
```tsx
/** More details can be found in components/canvas/index.tsx */
const innerGradientValues: [number, number, number, number] = [
  borderPixel,
  borderPixel,
  tileSize - borderPixel * 2,
  tileSize - borderPixel * 2,
];

const gradientObject = {
  inner: [
    tileCtx.createLinearGradient(...innerGradientValues),
    tileCtx.createLinearGradient(...innerGradientValues),
    ...
  ],
  ...
};

gradientObject.inner.forEach((gradient, index) => {
  gradient.addColorStop(0, tileColors.inner[index][0]);
  gradient.addColorStop(1, tileColors.inner[index][1]);
});

tileCtx.fillStyle = gradientObject.inner[0];
tileCtx.fill(tileVector);
```

The interaction canvas is rendered based on the user's cursor position, pointer, and movement path.

```tsx
/** More details can be found in components/canvas/index.tsx */
// Draw my cursor
drawCursor(interactionCtx, cursorCanvasX, cursorCanvasY, cursorColor);

// Describe clicked tile border
interactionCtx.beginPath();
interactionCtx.strokeStyle = cursorColor;
interactionCtx.lineWidth = borderPixel;
interactionCtx.strokeRect(
  clickCanvasX + borderPixel / 2,
  clickCanvasY + borderPixel / 2,
  tileSize - borderPixel,
  tileSize - borderPixel,
);
interactionCtx.closePath();

// Draw path
if (paths.length > 0) {
  interactionCtx.beginPath();
  interactionCtx.strokeStyle = 'black';
  interactionCtx.lineWidth = tileSize / 6;
  const [x, y] = [paths[0].x + compenX, paths[0].y + compenY];
  interactionCtx.moveTo(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2); // start point

  paths.forEach(vector => {
    const [x, y] = [vector.x + compenX, vector.y + compenY];
    interactionCtx.lineTo(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
  });
  interactionCtx.stroke();
}
```

The cursor canvas is rendered based on other user cursors' position
```tsx
/** More details can be found in components/canvas/index.tsx */
// Draw other users' cursor
const otherCursorsCtx = canvasRefs.otherCursorsRef.current?.getContext('2d');
if (!otherCursorsCtx) return;
otherCursorsCtx.clearRect(0, 0, windowWidth, windowHeight);
cursors.forEach(cursor => {
  const x = cursor.x - cursorOriginX + tilePaddingWidth;
  const y = cursor.y - cursorOriginY + tilePaddingHeight;
  drawCursor(otherCursorsCtx, x * tileSize, y * tileSize, cursorColors[cursor.color]);
});
```

### 5. Update Canvases

Several events might trigger the need to update the canvas. Here's how to handle them:

#### 5-1. When Client Cursor's Position Changes

- Update all canvases when the client's cursor position changes.

#### 5-2. When Other Cursors' Status Changes

- Update Cursor canvas when other users' cursor statuses change.

#### 5-3. When Any Tile Has Been Updated

- Update Tile canvas when any tile is updated.

#### 5-4. When Client Sets the Zoom Level

- Update all canvases when the client adjusts the zoom level.
