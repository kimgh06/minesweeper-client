'use client';
/** style */
import S from './page.module.scss';

/** hooks */
import { useEffect, useState } from 'react';
import useScreenSize from '@/hooks/useScreenSize';
import useCursorStore from '../../store/cursorStore';

/** components */
import ArrowKeys from '@/components/arrowkeys';
import CanvasRenderer from '@/components/canvas';
import useClickStore from '@/store/clickStore';
import useWebSocket from '@/hooks/useWebsocket';

interface Point {
  x: number;
  y: number;
}

export default function Play() {
  const originTileSize = 80;
  const zoomScale = 1.5;
  const webSocketUrl = `${process.env.NEXT_PUBLIC_WS_HOST}/session`;
  const { x: cursorX, y: cursorY, zoom, setZoom } = useCursorStore();
  const { x: clickX, y: clickY, content: clickContent, movecost } = useClickStore();
  const { windowWidth, windowHeight } = useScreenSize();
  const { isOpen, message, sendMessage } = useWebSocket(webSocketUrl);
  const [paddingTiles, setPaddingTiles] = useState<number>(2);
  const [isMonitoringDisabled, setIsMonitoringDisabled] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState<Point>({ x: 0, y: 0 });
  const [tileSize, setTileSize] = useState<number>(0); //px
  const [tiles, setTiles] = useState<string[][]>([
    ['1', '1', '1', 'O', 'O', 'C', 'C', 'C', 'O'],
    ['2', 'F', '2', 'O', 'O', 'C', 'C', 'C', 'O'],
    ['2', 'F', '2', 'O', 'O', 'C', 'C', 'C', 'O'],
    ['1', '1', '1', 'O', 'O', '1', '1', '1', 'O'],
    ['C', 'C', 'C', 'O', 'O', '1', 'F', '1', 'O'],
    ['C', 'C', 'C', 'O', 'O', '1', '1', '1', 'O'],
    ['C', 'C', 'C', 'O', 'O', 'C', 'C', 'C', 'O'],
  ]);

  const appendTask = (
    start_x: number,
    start_y: number,
    end_x: number,
    end_y: number,
    type: 'R' | 'L' | 'U' | 'D' | 'UL' | 'UR' | 'DL' | 'DR' | 'A' | '',
  ) => {
    /** add Dummy data to originTiles */
    const newTiles = [...tiles];
    if (type.includes('R')) {
      const rowlength = Math.abs(end_x - start_x) + 1;
      const columnlength = Math.abs(start_y - end_y) + 1;
      for (let i = 0; i < columnlength; i++) {
        newTiles[i] = [...newTiles[i].slice(1), ...Array(rowlength).fill('?')];
      }
    }
    if (type.includes('L')) {
      const rowlength = Math.abs(end_x - start_x) + 1;
      const columnlength = Math.abs(start_y - end_y) + 1;
      for (let i = 0; i < columnlength; i++) {
        newTiles[i] = [...Array(rowlength).fill('?'), ...newTiles[i].slice(0, -1)];
      }
    }
    if (type.includes('D')) {
      const rowlength = Math.abs(end_x - start_x) + 1;
      const columnlength = Math.abs(start_y - end_y) + 1;
      for (let i = 0; i < columnlength; i++) {
        newTiles.push([...Array(rowlength).fill('?')]);
        newTiles.shift();
      }
    }
    if (type.includes('U')) {
      const rowlength = Math.abs(end_x - start_x) + 1;
      const columnlength = Math.abs(start_y - end_y) + 1;
      for (let i = 0; i < columnlength; i++) {
        newTiles.unshift([...Array(rowlength).fill('?')]);
        newTiles.pop();
      }
    }
    if (type.includes('A')) {
      /** 크기에 맞게 생성 */
      setTiles(() => {
        const newTiles = Array.from({ length: Math.abs(end_y - start_y) + 1 }, () =>
          Array.from({ length: Math.abs(end_x - start_x) + 1 }, () => '?'),
        );
        return newTiles;
      });
    } else {
      setTiles(newTiles);
    }
    console.log('dummy', newTiles.map(row => row?.join('')).join('\n'));
    if (type.length > 1) {
      return;
    }
    const body = JSON.stringify({
      event: 'fetch-tiles',
      payload: {
        start_x,
        start_y,
        end_x,
        end_y,
      },
    });
    sendMessage(body);
  };

  useEffect(() => {
    if (!message) return;
    try {
      const { event, payload } = JSON.parse(message as string);
      if (event === 'tiles') {
        const { end_x, end_y, start_x, start_y, tiles: unsortedTiles } = payload;

        const rowlength = Math.abs(end_x - start_x) + 1;
        const columnlength = Math.abs(start_y - end_y) + 1;
        const sortedTiles = [] as string[][];
        for (let i = 0; i < columnlength; i++) {
          sortedTiles[i] = unsortedTiles.slice(i * rowlength, (i + 1) * rowlength);
        }
        sortedTiles.reverse();
        /** 좌표에 맞게 더미 데이터를 갈아끼우기 */
        setTiles(tiles => {
          const newTiles = [...tiles];
          for (let i = 0; i < columnlength; i++) {
            /** column 형태로 올 때에만 rowIndex를 뒤집기 */
            const rowIndex = i + endPoint.y - start_y;
            for (let j = 0; j < rowlength; j++) {
              if (!newTiles[rowIndex]) {
                newTiles[rowIndex] = [];
              }
              newTiles[rowIndex][j + start_x - startPoint.x] = sortedTiles[i][j];
            }
          }

          return newTiles;
        });
      }
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  useEffect(() => {
    console.log(tiles.map(row => row.join('')).join('\n'));
  }, [tiles]);

  useEffect(() => {
    const newTileSize = originTileSize * zoom;
    const tileVisibleWidth = Math.floor((windowWidth * paddingTiles) / newTileSize);
    const tileVisibleHeight = Math.floor((windowHeight * paddingTiles) / newTileSize);
    setTileSize(newTileSize);

    const tilePaddingWidth = Math.floor(tileVisibleWidth / 2);
    const tilePaddingHeight = Math.floor(tileVisibleHeight / 2);

    setStartPoint({
      x: cursorX - tilePaddingWidth,
      y: cursorY - tilePaddingHeight,
    });
    setEndPoint({
      x: cursorX + tilePaddingWidth,
      y: cursorY + tilePaddingHeight,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, windowHeight, zoom, cursorX, cursorY, paddingTiles, isOpen]);

  /** zoom event */
  useEffect(() => {
    if (!isOpen) return;
    const newTileSize = originTileSize * zoom;
    const tileVisibleWidth = Math.floor((windowWidth * paddingTiles) / newTileSize);
    const tileVisibleHeight = Math.floor((windowHeight * paddingTiles) / newTileSize);

    const tilePaddingWidth = Math.floor(tileVisibleWidth / 2);
    const tilePaddingHeight = Math.floor(tileVisibleHeight / 2);
    if (tileVisibleWidth > endPoint.x - startPoint.x + 1 || tileVisibleHeight > endPoint.y - startPoint.y + 1) {
      /** 확장된 전체 타일 요청 */
      appendTask(
        startPoint.x - Math.round(tilePaddingWidth - (endPoint.x - startPoint.x) / 2),
        endPoint.y + Math.floor(tilePaddingHeight - (endPoint.y - startPoint.y) / 2),
        endPoint.x + Math.round(tilePaddingWidth - (endPoint.x - startPoint.x) / 2),
        startPoint.y - Math.floor(tilePaddingHeight - (endPoint.y - startPoint.y) / 2),
        'A',
      );
    } else {
      /** 축소된 전체 타일 요청 */
      const heightReductionLength = Math.round((endPoint.y - startPoint.y - tileVisibleHeight) / 2);
      const widthReductionLength = Math.round((endPoint.x - startPoint.x - tileVisibleWidth) / 2);
      appendTask(
        startPoint.x + widthReductionLength,
        endPoint.y - heightReductionLength,
        endPoint.x - widthReductionLength,
        startPoint.y + heightReductionLength,
        'A',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, windowHeight, zoom, paddingTiles, isOpen]);

  /** cursor change evnet */
  useEffect(() => {
    /** 커서 위치가 바뀌었을 때 */
    const widthExtendLength = 1;
    const heightExtendLength = 1;

    /** 우측 이동 */
    if (Math.abs(cursorX - startPoint.x) > Math.abs(cursorX - endPoint.x)) {
      appendTask(endPoint.x + widthExtendLength, endPoint.y, endPoint.x + widthExtendLength, startPoint.y, 'R');
    }
    /** 좌측 이동 */
    if (Math.abs(cursorX - startPoint.x) < Math.abs(cursorX - endPoint.x)) {
      appendTask(startPoint.x - widthExtendLength, endPoint.y, startPoint.x - widthExtendLength, startPoint.y, 'L');
    }
    /** 아래 이동 */
    if (Math.abs(cursorY - startPoint.y) > Math.abs(cursorY - endPoint.y)) {
      appendTask(startPoint.x, startPoint.y + heightExtendLength, endPoint.x, startPoint.y + heightExtendLength, 'D');
    }
    /** 위 이동 */
    if (Math.abs(cursorY - startPoint.y) < Math.abs(cursorY - endPoint.y)) {
      appendTask(startPoint.x, endPoint.y - heightExtendLength, endPoint.x, endPoint.y - heightExtendLength, 'U');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorX, cursorY]);

  return (
    <div className={S.page}>
      <ArrowKeys />
      <div className={S.zoombar}>
        {zoom * zoomScale < 1.7 && <button onClick={() => setZoom(zoom * zoomScale)}>+</button>}
        {zoom / zoomScale > 0.2 && <button onClick={() => setZoom(zoom / zoomScale)}>-</button>}
      </div>
      <div className={`${S.monitoringFrame} ${isMonitoringDisabled && S.monitoringFrameDisabled}`}>
        {!isMonitoringDisabled && (
          <>
            <h2>Monitoring Tools</h2>
            <p>
              Clicked XY ({clickX}, {clickY}) : {clickContent}
            </p>
            <p>Move Cost: {movecost}</p>
            <ul>
              Total {(endPoint.x - startPoint.x + 1) * (endPoint.y - startPoint.y + 1)} Tiles
              <li>
                Pointer XY ({cursorX}, {cursorY})
              </li>
              <li>
                Rendered X ({startPoint.x} ~ {endPoint.x})
              </li>
              <li>
                Rendered Y ({startPoint.y} ~ {endPoint.y})
              </li>
            </ul>
            <p>Zoom: {Math.floor(zoom * 10) / 10}</p>
            <p>
              Rendering Area:{paddingTiles}
              {paddingTiles < 10 && <button onClick={() => setPaddingTiles(paddingTiles + 1)}>+</button>}
              {paddingTiles > 1 && <button onClick={() => setPaddingTiles(paddingTiles - 1)}>-</button>}{' '}
            </p>
          </>
        )}
        <button onClick={() => setIsMonitoringDisabled(e => !e)}>
          {isMonitoringDisabled ? 'Enable' : 'Disable'} Monitoring
        </button>
      </div>
      <div className={S.canvas}>
        <CanvasRenderer
          paddingTiles={paddingTiles}
          tiles={tiles}
          tileSize={tileSize}
          startPoint={startPoint}
          cursorX={cursorX}
          cursorY={cursorY}
        />
      </div>
    </div>
  );
}
