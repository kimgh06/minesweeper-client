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
  const { x: cursorX, y: cursorY, setPosition: setCursorPosition, zoom, setZoom } = useCursorStore();
  const { x: clickX, y: clickY, setPosition: setClickPosition, content: clickContent, movecost } = useClickStore();
  const { color, setColor } = useColorStore();

  /** hooks */
  const { windowWidth, windowHeight } = useScreenSize();

  /** states */
  const [paddingTiles, setPaddingTiles] = useState<number>(2);
  const [endPoint, setEndPoint] = useState<Point>({ x: 0, y: 0 });
  const [userCursors, setUserCursors] = useState<UserCursor[]>([]);
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [isMonitoringDisabled, setIsMonitoringDisabled] = useState<boolean>(false);
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
        for (let i = 0; i < columnlength; i++) {
          sortedTiles[i] = unsortedTiles.slice(i * rowlength, (i + 1) * rowlength);
        }
        sortedTiles.reverse();
        /** 좌표에 맞게 더미 데이터를 갈아끼우기 */
        setTiles(tiles => {
          const newTiles = [...tiles];
          for (let i = 0; i < columnlength; i++) {
            /** 아래쪽을 받아 올 때에만 위아래 위치를 반전시킨다. */
            const rowIndex = i + (columnlength === 1 && cursorY < end_y ? endPoint.y - startPoint.y : 0);
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
        setTiles(tiles => {
          const {
            position: { x, y },
            state,
          } = payload;
          const newTiles = [...tiles];
          newTiles[y][x] = state;
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

  /** 타일 디버깅 */
  useEffect(() => {
    console.log(tiles.map(row => row.join('')).join('\n'));
  }, [tiles]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, windowHeight, zoom, cursorX, cursorY, paddingTiles, isOpen]);

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
      appendTask(startPoint.x, endPoint.y + heightExtendLength, endPoint.x, endPoint.y + heightExtendLength, 'D');
    }
    /** 위 이동 */
    if (Math.abs(cursorY - startPoint.y) < Math.abs(cursorY - endPoint.y)) {
      appendTask(startPoint.x, startPoint.y - heightExtendLength, endPoint.x, startPoint.y - heightExtendLength, 'U');
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
