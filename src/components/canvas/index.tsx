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
const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  paddingTiles,
  tiles,
  tileSize,
  cursorOriginX,
  cursorOriginY,
  startPoint,
}) => {
  /** constants */
  const animationSpeed = 150;
  const tilePaddingWidth = ((paddingTiles - 1) * (cursorOriginX - startPoint.x)) / paddingTiles;
  const tilePaddingHeight = ((paddingTiles - 1) * (cursorOriginY - startPoint.y)) / paddingTiles;

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
    setColor,
    setPosition: setCusorPosition,
  } = useCursorStore();
  const { setPosition, x: clickX, y: clickY, setMovecost } = useClickStore();
  const { message, sendMessage, isOpen } = useWebSocketStore();

  /** references */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const movementInterval = useRef<NodeJS.Timeout | null>(null);

  /** states */
  const [vectors, setVectors] = useState<{ x: number; y: number }[]>([]);
  const [leftXVector, setLeftXVector] = useState<number>(0);
  const [leftYVector, setLeftYVector] = useState<number>(0);

  const cancelCurrentMovement = () => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
  };

  useEffect(() => {
    return () => cancelCurrentMovement();
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
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
    setPosition(tileX, tileY, clickedTileContent);

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
    movementInterval.current = setInterval(() => {
      if (index++ >= paths.length) {
        setVectors([]);
        cancelCurrentMovement();
      }
      const path = paths[index];
      if (!path) return;
      if (currentPath.x < path.x && currentPath.y < path.y) {
        goDownRight();
      } else if (currentPath.x < path.x && currentPath.y > path.y) {
        goUpRight();
      } else if (currentPath.x < path.x && currentPath.y === path.y) {
        goright();
      } else if (currentPath.x > path.x && currentPath.y < path.y) {
        goDownLeft();
      } else if (currentPath.x > path.x && currentPath.y > path.y) {
        goUpLeft();
      } else if (currentPath.x > path.x && currentPath.y === path.y) {
        goleft();
      } else if (currentPath.x === path.x && currentPath.y < path.y) {
        godown();
      } else if (currentPath.x === path.x && currentPath.y > path.y) {
        goup();
      }
      setVectors(paths.slice(index));
      currentPath = path;
    }, animationSpeed);
    // console.log('paths', paths.map(path => `(${path.x} ${path.y})`).join(' -> '));
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
    const path = new Path2D(` 
      M12.2719 13.6437 
      C11.4141 6.37712 19.6676 1.61197 25.5317 5.9881 
      L165.217 110.229 
      C171.554 114.958 168.358 125.029 160.453 125.238 
      L100.228 126.83 
      C91.7695 127.053 83.9984 131.54 79.5756 138.753 
      L48.0844 190.114 
      C43.9511 196.855 33.6313 194.587 32.7043 186.735 
      L12.2719 13.6437 Z`);
    ctx.save();
    ctx.translate(x + tileSize / 6 / scale, y + tileSize / 6 / scale);
    ctx.scale(adjustedScale, adjustedScale);
    ctx.fill(path);
    ctx.restore();
  };

  /** 웹 소켓 메시지 처리 */
  useEffect(() => {
    if (!message) return;
    try {
      const { event, payload } = JSON.parse(message);
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
        if (tiles[i][j] !== 'F') {
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
        let xcount = 0;
        let ycount = 0;
        while (temp) {
          path.unshift(temp);
          /** 목표와의 거리 계산 */
          if (temp?.parent) {
            xcount += temp.x - temp.parent.x;
            ycount += temp.y - temp.parent.y;
          }
          temp = temp.parent as TileNode;
        }
        setLeftXVector(xcount);
        setLeftYVector(ycount);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tileSize === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    const borderPixel = 5 * zoom;
    const lineWidth = 5 * zoom;

    // 타일 그리기
    tiles?.forEach((row, rowIndex) => {
      row?.forEach((content, colIndex) => {
        // if (renderedTiles && renderedTiles[rowIndex][colIndex] === content) return;
        const x = (colIndex - tilePaddingWidth) * tileSize;
        const y = (rowIndex - tilePaddingHeight) * tileSize;
        const innerGradient = ctx.createLinearGradient(
          x + borderPixel,
          y + borderPixel,
          x + tileSize - borderPixel * 2,
          y + tileSize - borderPixel * 2,
        );
        const outerGradient = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);

        switch (content) {
          /** 잠긴 타일 */
          case 'C':
          case 'F':
            if ((rowIndex + colIndex - startPoint.x - startPoint.y) % 2 === 0) {
              // 안쪽 타일
              innerGradient.addColorStop(0, '#8fe340');
              innerGradient.addColorStop(1, '#A4E863');

              // 바깥 타일
              outerGradient.addColorStop(0, '#A8EC67');
              outerGradient.addColorStop(0.4, '#A8EC67');
              outerGradient.addColorStop(0.6, '#81D92C');
              outerGradient.addColorStop(1, '#81D92C');
            } else {
              // 안쪽 타일
              innerGradient.addColorStop(0, '#62B628');
              innerGradient.addColorStop(1, '#71C637');

              // 바깥 타일
              outerGradient.addColorStop(0, '#74C63C');
              outerGradient.addColorStop(0.4, '#74C63C');
              outerGradient.addColorStop(0.6, '#5BB31F');
              outerGradient.addColorStop(1, '#5BB31F');
            }
            // 바깥 타일 먼저 그리기
            ctx.fillStyle = outerGradient;
            ctx.fillRect(x, y, tileSize, tileSize);

            // 안쪽 타일 그리기
            ctx.fillStyle = innerGradient;
            ctx.fillRect(x + borderPixel, y + borderPixel, tileSize - borderPixel * 2, tileSize - borderPixel * 2); // Adjust dimensions for inner rect

            // 커서 색상 설정
            let cursorColor = '#FF4D00';
            if (color === 'blue') cursorColor = '#0094FF';
            if (color === 'yellow') cursorColor = '#F0C800';
            if (color === 'purple') cursorColor = '#BC3FDC';
            // 깃발이 꽂혀있을 경우에는 깃발 그리기
            if (content === 'F') {
              const pathData1 = `
                M219.428 109.389 
                C226.519 114.964 223.188 126.337 214.21 127.205 
                L79.8702 140.188 
                L115.929 28.0267 
                L219.428 109.389 Z
              `;

              const pathData2 = `
                M79.9801 8.51632 
                C75.8798 9.72627 73.972 13.8825 73.0599 18.0591 
                L25.8244 234.356 
                C30.5707 235.401 36.0988 236 42 236 
                C45.1362 236 48.1671 235.831 51.0311 235.515 
                L116.451 28.5289 
                C117.573 24.9766 117.96 21.0358 115.39 18.3387 
                C112.87 15.6942 108.055 12.4097 98.862 9.69397 
                C89.7757 7.00975 83.7643 7.39963 79.9801 8.51632 Z
              `;

              const path1 = new Path2D(pathData1);
              const path2 = new Path2D(pathData2);

              ctx.save();
              ctx.translate(x + tileSize / 6, y + tileSize / 6);
              const scale = zoom / 4.5;
              ctx.scale(scale, scale);

              /** 깃발 자체 색상은 커서 색상을 따라감 */
              ctx.fillStyle = cursorColor;
              ctx.fill(path1);

              // 깃대 그리기
              const gradient = ctx.createLinearGradient(36.5, 212.5, 36.5, 259);
              gradient.addColorStop(0, '#E8E8E8');
              gradient.addColorStop(1, 'transparent');
              ctx.fillStyle = gradient;
              ctx.fill(path2);

              ctx.restore();
            }
            // 특수 클릭이 가능한 타일만 외곽선 그리기
            if (
              Math.abs(rowIndex - (cursorOriginY - startPoint.y)) <= 1 &&
              Math.abs(colIndex - (cursorOriginX - startPoint.x)) <= 1 &&
              !(colIndex === cursorOriginX - startPoint.x && rowIndex === cursorOriginY - startPoint.y) &&
              content === 'C'
            ) {
              ctx.strokeStyle = 'white';
              ctx.lineWidth = lineWidth;
              ctx.strokeRect(x + lineWidth / 2, y + lineWidth / 2, tileSize - lineWidth, tileSize - lineWidth);
              /** 커서 모양 그리기 */
              drawCursor(ctx, x, y, '#0000002f', 0.5);
            }
            break;
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
          case 'B':
            ctx.lineWidth = 1;
            innerGradient.addColorStop(0, '#F1FAD1');
            innerGradient.addColorStop(1, '#E9F6B9');

            outerGradient.addColorStop(0, '#E9FAAA');
            outerGradient.addColorStop(0.4, '#E9FAAA');
            outerGradient.addColorStop(0.6, '#F5FDD8');
            outerGradient.addColorStop(1, '#F5FDD8');

            ctx.fillStyle = outerGradient;
            ctx.fillRect(x, y, tileSize, tileSize);

            ctx.fillStyle = innerGradient;
            ctx.fillRect(x + borderPixel, y + borderPixel, tileSize - borderPixel * 2, tileSize - borderPixel * 2); // Adjust dimensions for inner rect

            /** 글자 새기기 */
            if (parseInt(content) > 0) {
              const colors = [
                '#0059B280',
                '#0095B280',
                '#00B20080',
                '#77B20080',
                '#B2950080',
                '#B24A0080',
                '#B2000080',
                '#7700B280',
              ];
              const index = parseInt(content) - 1;
              ctx.fillStyle = colors[index];
              ctx.font = 50 * zoom + 'px LOTTERIACHAB';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText((index + 1).toString(), x + tileSize / 2, y + tileSize / 2);
            }

            /** 터짐 표현 */
            if (content === 'B') {
              const pathData1 = `
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
              `;

              // 두 번째 경로 데이터 (SVG Path2)
              const pathData2 = `
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
              `;

              // Path2D 객체로 변환
              const path1 = new Path2D(pathData1);
              const path2 = new Path2D(pathData2);
              ctx.save();
              ctx.translate(x, y);
              const scale = zoom / 3.5;
              ctx.scale(scale, scale);

              ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // 첫 번째 경로 색상
              ctx.fill(path1);

              // 두 번째 경로 그리기
              ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // 두 번째 경로 색상
              ctx.fill(path2);

              ctx.restore();
            }
            break;
          default:
            break;
        }

        /** 이동 경로 표현 */
        /** 오차 거리 + 경로 위치 조정 */
        const vectorTile = vectors.filter(
          vector =>
            vector.x === leftXVector + colIndex + cursorOriginX - cursorX &&
            vector.y === leftYVector + rowIndex + cursorOriginY - cursorY,
        );

        if (vectorTile.length > 0) {
          ctx.beginPath();
          ctx.fillStyle = 'black';
          ctx.arc(x + tileSize / 2, y + tileSize / 2, tileSize / 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

    // 커서 표시
    let cursorColor = '#FF4D00';
    if (color === 'blue') cursorColor = '#0094FF';
    if (color === 'yellow') cursorColor = '#F0C800';
    if (color === 'purple') cursorColor = '#BC3FDC';
    const cursorCanvasX = ((cursorOriginX - startPoint.x) / paddingTiles) * tileSize;
    const cursorCanvasY = ((cursorOriginY - startPoint.y) / paddingTiles) * tileSize;
    drawCursor(ctx, cursorCanvasX, cursorCanvasY, cursorColor);

    // 클릭한 타일 표시
    const clickCanvasX = cursorCanvasX + (clickX - cursorOriginX) * tileSize;
    const clickCanvasY = cursorCanvasY + (clickY - cursorOriginY) * tileSize;

    ctx.beginPath();
    ctx.strokeStyle = cursorColor; // 테두리 색상
    ctx.lineWidth = lineWidth; // 테두리 두께
    ctx.strokeRect(
      clickCanvasX + lineWidth / 2,
      clickCanvasY + lineWidth / 2,
      tileSize - lineWidth,
      tileSize - lineWidth,
    );
    // 테두리 그리기
    ctx.closePath();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, tileSize, cursorOriginX, cursorOriginY, startPoint, clickX, clickY, color]);

  return (
    <canvas
      className={S.canvas}
      ref={canvasRef}
      width={windowWidth}
      height={windowHeight}
      style={{ border: '1px solid black' }}
      onClick={handleClick}
    />
  );
};

export default CanvasRenderer;
