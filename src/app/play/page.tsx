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

interface RenderingTask {
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  type: 'R' | 'L' | 'U' | 'D' | 'A';
}

export default function Play() {
  const originTileSize = 80;
  const zoomScale = 1.5;
  const webSocketUrl = `${process.env.NEXT_PUBLIC_WS_HOST}/session`;
  const { x: cursorX, y: cursorY } = useCursorStore();
  const { x: clickX, y: clickY, content: clickContent } = useClickStore();
  const { windowWidth, windowHeight } = useScreenSize();
  const { isOpen, message, sendMessage } = useWebSocket(webSocketUrl);
  const [paddingTiles, setPaddingTiles] = useState<number>(2);
  const [taskArray, setTaskArray] = useState<RenderingTask[]>([]);
  const [isMonitoringDisabled, setIsMonitoringDisabled] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [tileSize, setTileSize] = useState<number>(originTileSize); //px
  const [tiles, setTiles] = useState<string[][]>([
    ['1', '1', '1', 'O', 'O', 'C', 'C', 'C', 'O'],
    ['2', 'F', '2', 'O', 'O', 'C', 'C', 'C', 'O'],
    ['2', 'F', '2', 'O', 'O', 'C', 'C', 'C', 'O'],
    ['1', '1', '1', 'O', 'O', '1', '1', '1', 'O'],
    ['C', 'C', 'C', 'O', 'O', '1', 'F', '1', 'O'],
    ['C', 'C', 'C', 'O', 'O', '1', '1', '1', 'O'],
    ['C', 'C', 'C', 'O', 'O', 'C', 'C', 'C', 'O'],
  ]);

  useEffect(() => {
    if (isOpen) {
      appendTask(startPoint.x, endPoint.y, endPoint.x, startPoint.y, 'A');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!message) return;
    try {
      const { event, payload } = JSON.parse(message as string);
      if (event === 'tiles') {
        const { end_x, end_y, start_x, start_y, tiles: newtiles } = payload;
        const type = taskArray.find(
          task => task.start_x === start_x && task.start_y === end_y && task.end_x === end_x && task.end_y === start_y,
        )?.type;
        setTaskArray(taskArray =>
          taskArray.filter(
            task =>
              task.start_x !== start_x && task.start_y !== end_y && task.end_x !== end_x && task.end_y !== start_y,
          ),
        );

        const rowlength = Math.abs(end_x - start_x) + 1;
        const columnlength = Math.abs(start_y - end_y) + 1;
        console.log(type, rowlength, columnlength);
        if (type === 'R') {
          /** 오른쪽으로 갈 경우 */
          const fetchedTiles = [] as string[][];
          for (let i = 0; i < columnlength; i++) {
            const row = newtiles.slice(i * rowlength, (i + 1) * rowlength).split('');
            fetchedTiles.push(row);
          }
          setTiles(tiles => {
            const newTiles = [...tiles];
            for (let i = 0; i < columnlength; i++) {
              newTiles[i] = [...newTiles[i].slice(1), ...fetchedTiles[i]];
            }
            return newTiles;
          });
        } else if (type === 'L') {
          /** 왼쪽으로 갈 경우 */
          const fetchedTiles = [] as string[][];
          for (let i = 0; i < columnlength; i++) {
            const row = newtiles.slice(i * rowlength, (i + 1) * rowlength).split('');
            fetchedTiles.push(row);
          }
          setTiles(tiles => {
            const newTiles = [...tiles];
            for (let i = 0; i < columnlength; i++) {
              newTiles[i] = [...fetchedTiles[i], ...newTiles[i].slice(0, -1)];
            }
            return newTiles;
          });
        } else if (type === 'U') {
          /** 위로 갈 경우 */
          const newTiles = [] as string[][];
          for (let i = 0; i < columnlength; i++) {
            const row = newtiles.slice(i * rowlength, (i + 1) * rowlength).split('');
            newTiles.push(row);
          }
          setTiles(tiles => {
            return [...newTiles, ...tiles.slice(0, -1)];
          });
        } else if (type === 'D') {
          /** 아래로 갈 경우 */
          const newTiles = [] as string[][];
          for (let i = 0; i < columnlength; i++) {
            const row = newtiles.slice(i * rowlength, (i + 1) * rowlength).split('');
            newTiles.push(row);
          }
          setTiles(tiles => {
            return [...tiles.slice(1), ...newTiles];
          });
        } else if (type === 'A') {
          /** 전체 갱신 */
          const newTiles = [] as string[][];
          for (let i = 0; i < columnlength; i++) {
            const row = newtiles.slice(i * rowlength, (i + 1) * rowlength).split('');
            newTiles.push(row);
          }
          setTiles(newTiles.reverse());
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [message]);

  useEffect(() => {
    console.log(tiles.map(row => row.join('')).join('\n'));
    console.log('taskarray', taskArray.map(task => task.type).join(''));
  }, [tiles, taskArray]);

  useEffect(() => {
    const newTileSize = originTileSize * zoom;
    const tileVisibleWidth = Math.floor((windowWidth * paddingTiles) / newTileSize);
    const tileVisibleHeight = Math.floor((windowHeight * paddingTiles) / newTileSize);

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
    setTileSize(newTileSize);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, windowHeight, zoom, cursorX, cursorY, paddingTiles]);

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
      const heightExtendLength = Math.round((endPoint.y - startPoint.y - tileVisibleHeight) / 2);
      const widthExtendLength = Math.round((endPoint.x - startPoint.x - tileVisibleWidth) / 2);
      appendTask(
        startPoint.x + widthExtendLength,
        endPoint.y - heightExtendLength,
        endPoint.x - widthExtendLength,
        startPoint.y + heightExtendLength,
        'A',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, windowHeight, zoom, paddingTiles]);

  const appendTask = (
    start_x: number,
    start_y: number,
    end_x: number,
    end_y: number,
    type: 'R' | 'L' | 'U' | 'D' | 'A',
  ) => {
    setTaskArray([...taskArray, { start_x, start_y: end_y, end_x, end_y: start_y, type }]);
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

  /** cursor change evnet */
  useEffect(() => {
    /** 커서 위치가 바뀌었을 때 */
    const newTiles = [...tiles];
    const widthExtendLength = 1;
    const heightExtendLength = 1;
    /** 우측 이동 */
    if (Math.abs(cursorX - startPoint.x) > Math.abs(cursorX - endPoint.x)) {
      appendTask(endPoint.x + widthExtendLength, endPoint.y, endPoint.x + widthExtendLength, startPoint.y, 'R');
    } else if (Math.abs(cursorX - startPoint.x) < Math.abs(cursorX - endPoint.x)) {
      /** 좌측 이동 */
      appendTask(startPoint.x - widthExtendLength, endPoint.y, startPoint.x - widthExtendLength, startPoint.y, 'L');
    }
    /** 아래 이동 */
    if (Math.abs(cursorY - startPoint.y) > Math.abs(cursorY - endPoint.y)) {
      appendTask(startPoint.x, startPoint.y + heightExtendLength, endPoint.x, startPoint.y + heightExtendLength, 'D');
    } else if (Math.abs(cursorY - startPoint.y) < Math.abs(cursorY - endPoint.y)) {
      /** 위 이동 */
      appendTask(startPoint.x, endPoint.y - heightExtendLength, endPoint.x, endPoint.y - heightExtendLength, 'U');
    }
    setTiles(newTiles);
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
