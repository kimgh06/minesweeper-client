import useScreenSize from '@/hooks/useScreenSize';
import useClickStore from '@/store/clickStore';
import useCursorStore from '@/store/cursorStore';
import useWebSocketStore from '@/store/websocketStore';
import React, { useRef, useEffect, useState } from 'react';

class Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;

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
  cursorX: number;
  cursorY: number;
  paddingTiles: number;
  startPoint: { x: number; y: number };
}
const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  paddingTiles,
  tiles,
  tileSize,
  cursorX,
  cursorY,
  startPoint,
}) => {
  const animationSpeed = 500;
  const tilePaddingWidth = ((paddingTiles - 1) * (cursorX - startPoint.x)) / paddingTiles;
  const tilePaddingHeight = ((paddingTiles - 1) * (cursorY - startPoint.y)) / paddingTiles;
  const { message, sendMessage, isOpen } = useWebSocketStore();
  const borderPixel = 5;
  const movementInterval = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderedTiles, setRenderedTiles] = useState<string[][]>();
  const { setPosition, x: clickX, y: clickY, setMovecost } = useClickStore();
  const { godown, goleft, goright, goup } = useCursorStore();

  const { windowHeight, windowWidth } = useScreenSize();
  const cancelCurrentMovement = () => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
  };
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // 캔버스 좌표를 배열 좌표로 변환
    const tileArrayX = Math.floor(clickX / tileSize + tilePaddingWidth);
    const tileArrayY = Math.floor(clickY / tileSize + tilePaddingHeight);

    // 캔버스 좌표를 실제 좌표로 변환
    const tileX = Math.round(tileArrayX + startPoint.x);
    const tileY = Math.round(tileArrayY + startPoint.y);

    /** 추후 웹 소켓 통신 추가 예정 */

    // 클릭한 타일의 내용 가져오기
    const clickedTileContent = tiles[tileArrayY]?.[tileArrayX] ?? 'Out of bounds';
    setPosition(tileX, tileY, clickedTileContent);

    /** 기존 이동 멈춤 */
    cancelCurrentMovement();
    /** astar를 사용한 길 찾기 */
    const paths = findPathUsingAStar(cursorX - startPoint.x, cursorY - startPoint.y, tileArrayX, tileArrayY);

    /** 8방향 이동 */
    setMovecost(paths.length);
    let currentPath = paths[0];
    let index = 1;
    if (currentPath?.x === undefined || currentPath?.y === undefined) return;
    movementInterval.current = setInterval(() => {
      const path = paths[index++];
      if (!path) return;
      if (currentPath.x < path.x && currentPath.y < path.y) {
        goright();
        setTimeout(() => {
          godown();
        }, 1);
      } else if (currentPath.x < path.x && currentPath.y > path.y) {
        goup();
        setTimeout(() => {
          goright();
        }, 1);
      } else if (currentPath.x < path.x && currentPath.y === path.y) {
        goright();
      } else if (currentPath.x > path.x && currentPath.y < path.y) {
        goleft();
        setTimeout(() => {
          godown();
        }, 1);
      } else if (currentPath.x > path.x && currentPath.y > path.y) {
        goup();
        setTimeout(() => {
          goleft();
        }, 1);
      } else if (currentPath.x > path.x && currentPath.y === path.y) {
        goleft();
      } else if (currentPath.x === path.x && currentPath.y < path.y) {
        godown();
      } else if (currentPath.x === path.x && currentPath.y > path.y) {
        goup();
      }
      currentPath = path;
      if (index >= paths.length) {
        cancelCurrentMovement();
      }
    }, animationSpeed);
    // console.log('paths', paths.map(path => `(${path.x} ${path.y})`).join(' -> '));
  };

  // Function to get neighbors of a node
  function getNeighbors(grid: (Node | null)[][], node: Node) {
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

  useEffect(() => {
    return () => cancelCurrentMovement();
  }, []);

  useEffect(() => {
    if (!message) return;
    try {
      const { event, payload } = JSON.parse(message);
    } catch (e) {
      console.error(e);
    }
  }, [message]);

  /** Flag를 피해서 astar 알고리즘으로 길찾고 커서를 8방향으로 이동하기 */
  const findPathUsingAStar = (startX: number, startY: number, targetX: number, targetY: number) => {
    /** initialize tiles */
    const start = new Node(startX, startY);
    const target = new Node(targetX, targetY);
    const grid = [...tiles.map(row => [...row.map(() => null)])] as (Node | null)[][];
    for (let i = 0; i < tiles.length; i++) {
      for (let j = 0; j < tiles[i].length; j++) {
        if (tiles[i][j] !== 'F') {
          grid[i][j] = new Node(j, i);
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
        while (temp) {
          path.unshift(temp);
          temp = temp.parent as Node;
        }
        return path;
      }

      openList = openList.filter(node => node !== current);
      closedList.push(current);

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
        const IsDiagonal = dx === 1 && dy === 1 ? 0.5 : 0;
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

    // 타일 그리기
    tiles?.forEach((row, rowIndex) => {
      row?.forEach((content, colIndex) => {
        // if (renderedTiles && renderedTiles[rowIndex][colIndex] === content) return;
        const x = (colIndex - tilePaddingWidth) * tileSize;
        const y = (rowIndex - tilePaddingHeight) * tileSize;

        if (content === 'C' || content === 'F') {
          const innerGradient = ctx.createLinearGradient(
            x + borderPixel,
            y + borderPixel,
            x + tileSize - borderPixel * 2,
            y + tileSize - borderPixel * 2,
          );
          const outerGradient = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
          if ((rowIndex + colIndex - startPoint.x - startPoint.y) % 2 === 0) {
            innerGradient.addColorStop(0, '#8fe340');
            innerGradient.addColorStop(1, '#A4E863');

            // Outer Rectangle Color Gradient
            outerGradient.addColorStop(0, '#A8EC67');
            outerGradient.addColorStop(0.4, '#A8EC67');
            outerGradient.addColorStop(0.6, '#81D92C');
            outerGradient.addColorStop(1, '#81D92C');
          } else {
            innerGradient.addColorStop(0, '#62B628');
            innerGradient.addColorStop(1, '#71C637');

            // Outer Rectangle Color Gradient
            outerGradient.addColorStop(0, '#74C63C');
            outerGradient.addColorStop(0.4, '#74C63C');
            outerGradient.addColorStop(0.6, '#5BB31F');
            outerGradient.addColorStop(1, '#5BB31F');
          }
          // Drawing outer rectangle
          ctx.fillStyle = outerGradient;
          ctx.fillRect(x, y, tileSize, tileSize);

          // Drawing inner rectangle
          ctx.fillStyle = innerGradient;
          ctx.fillRect(x + borderPixel, y + borderPixel, tileSize - borderPixel * 2, tileSize - borderPixel * 2); // Adjust dimensions for inner rect

          if (content === 'F') {
            ctx.fillStyle = 'red';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('F', x + tileSize / 2, y + tileSize / 2);
          }
          // Drawing outer rectangle border
          if (
            Math.abs(rowIndex - (cursorY - startPoint.y)) <= 1 &&
            Math.abs(colIndex - (cursorX - startPoint.x)) <= 1 &&
            !(colIndex === cursorX - startPoint.x && rowIndex === cursorY - startPoint.y) &&
            content === 'C'
          ) {
            ctx.strokeStyle = 'yellow';
            const lineWidth = 3;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x + lineWidth / 2, y + lineWidth / 2, tileSize - lineWidth, tileSize - lineWidth);
          }
        } else if (
          content === 'O' ||
          content === '1' ||
          content === '2' ||
          content === '3' ||
          content === '4' ||
          content === '5' ||
          content === '6' ||
          content === '7' ||
          content === '8'
        ) {
          ctx.lineWidth = 1;
          const innerGradient = ctx.createLinearGradient(
            x + borderPixel,
            y + borderPixel,
            x + tileSize - borderPixel * 2,
            y + tileSize - borderPixel * 2,
          );
          innerGradient.addColorStop(0, '#F1FAD1');
          innerGradient.addColorStop(1, '#E9F6B9');

          const outerGradient = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
          outerGradient.addColorStop(0, '#E9FAAA');
          outerGradient.addColorStop(0.4, '#E9FAAA');
          outerGradient.addColorStop(0.6, '#F5FDD8');
          outerGradient.addColorStop(1, '#F5FDD8');

          ctx.fillStyle = outerGradient;
          ctx.fillRect(x, y, tileSize, tileSize);

          ctx.fillStyle = innerGradient;
          ctx.fillRect(x + borderPixel, y + borderPixel, tileSize - borderPixel * 2, tileSize - borderPixel * 2); // Adjust dimensions for inner rect

          if (content !== 'O') {
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(content, x + tileSize / 2, y + tileSize / 2);
          }
        } else {
          // 타일 색상 설정 (콘텐츠에 따라 변경)
          const lineWidth = 1;
          ctx.lineWidth = lineWidth;
          switch (content) {
            default:
              ctx.fillStyle = 'white';
          }

          // 타일 그리기
          ctx.fillRect(x, y, tileSize, tileSize);

          // 글씨 입력
          ctx.fillStyle = 'black';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(content, x + tileSize / 2, y + tileSize / 2);

          // 경계선 그리기
          ctx.strokeStyle = 'black';
          ctx.strokeRect(x + lineWidth, y + lineWidth, tileSize - lineWidth, tileSize - lineWidth);
        }
      });
    });

    // 커서 표시
    const cursorCanvasX = ((cursorX - startPoint.x) / paddingTiles) * tileSize;
    const cursorCanvasY = ((cursorY - startPoint.y) / paddingTiles) * tileSize;
    ctx.beginPath();
    ctx.arc(cursorCanvasX + tileSize / 2, cursorCanvasY + tileSize / 2, tileSize / 4, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'yellow';
    ctx.fill();

    // 클릭한 타일 표시
    const clickCanvasX = cursorCanvasX + (clickX - cursorX) * tileSize;
    const clickCanvasY = cursorCanvasY + (clickY - cursorY) * tileSize;

    ctx.beginPath();
    ctx.strokeStyle = 'red'; // 테두리 색상
    const lineWidth = 3;
    ctx.lineWidth = lineWidth; // 테두리 두께
    ctx.strokeRect(
      clickCanvasX + lineWidth / 2,
      clickCanvasY + lineWidth / 2,
      tileSize - lineWidth,
      tileSize - lineWidth,
    ); // 테두리 그리기
    ctx.closePath();
    setRenderedTiles(tiles);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, tileSize, cursorX, cursorY, startPoint, clickX, clickY]);

  return (
    <canvas
      ref={canvasRef}
      width={windowWidth}
      height={windowHeight}
      style={{ border: '1px solid black' }}
      onClick={handleClick}
    />
  );
};

export default CanvasRenderer;
