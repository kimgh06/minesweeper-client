import useScreenSize from '@/hooks/useScreenSize';
import useClickStore from '@/store/clickStore';
import React, { useRef, useEffect } from 'react';

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
  const tilePaddingWidth = 4.5 + ((paddingTiles - 1) * (cursorX - startPoint.x)) / paddingTiles;
  const tilePaddingHeight = 3.25 + ((paddingTiles - 1) * (cursorY - startPoint.y)) / paddingTiles;
  const borderPixel = 5;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setPosition } = useClickStore();
  const { windowHeight, windowWidth } = useScreenSize();

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
    const tileX = Math.round(tileArrayX + startPoint.x - 4.5);
    const tileY = Math.round(tileArrayY + startPoint.y - 3.25);

    // 클릭한 타일의 내용 가져오기
    const clickedTileContent = tiles[tileArrayY]?.[tileArrayX] ?? 'Out of bounds';
    setPosition(tileX, tileY, clickedTileContent);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 타일 그리기
    tiles?.forEach((row, rowIndex) => {
      row?.forEach((content, colIndex) => {
        const x = (colIndex - tilePaddingWidth) * tileSize;
        const y = (rowIndex - tilePaddingHeight) * tileSize;

        if (content === 'C') {
          const innerGradient = ctx.createLinearGradient(
            x + borderPixel,
            y + borderPixel,
            x + tileSize - borderPixel * 2,
            y + tileSize - borderPixel * 2,
          );
          innerGradient.addColorStop(0, '#8fe340');
          innerGradient.addColorStop(1, '#A4E863');

          // Outer Rectangle Color Gradient
          const outerGradient = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
          outerGradient.addColorStop(0, '#A8EC67');
          outerGradient.addColorStop(0.4, '#A8EC67');
          outerGradient.addColorStop(0.6, '#81D92C');
          outerGradient.addColorStop(1, '#81D92C');

          // Drawing outer rectangle
          ctx.fillStyle = outerGradient;
          ctx.fillRect(x, y, tileSize, tileSize);

          // Drawing inner rectangle
          ctx.fillStyle = innerGradient;
          ctx.fillRect(x + borderPixel, y + borderPixel, tileSize - borderPixel * 2, tileSize - borderPixel * 2); // Adjust dimensions for inner rect
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
          switch (content) {
            case 'F':
              ctx.fillStyle = 'red';
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
    const cursorCanvasX = ((cursorX - startPoint.x) / paddingTiles - 0.5) * tileSize;
    const cursorCanvasY = ((cursorY - startPoint.y) / paddingTiles - 0.25) * tileSize;
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
