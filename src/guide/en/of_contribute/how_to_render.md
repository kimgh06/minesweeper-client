# How to render tiles.
This project uses 3 canvas elements to render graphics because of animation efficiency.
1. Tile Canvas: Render tiles.
2. Interaction Canvas: Draw your cursor's path and its range of interaction.
3. Cursors Canvas: Draw user cursors

## How to make Frames
### 1. Initialize Canvases

### 2. Get tiles & cursors data from server using websocket.

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
### 4. Render initial Tiles.

### 5. Update canvases

#### 5-1. When client cursor's position changes.

#### 5-2. When other cursors's statuses changes.

#### 5-3. When any tile has been updated.

#### 5-4. When client sets the zoom level.
