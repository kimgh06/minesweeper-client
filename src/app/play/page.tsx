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
  type: 'R' | 'L' | 'U' | 'D';
}

export default function Play() {
  const originTileSize = 80;
  const zoomScale = 1.5;
  const webSocketUrl = 'ws://152.67.203.244/session';
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
      const body = JSON.stringify({
        event: 'fetch-tiles',
        payload: {
          start_x: startPoint.x,
          start_y: endPoint.y,
          end_x: endPoint.x,
          end_y: startPoint.y,
        },
      });
      sendMessage(body);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!message) return;
    try {
      const { event, payload } = JSON.parse(message as string);
      if (event === 'tiles') {
        const { end_x, end_y, start_x, start_y, tiles } = payload;
        const type = taskArray.filter(
          task => task.start_x === start_x && task.start_y === start_y && task.end_x === end_x && task.end_y === end_y,
        )[0]?.type;
        setTaskArray(taskArray =>
          taskArray.filter(
            task =>
              task.start_x !== start_x && task.start_y !== start_y && task.end_x !== end_x && task.end_y !== end_y,
          ),
        );

        const rowlength = Math.abs(end_x - start_x) + 1;

        const columnlength = Math.abs(start_y - end_y) + 1;
        console.log(tiles, rowlength, columnlength);
        const newTiles = [] as string[][];
        for (let i = 0; i < columnlength; i++) {
          const row = tiles.slice(i * rowlength, (i + 1) * rowlength).split('');
          newTiles.push(row);
        }
        switch (type) {
          case 'R':
            setTiles(tiles => {
              const newTiles = [...tiles];
              newTiles.forEach((row, index) => {
                row.splice(-1, 1, ...newTiles[index]);
              });
              return newTiles;
            });
            break;
          case 'L':
            setTiles(tiles => {
              const newTiles = [...tiles];
              newTiles.forEach((row, index) => {
                row.splice(0, 1, ...newTiles[index]);
              });
              return newTiles;
            });
            break;
          case 'U':
            setTiles(tiles => {
              const newTiles = [...tiles];
              newTiles.shift();
              newTiles.push(...newTiles);
              return newTiles;
            });
            break;
          case 'D':
            setTiles(tiles => {
              const newTiles = [...tiles];
              newTiles.pop();
              newTiles.unshift(...newTiles);
              return newTiles;
            });
            break;
          default:
            setTiles(newTiles.reverse());
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [message]);

  useEffect(() => {
    console.log(tiles.map(row => row.join('')).join('\n'));
  }, [tiles]);

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
    const newTileSize = originTileSize * zoom;
    const tileVisibleWidth = Math.floor((windowWidth * paddingTiles) / newTileSize);
    const tileVisibleHeight = Math.floor((windowHeight * paddingTiles) / newTileSize);

    const tilePaddingWidth = Math.floor(tileVisibleWidth / 2);
    const tilePaddingHeight = Math.floor(tileVisibleHeight / 2);
    setTiles(tiles => {
      let newTiles = [...tiles];
      /** 확장일 경우 */
      if (tileVisibleWidth > endPoint.x - startPoint.x + 1 || tileVisibleHeight > endPoint.y - startPoint.y + 1) {
        /** 가로 획 추가 */
        const columnTile = [] as string[];
        const widthExtendLength = Math.round(tilePaddingWidth - (endPoint.x - startPoint.x) / 2);
        for (let i = 0; i < widthExtendLength; i++) {
          columnTile.push('C');
        }
        /** 가로 요청 보내야 함. */
        newTiles = newTiles.map(row => [...columnTile, ...row, ...columnTile]);
        /** 세로 획 추가 */
        const heightExtendLength = Math.floor(tilePaddingHeight - (endPoint.y - startPoint.y) / 2);
        const rowTile = Array.from({ length: newTiles[0].length }, () => 'C');
        for (let i = 0; i < heightExtendLength; i++) {
          /** 세로 요청 보내야 함. */
          newTiles.unshift(rowTile);
          newTiles.push(rowTile);
        }
      } else {
        /** 축소일 경우 */
        /** 세로 획 */
        const heightExtendLength = Math.round((endPoint.y - startPoint.y - tileVisibleHeight) / 2);
        for (let i = 0; i < heightExtendLength; i++) {
          newTiles.shift();
          newTiles.pop();
        }
        /** 가로 획 */
        const widthExtendLength = Math.round((endPoint.x - startPoint.x - tileVisibleWidth) / 2);
        for (let i = 0; i < widthExtendLength; i++) {
          newTiles = newTiles.map(row => row.slice(1, -1));
        }
      }
      return newTiles;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, windowHeight, zoom, paddingTiles]);

  /** cursor change evnet */
  useEffect(() => {
    /** 커서 위치가 바뀌었을 때 */
    let newTiles = [...tiles];
    const widthExtendLength = 1;
    const heightExtendLength = 1;
    /** 우측 이동 */
    if (Math.abs(cursorX - startPoint.x) > Math.abs(cursorX - endPoint.x)) {
      const body = JSON.stringify({
        event: 'fetch-tiles',
        payload: {
          start_x: startPoint.x + widthExtendLength,
          start_y: endPoint.y,
          end_x: endPoint.x + widthExtendLength,
          end_y: startPoint.y,
        },
      });
      sendMessage(body);
      setTaskArray([
        ...taskArray,
        {
          start_x: startPoint.x + widthExtendLength,
          start_y: endPoint.y,
          end_x: endPoint.x + widthExtendLength,
          end_y: startPoint.y,
          type: 'R',
        },
      ]);

      // for (let i = 0; i < widthExtendLength; i++) {
      //   newTiles = newTiles.map(row => [...row.slice(1), 'C']);
      // }
    } else if (Math.abs(cursorX - startPoint.x) < Math.abs(cursorX - endPoint.x)) {
      /** 좌측 이동 */
      const body = JSON.stringify({
        event: 'fetch-tiles',
        payload: {
          start_x: startPoint.x - widthExtendLength,
          start_y: endPoint.y,
          end_x: endPoint.x - widthExtendLength,
          end_y: startPoint.y,
        },
      });
      sendMessage(body);
      setTaskArray([
        ...taskArray,
        {
          start_x: startPoint.x - widthExtendLength,
          start_y: endPoint.y,
          end_x: endPoint.x - widthExtendLength,
          end_y: startPoint.y,
          type: 'L',
        },
      ]);

      // for (let i = 0; i < widthExtendLength; i++) {
      //   newTiles = newTiles.map(row => ['C', ...row.slice(0, -1)]);
      // }
    }
    /** 아래 이동 */
    if (Math.abs(cursorY - startPoint.y) > Math.abs(cursorY - endPoint.y)) {
      // for (let i = 0; i < heightExtendLength; i++) {
      //   newTiles.shift();
      //   newTiles.push(Array.from({ length: newTiles[0].length }, () => 'C'));
      // }
      const body = JSON.stringify({
        event: 'fetch-tiles',
        payload: {
          start_x: startPoint.x,
          start_y: endPoint.y + heightExtendLength,
          end_x: endPoint.x,
          end_y: startPoint.y + heightExtendLength,
        },
      });
      sendMessage(body);
      setTaskArray([
        ...taskArray,
        {
          start_x: startPoint.x,
          start_y: endPoint.y + heightExtendLength,
          end_x: endPoint.x,
          end_y: startPoint.y + heightExtendLength,
          type: 'D',
        },
      ]);
    } else if (Math.abs(cursorY - startPoint.y) < Math.abs(cursorY - endPoint.y)) {
      /** 위 이동 */
      // for (let i = 0; i < heightExtendLength; i++) {
      //   newTiles.pop();
      //   newTiles.unshift(Array.from({ length: newTiles[0].length }, () => 'C'));
      // }
      const body = JSON.stringify({
        event: 'fetch-tiles',
        payload: {
          start_x: startPoint.x,
          start_y: endPoint.y - heightExtendLength,
          end_x: endPoint.x,
          end_y: startPoint.y - heightExtendLength,
        },
      });
      sendMessage(body);
      setTaskArray([
        ...taskArray,
        {
          start_x: startPoint.x,
          start_y: endPoint.y - heightExtendLength,
          end_x: endPoint.x,
          end_y: startPoint.y - heightExtendLength,
          type: 'U',
        },
      ]);
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
