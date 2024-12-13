'use client';
import S from './style.module.scss';
import React, { useRef, useEffect, useState } from 'react';
import Paths from '@/assets/paths.json';

import useScreenSize from '@/hooks/useScreenSize';
import useClickStore from '@/store/clickStore';
import { useCursorStore, useOtherUserCursorsStore } from '@/store/cursorStore';
import useWebSocketStore from '@/store/websocketStore';

class TileNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: TileNode | null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.g = Infinity; // Cost from start node
    this.h = 0; // Heuristic (estimated cost to goal)
    this.f = Infinity; // Total cost f = g + h
    this.parent = null; // For path reconstruction
  }
}

/** 타입 정의 */
interface CanvasRendererProps {
  tiles: string[][];
  tileSize: number;
  cursorOriginX: number;
  cursorOriginY: number;
  paddingTiles: number;
  startPoint: { x: number; y: number };
}

interface Path {
  x: number;
  y: number;
}

interface VectorImages {
  cursor: Path2D;
  flag: {
    pole: Path2D;
    flag: Path2D;
  };
  boom: {
    inner: Path2D;
    outer: Path2D;
  };
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  paddingTiles,
  tiles,
  tileSize,
  cursorOriginX,
  cursorOriginY,
  startPoint,
}) => {
  /** constants */
  const animationSpeed = 200; // milliseconds
  const animationFrames = 10;
  const relativeX = cursorOriginX - startPoint.x;
  const relativeY = cursorOriginY - startPoint.y;
  const tilePaddingWidth = ((paddingTiles - 1) * relativeX) / paddingTiles;
  const tilePaddingHeight = ((paddingTiles - 1) * relativeY) / paddingTiles;

  const { boomPaths, cursorPaths, flagPaths, tileColors, countColors } = Paths;
  const cursorColors: { [key: string]: string } = {
    red: '#FF4D00',
    blue: '#0094FF',
    yellow: '#F0C800',
    purple: '#BC3FDC',
    '0': '#FF4D00',
    '1': '#F0C800',
    '2': '#0094FF',
    '3': '#BC3FDC',
  };
  /** stores */
  const { windowHeight, windowWidth } = useScreenSize();
  const {
    x: cursorX,
    y: cursorY,
    godown,
    goleft,
    goright,
    goup,
    goDownLeft,
    goDownRight,
    goUpLeft,
    goUpRight,
    zoom,
    color,
    setPosition: setCusorPosition,
  } = useCursorStore();
  const { setPosition: setClickPosition, x: clickX, y: clickY, setMovecost } = useClickStore();
  const { cursors } = useOtherUserCursorsStore();
  const { message, sendMessage } = useWebSocketStore();

  /** References */
  const tileCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const otherCursorsRef = useRef<HTMLCanvasElement>(null);
  const movementInterval = useRef<NodeJS.Timeout | null>(null);

  /** States */
  const [loading, setLoading] = useState<boolean>(true);
  const [paths, setPaths] = useState<Path[]>([]);
  const [leftPaths, setLeftPaths] = useState<Path>({ x: 0, y: 0 });
  const [renderedTiles, setRenderedTiles] = useState<string[][]>([]);
  const [cachedVectorImages, setCachedVectorImages] = useState<VectorImages>();

  /** Cancel interval function for animation. */
  const cancelCurrentMovement = () => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
  };

  /** Prevent default right click event */
  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    window.addEventListener('contextmenu', preventContextMenu);
    return () => {
      window.removeEventListener('contextmenu', preventContextMenu);
      cancelCurrentMovement();
    };
  }, []);

  /**
   * General Click Event Handler
   * @param relativeTileX x position of clicked tile
   * @param relativetileY y position of clicked tile
   * @returns void
   * */
  const moveCursor = (relativeTileX: number, relativetileY: number) => {
    if (movementInterval.current) return;
    let index = 0;
    const paths = findPathUsingAStar(relativeX, relativeY, relativeTileX, relativetileY);
    let currentPath = paths[index];
    if (currentPath?.x === undefined || currentPath?.y === undefined) return;
    setMovecost(paths.length - 1);
    setCusorPosition(relativeTileX + startPoint.x, relativetileY + startPoint.y);

    const animateTileMoving = (dx: number, dy: number) => {
      let countFrame = 0;
      const animation = setInterval(() => {
        if (!tileCanvasRef.current || !interactionCanvasRef.current || !otherCursorsRef.current) return;
        if (countFrame >= 1) {
          tileCanvasRef.current.style.transform = '';
          interactionCanvasRef.current.style.transform = '';
          otherCursorsRef.current.style.transform = '';
          clearInterval(animation);
          return;
        }
        countFrame += 0.1;
        const translateX = dx * (tileSize - countFrame * tileSize);
        const translateY = dy * (tileSize - countFrame * tileSize);
        const translate = `translate(${translateX}px, ${translateY}px)`;
        tileCanvasRef.current.style.transform = translate;
        interactionCanvasRef.current.style.transform = translate;
        otherCursorsRef.current.style.transform = translate;
      }, animationSpeed / animationFrames);
    };

    movementInterval.current = setInterval(() => {
      if (++index >= paths.length) {
        setPaths([]);
        cancelCurrentMovement();
        return;
      }

      const path = paths[index];
      if (!path) return;
      const [dx, dy] = [Math.sign(path.x - currentPath.x), Math.sign(path.y - currentPath.y)];

      if (dx === 1 && dy === 1) {
        goDownRight();
      } else if (dx === 1 && dy === -1) {
        goUpRight();
      } else if (dx === 1 && dy === 0) {
        goright();
      } else if (dx === -1 && dy === 1) {
        goDownLeft();
      } else if (dx === -1 && dy === -1) {
        goUpLeft();
      } else if (dx === -1 && dy === 0) {
        goleft();
      } else if (dx === 0 && dy === 1) {
        godown();
      } else if (dx === 0 && dy === -1) {
        goup();
      }
      currentPath = path;
      animateTileMoving(dx, dy);
      setPaths(paths.slice(index));
    }, animationSpeed);
  };

  const clickEvent = (x: number, y: number, click_type: 'GENERAL_CLICK' | 'SPECIAL_CLICK') => {
    const body = JSON.stringify({
      event: 'pointing',
      payload: {
        position: {
          x: x,
          y: y,
        },
        click_type,
      },
    });
    sendMessage(body);
  };

  /** Click Event Handler */
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = tileCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const [clickX, clickY] = [event.clientX - rect.left, event.clientY - rect.top];

    // Transform canvas coordinate to relative coordinate
    const [tileArrayX, tileArrayY] = [
      Math.floor(clickX / tileSize + tilePaddingWidth),
      Math.floor(clickY / tileSize + tilePaddingHeight),
    ];

    // Transform canvas coordinate to absolute coordinate
    const [tileX, tileY] = [Math.round(tileArrayX + startPoint.x), Math.round(tileArrayY + startPoint.y)];

    // Getting content of clicked tile
    const clickedTileContent = tiles[tileArrayY]?.[tileArrayX] ?? 'Out of bounds';
    setClickPosition(tileX, tileY, clickedTileContent);

    let clickType: 'GENERAL_CLICK' | 'SPECIAL_CLICK' = 'GENERAL_CLICK';
    if (event.buttons === 2) {
      clickType = 'SPECIAL_CLICK';
    }

    if (clickType === 'GENERAL_CLICK' && !(clickedTileContent?.includes('F') || clickedTileContent?.includes('C'))) {
      moveCursor(tileArrayX, tileArrayY);
    }
    clickEvent(tileX, tileY, clickType);
    return;
  };

  /**
   * Draw cursor
   * @param ctx CanvasRenderingContext2D
   * @param x x position
   * @param y y position
   */
  const drawCursor = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale: number = 1) => {
    const adjustedScale = (zoom / 3.5) * scale;
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(x + tileSize / 6 / scale, y + tileSize / 6 / scale);
    ctx.scale(adjustedScale, adjustedScale);
    ctx.fill(cachedVectorImages?.cursor as Path2D);
    ctx.restore();
  };

  const drawOtherUserCursors = () => {
    const otherCursorsCtx = otherCursorsRef.current?.getContext('2d');
    if (!otherCursorsCtx) return;
    otherCursorsCtx.clearRect(0, 0, windowWidth, windowHeight);
    cursors.forEach(cursor => {
      const x = cursor.x - cursorOriginX + tilePaddingWidth;
      const y = cursor.y - cursorOriginY + tilePaddingHeight;
      drawCursor(otherCursorsCtx, x * tileSize, y * tileSize, cursorColors[cursor.color]);
    });
  };

  /** Handing Websocket message */
  useEffect(() => {
    if (!message) return;
    try {
      const { event } = JSON.parse(message);
      switch (event) {
        default:
          break;
      }
    } catch (e) {
      console.error(e);
    }
  }, [message]);

  /**
   * Find path using A* algorithm avoiding flags and move cursor in 8 directions
   * @param startX x position of start point
   * @param startY y position of start point
   * @param targetX x position of target point
   * @param targetY y position of target point
   * */
  const findPathUsingAStar = (startX: number, startY: number, targetX: number, targetY: number) => {
    // Function to get neighbors of a node
    function getNeighbors(grid: (TileNode | null)[][], node: TileNode) {
      const neighbors = [];
      const directions = [
        [-1, 0], // left
        [0, -1], // up
        [0, 1], // down
        [1, 0], // right
        [-1, -1], // left-up
        [-1, 1], // left-down
        [1, -1], // right-up
        [1, 1], // right-down
      ]; // 8-directional neighbors
      for (const [dx, dy] of directions) {
        const [x, y] = [node.x + dx, node.y + dy];
        // Make sure the neighbor is within bounds and not an obstacle
        if (y >= 0 && y < grid.length && x >= 0 && x < grid[y].length && grid[y][x] !== null) {
          neighbors.push(grid[y][x]);
        }
      }
      return neighbors;
    }

    /** initialize tiles */
    const [start, target] = [new TileNode(startX, startY), new TileNode(targetX, targetY)];
    const grid = [...tiles.map(row => [...row.map(() => null)])] as (TileNode | null)[][];
    for (let i = 0; i < tiles.length; i++) {
      for (let j = 0; j < tiles[i].length; j++) {
        if (!tiles[i][j]?.includes('F') && !tiles[i][j]?.includes('C')) {
          grid[i][j] = new TileNode(j, i);
        } else {
          grid[i][j] = null;
        }
      }
    }

    /** initialize open and close list */
    let openList = [start];
    const closedList = [];
    start.g = 0;
    start.f = start.g + start.h;

    while (openList.length > 0) {
      const current = openList.reduce((a, b) => (a.f < b.f ? a : b));
      if (current.x === target.x && current.y === target.y) {
        const path = [];
        let temp = current;
        /** calculate distance from target */
        setLeftPaths({
          x: temp.x - startX,
          y: temp.y - startY,
        });
        while (temp) {
          path.unshift(temp);
          temp = temp.parent as TileNode;
        }
        return path;
      }
      openList = openList.filter(node => node !== current);
      closedList.push(current);

      /** Find neighbor nodes from current node. */
      const neighbors = getNeighbors(grid, current);
      for (const neighbor of neighbors) {
        if (closedList.includes(neighbor)) {
          continue;
        }

        const tempG = current.g + 1;
        if (!openList.includes(neighbor)) {
          openList.push(neighbor);
        } else if (tempG >= neighbor.g) {
          continue;
        }

        neighbor.parent = current;
        neighbor.g = tempG;
        const dx = Math.abs(neighbor.x - target.x);
        const dy = Math.abs(neighbor.y - target.y);
        const IsDiagonal = dx === dy ? Math.SQRT2 : 1;
        neighbor.h = IsDiagonal + Math.abs(neighbor.x - target.x) + Math.abs(neighbor.y - target.y);
        neighbor.f = neighbor.g + neighbor.h;
      }
    }
    return [];
  };

  /** start render */
  const render = () => {
    const tileCanvas = tileCanvasRef.current;
    const interactionCanvas = interactionCanvasRef.current;
    if (!tileCanvas || tileSize === 0 || !interactionCanvas) return;

    const tileCtx = tileCanvas.getContext('2d');
    const interactionCtx = interactionCanvas.getContext('2d');
    if (!tileCtx || !interactionCtx) return;

    // initialize interaction canvas
    interactionCtx.clearRect(0, 0, windowWidth, windowHeight);
    const borderPixel = 5 * zoom;
    const cursorCanvasX = (relativeX / paddingTiles) * tileSize;
    const cursorCanvasY = (relativeY / paddingTiles) * tileSize;
    const clickCanvasX = cursorCanvasX + (clickX - cursorOriginX) * tileSize;
    const clickCanvasY = cursorCanvasY + (clickY - cursorOriginY) * tileSize;
    const tileEdgeVector = new Path2D(`
      M0 0
      L${tileSize} 0
      L${tileSize} ${tileSize}
      L0 ${tileSize}
      L0 0
      `);
    const tileVector = new Path2D(`
      M${borderPixel} ${borderPixel}
      L${tileSize - borderPixel} ${borderPixel}
      L${tileSize - borderPixel} ${tileSize - borderPixel}
      L${borderPixel} ${tileSize - borderPixel}
      L${borderPixel} ${borderPixel}
      `);

    // setting cursor color
    const cursorColor = cursorColors[color];
    const compenX = cursorX - cursorOriginX - tilePaddingWidth - leftPaths.x;
    const compenY = cursorY - cursorOriginY - tilePaddingHeight - leftPaths.y;

    const innerGradientValues: [number, number, number, number] = [
      borderPixel,
      borderPixel,
      tileSize - borderPixel * 2,
      tileSize - borderPixel * 2,
    ];
    const outerGradientValues: [number, number, number, number] = [0, 0, tileSize, tileSize];

    const gradientObject = {
      inner: [
        tileCtx.createLinearGradient(...innerGradientValues),
        tileCtx.createLinearGradient(...innerGradientValues),
        tileCtx.createLinearGradient(...innerGradientValues),
      ],
      outer: [
        tileCtx.createLinearGradient(...outerGradientValues),
        tileCtx.createLinearGradient(...outerGradientValues),
        tileCtx.createLinearGradient(...outerGradientValues),
      ],
      flag: tileCtx.createLinearGradient(36.5, 212.5, 36.5, 259),
    };
    gradientObject.flag.addColorStop(0, '#E8E8E8');
    gradientObject.flag.addColorStop(1, 'transparent');

    gradientObject.inner.forEach((gradient, index) => {
      gradient.addColorStop(0, tileColors.inner[index][0]);
      gradient.addColorStop(1, tileColors.inner[index][1]);
    });

    gradientObject.outer.forEach((gradient, index) => {
      gradient.addColorStop(0, tileColors.outer[index][0]);
      gradient.addColorStop(0.4, tileColors.outer[index][0]);
      gradient.addColorStop(0.6, tileColors.outer[index][1]);
      gradient.addColorStop(1, tileColors.outer[index][1]);
    });
    // draw tiles
    tiles?.forEach((row, rowIndex) => {
      row?.forEach((content, colIndex) => {
        if (renderedTiles[rowIndex]?.[colIndex] === content) {
          return;
        }
        const [x, y] = [(colIndex - tilePaddingWidth) * tileSize, (rowIndex - tilePaddingHeight) * tileSize];
        if (x < -tileSize || y < -tileSize || x > windowWidth + tileSize || y > windowHeight + tileSize) return;

        tileCtx.save();
        tileCtx.translate(x, y);
        switch (content) {
          /** Locked tiles */
          case 'C0':
          case 'C1':
          case 'F00': /** red */
          case 'F01':
          case 'FRED0':
          case 'FRED1':
          case 'F10': /** yellow */
          case 'F11':
          case 'FYELLOW0':
          case 'FYELLOW1':
          case 'F20': /** blue */
          case 'F21':
          case 'FBLUE0':
          case 'FBLUE1':
          case 'F30': /** purple */
          case 'F31':
          case 'FPURPLE0':
          case 'FPURPLE1': {
            const isEven = content.slice(-1) === '0' ? 0 : 1;
            // draw outline only for special clickable tile
            if (
              Math.abs(rowIndex - relativeY) <= 1 &&
              Math.abs(colIndex - relativeX) <= 1 &&
              !(colIndex === relativeX && rowIndex === relativeY) &&
              content.includes('C')
            ) {
              drawCursor(interactionCtx, x, y, '#0000002f', 0.5);
              tileCtx.fillStyle = 'white';
            } else {
              // draw outline only for special clickable tile
              tileCtx.fillStyle = gradientObject.outer[isEven];
            }
            tileCtx.fill(tileEdgeVector);

            // draw inner tile
            tileCtx.fillStyle = gradientObject.inner[isEven];
            tileCtx.fill(tileVector);
            // draw flag when flag is on the tile
            if (content.includes('F')) {
              tileCtx.restore();
              tileCtx.save();
              tileCtx.translate(x + tileSize / 6, y + tileSize / 6);
              tileCtx.scale(zoom / 4.5, zoom / 4.5);

              /** flag color follows cursor color. */
              tileCtx.fillStyle = cursorColors[content.slice(1, -1).toLowerCase() as keyof typeof cursorColors];
              tileCtx.fill(cachedVectorImages?.flag.flag as Path2D);

              // draw pole
              tileCtx.fillStyle = gradientObject.flag;
              tileCtx.fill(cachedVectorImages?.flag.pole as Path2D);

              tileCtx.restore();
            }
            break;
          }
          /** Tile has been opend. */
          case 'O':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case 'B': {
            tileCtx.fillStyle = gradientObject.outer[2];
            tileCtx.fill(tileEdgeVector);

            tileCtx.fillStyle = gradientObject.inner[2];
            tileCtx.fill(tileVector);

            /** describe ash */
            if (content === 'B') {
              tileCtx.scale(zoom / 4, zoom / 4);

              tileCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
              tileCtx.fill(cachedVectorImages?.boom.inner as Path2D); // draw inner path

              tileCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
              tileCtx.fill(cachedVectorImages?.boom.outer as Path2D); // draw outer path
            }
            tileCtx.restore();

            /** describe number of neighbor bombs. */
            if (parseInt(content) > 0) {
              const index = parseInt(content) - 1;
              tileCtx.fillStyle = countColors[index];
              tileCtx.font = 50 * zoom + 'px LOTTERIACHAB';
              tileCtx.textAlign = 'center';
              tileCtx.textBaseline = 'middle';
              tileCtx.fillText(content, x + tileSize / 2, y + tileSize / 2);
            }
            break;
          }
          default:
            break;
        }
        tileCtx.restore();
      });
      /** Display the path in the middle to prevent it from appearing displaced */
      if (rowIndex === Math.floor((tiles.length * 3) / 10)) {
        // Draw my cursor
        drawCursor(interactionCtx, cursorCanvasX, cursorCanvasY, cursorColor);

        // Draw other users' cursor
        drawOtherUserCursors();

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
          interactionCtx.moveTo(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2); // 시작점

          paths.forEach(vector => {
            const [x, y] = [vector.x + compenX, vector.y + compenY];
            interactionCtx.lineTo(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
          });
          interactionCtx.stroke();
        }
        setRenderedTiles(tiles);
      }
    });
  };

  /** Render */
  useEffect(() => {
    if (loading) {
      // Set vector images
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
      return;
    }
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, loading, tileSize, cursorOriginX, cursorOriginY, startPoint, clickX, clickY, color, zoom]);

  useEffect(() => {
    if (cursors.length === 0) return;
    drawOtherUserCursors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursors]);

  return (
    <>
      {loading ? (
        <div className={S.loading}>
          <h1>Loading...</h1>
          <div className={`${tiles.length < 1 ? S.loadingBar : S.loadComplete}`} />
        </div>
      ) : (
        <div className={S.canvasContainer}>
          <canvas className={S.canvas} id="TileCanvas" ref={tileCanvasRef} width={windowWidth} height={windowHeight} />
          <canvas
            className={S.canvas}
            id="OtherCursors"
            ref={otherCursorsRef}
            width={windowWidth}
            height={windowHeight}
          />
          <canvas
            className={S.canvas}
            id="InteractionCanvas"
            ref={interactionCanvasRef}
            width={windowWidth}
            height={windowHeight}
            onClick={handleClick}
            onMouseDown={handleClick}
          />
        </div>
      )}
    </>
  );
};

export default CanvasRenderer;
