import useScreenSize from '@/hooks/useScreenSize';
import React, { useRef, useEffect } from 'react';

/** 타입 정의 */
interface CanvasRendererProps {
  tiles: string[][];
  tileSize: number;
  cursorX: number;
  cursorY: number;
  startPoint: { x: number; y: number };
}
const CanvasRenderer: React.FC<CanvasRendererProps> = ({ tiles, tileSize, cursorX, cursorY, startPoint }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tilePaddingHeight = 3;
  const tilePaddingWidth = 4;
  const borderPixel = 5;
  const { windowHeight, windowWidth } = useScreenSize();

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // 캔버스 좌표를 배열 좌표로 변환
    const tileArrayX = Math.floor(clickX / tileSize) + tilePaddingWidth;
    const tileArrayY = Math.floor(clickY / tileSize) + tilePaddingHeight;

    // 캔버스 좌표를 실제 좌표로 변환
    const tileX = tileArrayX + startPoint.x - tilePaddingWidth;
    const tileY = tileArrayY + startPoint.y - tilePaddingHeight;

    // 클릭한 타일의 내용 가져오기
    const clickedTileContent = tiles[tileArrayY]?.[tileArrayX] ?? 'Out of bounds';
    console.log(`Clicked Tile: (${tileX}, ${tileY}) - Content: ${clickedTileContent}`);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 타일 그리기
    tiles.forEach((row, rowIndex) => {
      row.forEach((content, colIndex) => {
        const x = (colIndex - tilePaddingWidth) * tileSize;
        const y = (rowIndex - tilePaddingHeight) * tileSize;

        if (content === 'C') {
          const gradient1 = ctx.createLinearGradient(
            x + borderPixel,
            y + borderPixel,
            x + tileSize - borderPixel * 2,
            y + tileSize - borderPixel * 2,
          );
          gradient1.addColorStop(0, '#8fe340');
          gradient1.addColorStop(1, '#A4E863');

          // Outer Rectangle Color Gradient
          const gradient2 = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
          gradient2.addColorStop(0, '#A8EC67');
          gradient2.addColorStop(0.4, '#A8EC67');
          gradient2.addColorStop(0.6, '#81D92C');
          gradient2.addColorStop(1, '#81D92C');

          // Drawing outer rectangle
          ctx.fillStyle = gradient2;
          ctx.fillRect(x, y, tileSize, tileSize);

          // Drawing inner rectangle
          ctx.fillStyle = gradient1;
          ctx.fillRect(x + borderPixel, y + borderPixel, tileSize - borderPixel * 2, tileSize - borderPixel * 2); // Adjust dimensions for inner rect
        } else {
          // 타일 색상 설정 (콘텐츠에 따라 변경)
          switch (content) {
            case 'F':
              ctx.fillStyle = 'red';
              break;
            case '1':
              ctx.fillStyle = 'blue';
              break;
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
          ctx.strokeRect(x, y, tileSize, tileSize);
        }
      });
    });

    // 커서 표시
    const cursorCanvasX = (cursorX - startPoint.x) * tileSize;
    const cursorCanvasY = (cursorY - startPoint.y) * tileSize;
    ctx.fillStyle = 'yellow';
    ctx.fillRect(cursorCanvasX, cursorCanvasY, tileSize, tileSize);
  }, [tiles, tileSize, cursorX, cursorY, startPoint]);

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
