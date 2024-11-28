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
import useWebSocketStore from '@/store/websocketStore';
import useColorStore from '@/store/colorStore';

interface Point {
  x: number;
  y: number;
}

interface UserCursor {
  position: { x: number; y: number };
  pointer: { x: number; y: number };
  color: string;
}

export default function Play() {
  /** constants */
  const originTileSize = 80;
  const zoomScale = 1.5;
  const webSocketUrl = `${process.env.NEXT_PUBLIC_WS_HOST}/session`;

  /** stores */
  const { isOpen, message, sendMessage, connect } = useWebSocketStore();
  const {
    x: cursorX,
    y: cursorY,
    setPosition: setCursorPosition,
    zoom,
    setZoom,
    originX: cursorOriginX,
    originY: cursorOriginY,
  } = useCursorStore();
  const { x: clickX, y: clickY, setPosition: setClickPosition, content: clickContent, movecost } = useClickStore();
  const { color, setColor } = useColorStore();

  /** hooks */
  const { windowWidth, windowHeight } = useScreenSize();

  /** states */
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState<Point>({ x: 0, y: 0 });
  const [renderStartPoint, setRenderStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [renderEndPoint, setRenderEndPoint] = useState<Point>({ x: 0, y: 0 });
  const [paddingTiles, setPaddingTiles] = useState<number>(2);
  const [userCursors, setUserCursors] = useState<UserCursor[]>([]);
  const [isMonitoringDisabled, setIsMonitoringDisabled] = useState<boolean>(false);
  const [tileSize, setTileSize] = useState<number>(0); //px
  const [cachingTiles, setCachingTiles] = useState<string[][]>([
    ['1', '1', '1', 'O', 'O', 'C', 'C', 'C', 'O'],
    ['2', 'F', '2', 'O', 'O', 'C', 'C', 'C', 'O'],
    ['2', 'F', '2', 'O', 'O', 'C', 'C', 'C', 'O'],
    ['1', '1', '1', 'O', 'O', '1', '1', '1', 'O'],
    ['C', 'C', 'C', 'O', 'O', '1', 'F', '1', 'O'],
    ['C', 'C', 'C', 'O', 'O', '1', '1', '1', 'O'],
    ['C', 'C', 'C', 'O', 'O', 'C', 'C', 'C', 'O'],
  ]);
  const [renderTiles, setRenderTiles] = useState<string[][]>([...cachingTiles.map(row => [...row])]);
  /** 타일 요청 */
  const appendTask = (
    start_x: number,
    start_y: number,
    end_x: number,
    end_y: number,
    type: 'R' | 'L' | 'U' | 'D' | 'UL' | 'UR' | 'DL' | 'DR' | 'A' | '',
  ) => {
    if (!isOpen) return;
    /** add Dummy data to originTiles */
    const rowlength = Math.abs(end_x - start_x) + 1;
    const columnlength = Math.abs(start_y - end_y) + 1;

    setCachingTiles(tiles => {
      const newTiles = [...tiles];
      if (type.includes('R')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles[i] = [...newTiles[i].slice(rowlength, newTiles[0].length), ...Array(rowlength).fill('?')];
        }
      }
      if (type.includes('L')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles[i] = [...Array(rowlength).fill('?'), ...newTiles[i].slice(0, -1)];
        }
      }
      if (type.includes('D')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles.push([...Array(rowlength).fill('?')]);
          newTiles.shift();
        }
      }
      if (type.includes('U')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles.unshift([...Array(rowlength).fill('?')]);
          newTiles.pop();
        }
      }
      return newTiles;
    });
    if (type.includes('A')) {
      /** 크기에 맞게 생성 */
      setCachingTiles(() => {
        const newTiles = Array.from({ length: columnlength }, () => Array.from({ length: rowlength }, () => '?'));
        return newTiles;
      });
    }
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
    return;
  };

  useEffect(() => {
    if (!isOpen) {
      connect(webSocketUrl);
    }
  }, [isOpen]);

  /** ws 메시지 처리 */
  useEffect(() => {
    if (!message) return;
    try {
      const { event, payload } = JSON.parse(message as string);
      if (event === 'tiles') {
        const { end_x, end_y, start_x, start_y, tiles: unsortedTiles } = payload;

        const rowlength = Math.abs(end_x - start_x) + 1;
        const columnlength = Math.abs(start_y - end_y) + 1;
        const sortedTiles = [] as string[][];
        if (unsortedTiles.length === 0) return;
        for (let i = 0; i < columnlength; i++) {
          sortedTiles[i] = unsortedTiles.slice(i * rowlength, (i + 1) * rowlength);
        }
        sortedTiles.reverse();
        /** 좌표에 맞게 더미 데이터를 갈아끼우기 */
        setCachingTiles(() => {
          const newTiles = [...cachingTiles];
          for (let i = 0; i < columnlength; i++) {
            /** 아래쪽을 받아 올 때에만 아래로 옮긴다. */
            const rowIndex = i + (cursorY < end_y ? endPoint.y - startPoint.y - columnlength + 1 : 0);
            for (let j = 0; j < rowlength; j++) {
              if (!newTiles[rowIndex]) {
                newTiles[rowIndex] = [];
              }
              newTiles[rowIndex][j + start_x - startPoint.x] = sortedTiles[i][j];
            }
          }
          return newTiles;
        });
      } else if (event === 'flag-set' || event === 'tile-opened') {
        setCachingTiles(tiles => {
          const {
            position: { x, y },
            state,
          } = payload;
          const newTiles = [...tiles];
          newTiles[y - startPoint.y][x - startPoint.x] = state;
          return newTiles;
        });
      } else if (event === 'my-cursor') {
        /** 연결될 때 단 한 번만 받음. */
        const { position, pointer, color } = payload;
        setCursorPosition(position.x, position.y);
        setClickPosition(pointer.x, pointer.y, '');
        setColor(color);
      } else if (event === 'cursors') {
        setUserCursors(payload);
      } else if (event === 'moved') {
        const { origin_position, new_position, color } = payload;
        const { x: originX, y: originY } = origin_position;
        const { x: newX, y: newY } = new_position;
        setUserCursors(cursors => {
          const newCursors = [...cursors];
          let index = newCursors.findIndex(cursor => cursor.position.x === originX && cursor.position.y === originY);
          if (index === -1) {
            index = newCursors.length;
          }
          newCursors[index] = { position: { x: newX, y: newY }, pointer: { x: newX, y: newY }, color };
          return newCursors;
        });
      }
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  /** 타일 콘텐츠, 위치 변경 감지 */
  useEffect(() => {
    setRenderTiles(() => {
      const newTiles = [...cachingTiles.map(row => [...row.map(() => '?')])];
      for (let i = 0; i < cachingTiles.length; i++) {
        const rowIndex = i + cursorOriginY - cursorY;
        for (let j = 0; j < cachingTiles[i].length; j++) {
          const columnIndex = j + cursorOriginX - cursorX;
          if (!cachingTiles[rowIndex]?.[columnIndex]) {
            continue;
          }
          newTiles[i][j] = cachingTiles[rowIndex]?.[columnIndex] || '?';
        }
      }
      return newTiles;
    });
    console.log('cache\n', cachingTiles.map(row => row.join('')).join('\n'));
  }, [cachingTiles, cursorOriginX, cursorOriginY]);

  /** 커서 위치나 화면 크기가 바뀌면 화면 범위 재설정 */
  useEffect(() => {
    const newTileSize = originTileSize * zoom;
    setTileSize(newTileSize);

    const tilePaddingWidth = Math.floor(Math.floor((windowWidth * paddingTiles) / newTileSize) / 2);
    const tilePaddingHeight = Math.floor(Math.floor((windowHeight * paddingTiles) / newTileSize) / 2);

    setStartPoint({
      x: cursorX - tilePaddingWidth,
      y: cursorY - tilePaddingHeight,
    });
    setEndPoint({
      x: cursorX + tilePaddingWidth,
      y: cursorY + tilePaddingHeight,
    });

    setRenderStartPoint({
      x: cursorOriginX - tilePaddingWidth,
      y: cursorOriginY - tilePaddingHeight,
    });
    setRenderEndPoint({
      x: cursorOriginX + tilePaddingWidth,
      y: cursorOriginY + tilePaddingHeight,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, windowHeight, zoom, cursorOriginX, cursorOriginY, cursorX, cursorY, paddingTiles, isOpen]);

  /** zoom event */
  useEffect(() => {
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

  /** 커서 위치가 바뀌었을 때 */
  useEffect(() => {
    const widthExtendLength = cursorX - cursorOriginX;
    const heightExtendLength = cursorY - cursorOriginY;

    const upfrom = startPoint.y - 1;
    const upto = startPoint.y + heightExtendLength;
    const downfrom = endPoint.y + heightExtendLength;
    const downto = endPoint.y + 1;
    const leftfrom = startPoint.x + widthExtendLength;
    const leftto = startPoint.x - 1;
    const rightfrom = endPoint.x + 1;
    const rightto = endPoint.x + widthExtendLength;

    /** 우측 아래 */
    if (widthExtendLength > 0 && heightExtendLength > 0) {
      appendTask(rightfrom, downfrom, rightto, upto, 'R');
      appendTask(leftfrom, downfrom, rightto, downto, 'D');
      /** 좌측 아래 */
    } else if (widthExtendLength < 0 && heightExtendLength > 0) {
      appendTask(leftfrom, downfrom, leftto, upto, 'L');
      appendTask(leftfrom, downfrom, rightto, downto, 'D');
      /** 우측 위 */
    } else if (widthExtendLength > 0 && heightExtendLength < 0) {
      appendTask(rightfrom, downfrom, rightto, upto, 'R');
      appendTask(leftfrom, upfrom, rightto, upto, 'U');
      /** 좌측 위 */
    } else if (widthExtendLength < 0 && heightExtendLength < 0) {
      appendTask(leftfrom, downfrom, leftto, upto, 'L');
      appendTask(leftfrom, upfrom, rightto, upto, 'U');
    } else if (widthExtendLength > 0) {
      /** 우측 이동 */
      appendTask(rightfrom, endPoint.y, rightto, startPoint.y, 'R');
      /** 아래 이동 */
    } else if (widthExtendLength < 0) {
      /** 좌측 이동 */
      appendTask(leftfrom, endPoint.y, leftto, startPoint.y, 'L');
    } else if (heightExtendLength > 0) {
      /** 아래 이동 */
      appendTask(startPoint.x, downfrom, endPoint.x, downto, 'D');
    } else if (heightExtendLength < 0) {
      /** 위 이동 */
      appendTask(startPoint.x, upfrom, endPoint.x, upto, 'U');
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
                Cursor XY ({cursorX}, {cursorY})
              </li>
              <li>
                Origin XY ({cursorOriginX}, {cursorOriginY})
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
            <p>Color: {color}</p>
            <ol>
              <button onClick={() => setColor('red')}>red</button>
              <button onClick={() => setColor('blue')}>blue</button>
              <button onClick={() => setColor('yellow')}>yellow</button>
              <button onClick={() => setColor('purple')}>purple</button>
            </ol>
          </>
        )}
        <button onClick={() => setIsMonitoringDisabled(e => !e)}>
          {isMonitoringDisabled ? 'Enable' : 'Disable'} Monitoring
        </button>
      </div>
      <div className={S.canvas}>
        <CanvasRenderer
          paddingTiles={paddingTiles}
          tiles={renderTiles}
          tileSize={tileSize}
          startPoint={renderStartPoint}
          cursorX={cursorOriginX}
          cursorY={cursorOriginY}
        />
      </div>
    </div>
  );
}
