'use client';
import S from './style.module.scss';
import React, { useRef, useEffect, useState } from 'react';

import useScreenSize from '@/hooks/useScreenSize';
import useClickStore from '@/store/clickStore';
import { useCursorStore } from '@/store/cursorStore';
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
  const tilePaddingWidth = ((paddingTiles - 1) * (cursorOriginX - startPoint.x)) / paddingTiles;
  const tilePaddingHeight = ((paddingTiles - 1) * (cursorOriginY - startPoint.y)) / paddingTiles;
  const tileColors = {
    locked: {
      inner: [
        ['#8fe340', '#A4E863'],
        ['#62B628', '#71C637'],
      ],
      outer: [
        ['#A8EC67', '#81D92C'],
        ['#74C63C', '#5BB31F'],
      ],
    },
    open: {
      inner: ['#F1FAD1', '#E9F6B9'],
      outer: ['#E9FAAA', '#F5FDD8'],
    },
  };
  const flagPaths = [
    `
      M219.428 109.389 
      C226.519 114.964 223.188 126.337 214.21 127.205 
      L79.8702 140.188 
      L115.929 28.0267 
      L219.428 109.389 Z
    `,
    `
      M79.9801 8.51632 
      C75.8798 9.72627 73.972 13.8825 73.0599 18.0591 
      L25.8244 234.356 
      C30.5707 235.401 36.0988 236 42 236 
      C45.1362 236 48.1671 235.831 51.0311 235.515 
      L116.451 28.5289 
      C117.573 24.9766 117.96 21.0358 115.39 18.3387 
      C112.87 15.6942 108.055 12.4097 98.862 9.69397 
      C89.7757 7.00975 83.7643 7.39963 79.9801 8.51632 Z
    `,
  ];
  const boomPaths = [
    `
      M77.85 145.025
      L0.899994 54.5752
      L103.5 92.3752
      L117 0.575195
      L164.25 74.8252
      L219.6 38.3752
      L202.05 103.175
      L276.3 108.575
      L219.6 153.125
      L287.1 223.325
      L198 230.075
      L177.75 312.425
      L130.5 236.825
      L67.05 284.075
      L75.15 196.325
      L11.7 177.425
      L77.85 145.025
    `,
    `
      M67.05 104.525
      L104.85 150.425
      L71.1 169.325
      L104.85 178.775
      L100.8 226.025
      L133.2 200.375
      L158.85 239.525
      L168.3 196.325
      L218.25 192.275
      L181.8 154.475
      L212.85 131.525
      L171 128.825
      L181.8 93.7251
      L152.1 113.975
      L126.45 73.4751
      L118.35 122.075
      L67.05 104.525
    `,
  ];

  const countColors = [
    '#0059B280',
    '#0095B280',
    '#00B20080',
    '#77B20080',
    '#B2950080',
    '#B24A0080',
    '#B2000080',
    '#7700B280',
  ];
  const cursorColors = { red: '#FF4D00', blue: '#0094FF', yellow: '#F0C800', purple: '#BC3FDC' };

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
  const { message } = useWebSocketStore();

  /** references */
  const tileCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const movementInterval = useRef<NodeJS.Timeout | null>(null);

  /** states */
  const [loading, setLoading] = useState<boolean>(true);
  const [paths, setPaths] = useState<Path[]>([]);
  const [leftXPaths, setLeftXPaths] = useState<number>(0);
  const [leftYPaths, setLeftYPaths] = useState<number>(0);
  const [renderedTiles, setRenderedTiles] = useState<string[][]>([]);
  const [vectorImages, setVectorImages] = useState<VectorImages>();

  const cancelCurrentMovement = () => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
  };

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

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = tileCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // 캔버스 좌표를 상대 좌표로 변환
    const tileArrayX = Math.floor(clickX / tileSize + tilePaddingWidth);
    const tileArrayY = Math.floor(clickY / tileSize + tilePaddingHeight);

    // 캔버스 좌표를 절대 좌표로 변환
    const tileX = Math.round(tileArrayX + startPoint.x);
    const tileY = Math.round(tileArrayY + startPoint.y);

    /** 추후 웹 소켓 통신 추가 예정 */
    // const body = JSON.stringify({
    //  event: 'pointing',
    //  payload: {
    //  position: {
    //    x: tileX, y: tileY
    //  },
    //    click_type:"GENERAL_CLICK"
    //  });
    // sendMessage(body);

    // 클릭한 타일의 내용 가져오기
    const clickedTileContent = tiles[tileArrayY]?.[tileArrayX] ?? 'Out of bounds';
    setClickPosition(tileX, tileY, clickedTileContent);

    if (event.buttons === 2) {
      console.log('right');
      return;
    }
    /** 기존 이동 멈춤 */
    cancelCurrentMovement();

    /** astar를 사용한 길 찾기 */
    const paths = findPathUsingAStar(
      cursorOriginX - startPoint.x,
      cursorOriginY - startPoint.y,
      tileArrayX,
      tileArrayY,
    );

    /** 비용 계산 (자신의 위치는 제외) */
    setMovecost(paths.length - 1);

    /** 8방향 이동 */
    let index = 0;
    let currentPath = paths[index];
    if (currentPath?.x === undefined || currentPath?.y === undefined) return;
    setCusorPosition(tileArrayX + startPoint.x, tileArrayY + startPoint.y);
    const animateTile = (dx: number, dy: number) => {
      let countFrame = 0.1;
      const animation = setInterval(() => {
        if (!tileCanvasRef.current || !interactionCanvasRef.current) return;
        const translateX = dx * (tileSize - countFrame * tileSize);
        const translateY = dy * (tileSize - countFrame * tileSize);
        tileCanvasRef.current.style.transform = `translate(${translateX}px, ${translateY}px)`;
        interactionCanvasRef.current.style.transform = `translate(${translateX}px, ${translateY}px)`;

        if (countFrame >= 1) {
          clearInterval(animation);
          tileCanvasRef.current.style.transform = '';
          interactionCanvasRef.current.style.transform = '';
          countFrame = 1;
        }
        countFrame += 0.1;
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

      const dx = Math.sign(path.x - currentPath.x);
      const dy = Math.sign(path.y - currentPath.y);

      if (dx === 1 && dy === 1) {
        goDownRight();
        animateTile(1, 1);
      } else if (dx === 1 && dy === -1) {
        goUpRight();
        animateTile(1, -1);
      } else if (dx === 1 && dy === 0) {
        goright();
        animateTile(1, 0);
      } else if (dx === -1 && dy === 1) {
        goDownLeft();
        animateTile(-1, 1);
      } else if (dx === -1 && dy === -1) {
        goUpLeft();
        animateTile(-1, -1);
      } else if (dx === -1 && dy === 0) {
        goleft();
        animateTile(-1, 0);
      } else if (dx === 0 && dy === 1) {
        godown();
        animateTile(0, 1);
      } else if (dx === 0 && dy === -1) {
        goup();
        animateTile(0, -1);
      }

      setPaths(paths.slice(index));
      currentPath = path;
    }, animationSpeed);
  };

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
      const x = node.x + dx;
      const y = node.y + dy;

      // Make sure the neighbor is within bounds and not an obstacle
      if (y >= 0 && y < grid.length && x >= 0 && x < grid[y].length && grid[y][x] !== null) {
        neighbors.push(grid[y][x]);
      }
    }

    return neighbors;
  }

  /** 커서 그리기 */
  const drawCursor = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, scale: number = 1) => {
    const adjustedScale = (zoom / 3.5) * scale;
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(x + tileSize / 6 / scale, y + tileSize / 6 / scale);
    ctx.scale(adjustedScale, adjustedScale);
    ctx.fill(vectorImages?.cursor as Path2D);
    ctx.restore();
  };

  /** 웹 소켓 메시지 처리 */
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

  /** Flag를 피해서 astar 알고리즘으로 길찾고 커서를 8방향으로 이동하기 */
  const findPathUsingAStar = (startX: number, startY: number, targetX: number, targetY: number) => {
    /** initialize tiles */
    const start = new TileNode(startX, startY);
    const target = new TileNode(targetX, targetY);
    const grid = [...tiles.map(row => [...row.map(() => null)])] as (TileNode | null)[][];
    for (let i = 0; i < tiles.length; i++) {
      for (let j = 0; j < tiles[i].length; j++) {
        if (tiles[i][j] !== 'F0' && tiles[i][j] !== 'F1') {
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
        /** 목표와의 거리 계산 */
        setLeftXPaths(temp.x - startX);
        setLeftYPaths(temp.y - startY);
        while (temp) {
          path.unshift(temp);
          temp = temp.parent as TileNode;
        }
        return path;
      }
      openList = openList.filter(node => node !== current);
      closedList.push(current);

      /** 주변 노드 탐색 */
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

  const render = () => {
    if (loading) {
      // set vector images
      const cursorVector = new Path2D(` 
      M12.2719 13.6437 
      C11.4141 6.37712 19.6676 1.61197 25.5317 5.9881 
      L165.217 110.229 
      C171.554 114.958 168.358 125.029 160.453 125.238 
      L100.228 126.83 
      C91.7695 127.053 83.9984 131.54 79.5756 138.753 
      L48.0844 190.114 
      C43.9511 196.855 33.6313 194.587 32.7043 186.735 
      L12.2719 13.6437 Z`);
      const flagVector = {
        flag: new Path2D(flagPaths[0]),
        pole: new Path2D(flagPaths[1]),
      };
      const boomVector = {
        inner: new Path2D(boomPaths[0]),
        outer: new Path2D(boomPaths[1]),
      };
      setVectorImages({ cursor: cursorVector, flag: flagVector, boom: boomVector });

      setTimeout(() => {
        setLoading(false);
      }, 500);
      return;
    }
    const tileCanvas = tileCanvasRef.current;
    const interactionCanvas = interactionCanvasRef.current;
    if (!tileCanvas || tileSize === 0 || !interactionCanvas) return;

    const tileCtx = tileCanvas.getContext('2d');
    const interactionCtx = interactionCanvas.getContext('2d');
    if (!tileCtx || !interactionCtx) return;

    // 상호 작용 캔버스 초기화
    interactionCtx.clearRect(0, 0, windowWidth, windowHeight);
    const borderPixel = 5 * zoom;
    const cursorCanvasX = ((cursorOriginX - startPoint.x) / paddingTiles) * tileSize;
    const cursorCanvasY = ((cursorOriginY - startPoint.y) / paddingTiles) * tileSize;
    const clickCanvasX = cursorCanvasX + (clickX - cursorOriginX) * tileSize;
    const clickCanvasY = cursorCanvasY + (clickY - cursorOriginY) * tileSize;
    const boomScale = zoom / 3.5;

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

    const flagGradient = tileCtx.createLinearGradient(36.5, 212.5, 36.5, 259);
    flagGradient.addColorStop(0, '#E8E8E8');
    flagGradient.addColorStop(1, 'transparent');

    // 커서 색상 설정
    const cursorColor = cursorColors[color];

    const compenX = cursorX - cursorOriginX - tilePaddingWidth - leftXPaths;
    const compenY = cursorY - cursorOriginY - tilePaddingHeight - leftYPaths;

    const innerGradientValues: [number, number, number, number] = [
      borderPixel,
      borderPixel,
      tileSize - borderPixel * 2,
      tileSize - borderPixel * 2,
    ];

    const outerGradientValues: [number, number, number, number] = [0, 0, tileSize, tileSize];

    const innerClosed0Gradient = tileCtx.createLinearGradient(...innerGradientValues);
    const innerClosed1Gradient = tileCtx.createLinearGradient(...innerGradientValues);
    const innerOpenGradient = tileCtx.createLinearGradient(...innerGradientValues);
    const lockedInner = tileColors.locked.inner;
    const openInner = tileColors.open.inner;

    innerClosed0Gradient.addColorStop(0, lockedInner[0][0]);
    innerClosed0Gradient.addColorStop(1, lockedInner[0][1]);
    innerClosed1Gradient.addColorStop(0, lockedInner[1][0]);
    innerClosed1Gradient.addColorStop(1, lockedInner[1][1]);
    innerOpenGradient.addColorStop(0, openInner[0]);
    innerOpenGradient.addColorStop(1, openInner[1]);

    const outerClosed0Gradient = tileCtx.createLinearGradient(...outerGradientValues);
    const outerClosed1Gradient = tileCtx.createLinearGradient(...outerGradientValues);
    const outerOpenGradient = tileCtx.createLinearGradient(...outerGradientValues);
    const lockedOuter = tileColors.locked.outer;
    const openOuter = tileColors.open.outer;
    outerClosed0Gradient.addColorStop(0, lockedOuter[0][0]);
    outerClosed0Gradient.addColorStop(0.4, lockedOuter[0][0]);
    outerClosed0Gradient.addColorStop(0.6, lockedOuter[0][1]);
    outerClosed0Gradient.addColorStop(1, lockedOuter[0][1]);
    outerClosed1Gradient.addColorStop(0, lockedOuter[1][0]);
    outerClosed1Gradient.addColorStop(0.4, lockedOuter[1][0]);
    outerClosed1Gradient.addColorStop(0.6, lockedOuter[1][1]);
    outerClosed1Gradient.addColorStop(1, lockedOuter[1][1]);
    outerOpenGradient.addColorStop(0, openOuter[0]);
    outerOpenGradient.addColorStop(0.4, openOuter[0]);
    outerOpenGradient.addColorStop(0.6, openOuter[1]);
    outerOpenGradient.addColorStop(1, openOuter[1]);
    // 타일 그리기
    tiles?.forEach((row, rowIndex) => {
      row?.forEach((content, colIndex) => {
        if (renderedTiles[rowIndex]?.[colIndex] === content) {
          return;
        }
        const x = (colIndex - tilePaddingWidth) * tileSize;
        const y = (rowIndex - tilePaddingHeight) * tileSize;
        if (x < -tileSize || y < -tileSize || x > windowWidth + tileSize || y > windowHeight + tileSize) return;

        tileCtx.save();
        tileCtx.translate(x, y);
        switch (content) {
          /** 잠긴 타일 */
          case 'C0':
          case 'C1':
          case 'F0':
          case 'F1': {
            const isEven = content[1] === '0';

            // 특수 클릭이 가능한 타일만 외곽선 그리기
            if (
              Math.abs(rowIndex - (cursorOriginY - startPoint.y)) <= 1 &&
              Math.abs(colIndex - (cursorOriginX - startPoint.x)) <= 1 &&
              !(colIndex === cursorOriginX - startPoint.x && rowIndex === cursorOriginY - startPoint.y) &&
              (content === 'C0' || content === 'C1')
            ) {
              tileCtx.strokeStyle = 'white';
              tileCtx.lineWidth = borderPixel;
              tileCtx.stroke(tileEdgeVector);
              /** 커서 모양 그리기 */
              drawCursor(tileCtx, x, y, '#0000002f', 0.5);
            } else {
              // 바깥 타일 먼저 그리기
              tileCtx.fillStyle = isEven ? outerClosed1Gradient : outerClosed0Gradient;
              tileCtx.fill(tileEdgeVector);
            }

            // 안쪽 타일 그리기
            tileCtx.fillStyle = isEven ? innerClosed1Gradient : innerClosed0Gradient;
            tileCtx.fill(tileVector);
            // 깃발이 꽂혀있을 경우에는 깃발 그리기
            if (content.includes('F')) {
              tileCtx.restore();
              tileCtx.save();
              tileCtx.translate(x + tileSize / 6, y + tileSize / 6);
              const scale = zoom / 4.5;
              tileCtx.scale(scale, scale);

              /** 깃발 자체 색상은 커서 색상을 따라감 */
              tileCtx.fillStyle = cursorColor;
              tileCtx.fill(vectorImages?.flag.flag as Path2D);

              // 깃대 그리기
              tileCtx.fillStyle = flagGradient;
              tileCtx.fill(vectorImages?.flag.pole as Path2D);

              tileCtx.restore();
            }
            break;
          }
          /** 열린 타일 */
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
            tileCtx.fillStyle = outerOpenGradient;
            tileCtx.fill(tileEdgeVector);

            tileCtx.fillStyle = innerOpenGradient;
            tileCtx.fill(tileVector);

            /** 터짐 표현 */
            if (content === 'B') {
              // Path2D 객체로 변환
              tileCtx.scale(boomScale, boomScale);

              tileCtx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // 첫 번째 경로 색상
              tileCtx.fill(vectorImages?.boom.inner as Path2D); // 첫 번째 경로 그리기

              // 두 번째 경로 그리기
              tileCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // 두 번째 경로 색상
              tileCtx.fill(vectorImages?.boom.outer as Path2D); // 두 번째 경로 그리기
            }
            tileCtx.restore();

            /** 글자 새기기 */
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
      if (rowIndex === Math.floor(tiles.length / 3)) {
        // 다른 사람 커서 그리기

        // 내 커서 그리기
        drawCursor(interactionCtx, cursorCanvasX, cursorCanvasY, cursorColor);

        // 클릭한 타일을 테두리로 표시하기
        interactionCtx.beginPath();
        interactionCtx.strokeStyle = cursorColor; // 테두리 색상
        interactionCtx.lineWidth = borderPixel; // 테두리 두께
        interactionCtx.strokeRect(
          clickCanvasX + borderPixel / 2,
          clickCanvasY + borderPixel / 2,
          tileSize - borderPixel,
          tileSize - borderPixel,
        );
        interactionCtx.closePath();
        // 이동경로 그리기
        if (paths.length > 0) {
          interactionCtx.beginPath();
          interactionCtx.strokeStyle = 'black';
          interactionCtx.lineWidth = tileSize / 6;
          const x = paths[0].x + compenX;
          const y = paths[0].y + compenY;
          interactionCtx.moveTo(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2); // 시작점

          paths.forEach(vector => {
            const x = vector.x + compenX;
            const y = vector.y + compenY;
            interactionCtx.lineTo(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
          });
          interactionCtx.stroke();
        }
        setRenderedTiles(tiles);
      }
    });
  };

  /** 렌더링 */
  useEffect(() => {
    if (canvasContainerRef.current) {
      canvasContainerRef.current.style.setProperty('$tile-size', `${tileSize}px`);
    }
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, loading, tileSize, cursorOriginX, cursorOriginY, startPoint, clickX, clickY, color]);

  return (
    <>
      {loading ? (
        <div className={S.loading}>
          <h1>Loading...</h1>
          <div className={`${tiles.length < 1 ? S.loadingBar : S.loadComplete}`} />
        </div>
      ) : (
        <div ref={canvasContainerRef} className={S.canvasContainer}>
          <canvas
            className={`${S.canvas}`}
            id="TileCanvas"
            ref={tileCanvasRef}
            width={windowWidth}
            height={windowHeight}
            style={{ border: '1px solid black' }}
            onClick={handleClick}
            onMouseDown={handleClick}
          />
          <canvas
            className={`${S.canvas} `}
            id="InteractionCanvas"
            ref={interactionCanvasRef}
            width={windowWidth}
            height={windowHeight}
            style={{ border: '1px solid black' }}
            onClick={handleClick}
            onMouseDown={handleClick}
          />
        </div>
      )}
    </>
  );
};

export default CanvasRenderer;
