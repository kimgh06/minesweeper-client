'use client';
/** style */
import './globals.css';
import S from './page.module.scss';

/** hooks */
import { useEffect, useState } from 'react';
import useScreenSize from '@/hooks/useScreenSize';
import { useCursorStore } from '../../store/cursorStore';

/** components */
import CanvasRenderer from '@/components/canvas';
import useClickStore from '@/store/clickStore';
import useWebSocketStore from '@/store/websocketStore';

interface Point {
  x: number;
  y: number;
}

// interface UserCursor {
//   position: { x: number; y: number };
//   pointer: { x: number; y: number };
//   color: string;
// }

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
    color,
    setColor,
    setPosition: setCursorPosition,
    zoom,
    setZoom,
    originX: cursorOriginX,
    originY: cursorOriginY,
  } = useCursorStore();
  const { x: clickX, y: clickY, setPosition: setClickPosition, content: clickContent, movecost } = useClickStore();

  /** hooks */
  const { windowWidth, windowHeight } = useScreenSize();

  /** states */
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState<Point>({ x: 0, y: 0 });
  const [renderStartPoint, setRenderStartPoint] = useState<Point>({ x: 0, y: 0 });
  // const [userCursors, setUserCursors] = useState<UserCursor[]>([]);
  const [paddingTiles, setPaddingTiles] = useState<number>(2);
  const [isMonitoringDisabled, setIsMonitoringDisabled] = useState<boolean>(true);
  const [tileSize, setTileSize] = useState<number>(0); //px
  const [cachingTiles, setCachingTiles] = useState<string[][]>([]);
  const [renderTiles, setRenderTiles] = useState<string[][]>([...cachingTiles.map(row => [...row])]);
  /** 타일 요청 */
  const appendTask = (
    start_x: number,
    start_y: number,
    end_x: number,
    end_y: number,
    type: 'R' | 'L' | 'U' | 'D' | 'A' | '',
  ) => {
    if (!isOpen) return;
    /** add Dummy data to originTiles */
    const rowlength = Math.abs(end_x - start_x) + 1;
    const columnlength = Math.abs(start_y - end_y) + 1;

    setCachingTiles(tiles => {
      const newTiles = [...tiles];
      if (type.includes('U')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles.unshift([...Array(rowlength).fill('?')]);
          newTiles.pop();
        }
      }
      if (type.includes('D')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles.push([...Array(rowlength).fill('?')]);
          newTiles.shift();
        }
      }
      if (type.includes('L')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles[i] = [...Array(rowlength).fill('?'), ...newTiles[i].slice(0, -1)];
        }
      }
      if (type.includes('R')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles[i] = [...newTiles[i].slice(rowlength, newTiles[0].length), ...Array(rowlength).fill('?')];
        }
      }
      if (type.includes('A')) {
        const newTiles = Array.from({ length: columnlength }, () => Array.from({ length: rowlength }, () => '?'));
        return newTiles;
      }
      return newTiles;
    });

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

  /** ws 연결 담당 */
  useEffect(() => {
    if (!isOpen) {
      connect(webSocketUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const replaceTiles = (end_x: number, end_y: number, start_x: number, start_y: number, unsortedTiles: string) => {
    const rowlength = Math.abs(end_x - start_x) + 1;
    const columnlength = Math.abs(start_y - end_y) + 1;
    const sortedTiles = [] as string[];
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
          let tile = sortedTiles[i][j];
          if (tile === 'C' || tile === 'F') {
            tile += (i + j) % 2 === 0 ? '0' : '1';
          }
          newTiles[rowIndex][j + start_x - startPoint.x] = tile;
        }
      }
      return newTiles;
    });
  };

  /** ws 메시지 처리 */
  useEffect(() => {
    if (!message) return;
    try {
      const { event, payload } = JSON.parse(message as string);
      /** 타일 요청한 것이 온 경우 */
      if (event === 'tiles') {
        const { end_x, end_y, start_x, start_y, tiles: unsortedTiles } = payload;
        replaceTiles(end_x, end_y, start_x, start_y, unsortedTiles);
        /** 요청하지 않은 타일이 올 경우 & 타일 여는 이벤트를 보냈을 경우 */
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
        /** 연결될 때 단 한 번만 자신의 정보를 가지고 옴. */
      } else if (event === 'my-cursor') {
        const { position, pointer, color } = payload;
        setCursorPosition(position.x, position.y);
        setClickPosition(pointer.x, pointer.y, '');
        setColor(color);
        /** 다른 유저들의 정보를 가지고 옴. */
      } else if (event === 'cursors') {
        // setUserCursors(payload);
        /** 다른 유저들의 이동 이벤트를 받아옴. */
      } else if (event === 'moved') {
        // const { origin_position, new_position, color } = payload;
        // const { x: originX, y: originY } = origin_position;
        // const { x: newX, y: newY } = new_position;
        // setUserCursors(cursors => {
        //   const newCursors = [...cursors];
        //   let index = newCursors.findIndex(cursor => cursor.position.x === originX && cursor.position.y === originY);
        //   if (index === -1) {
        //     index = newCursors.length;
        //   }
        //   newCursors[index] = { position: { x: newX, y: newY }, pointer: { x: newX, y: newY }, color };
        //   return newCursors;
        // });
      }
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  /** 캐싱 타일 콘텐츠, 위치 변경 감지 */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, windowHeight, zoom, cursorOriginX, cursorOriginY, cursorX, cursorY, paddingTiles, isOpen]);

  /** zoom event */
  useEffect(() => {
    const newTileSize = originTileSize * zoom;
    const tileVisibleWidth = Math.floor((windowWidth * paddingTiles) / newTileSize);
    const tileVisibleHeight = Math.floor((windowHeight * paddingTiles) / newTileSize);

    const tilePaddingWidth = Math.floor(tileVisibleWidth / 2);
    const tilePaddingHeight = Math.floor(tileVisibleHeight / 2);
    let heightReductionLength = 0;
    let widthReductionLength = 0;
    if (tileVisibleWidth > endPoint.x - startPoint.x + 1 || tileVisibleHeight > endPoint.y - startPoint.y + 1) {
      /** 확장된 전체 타일 요청 */
      heightReductionLength = Math.floor(tilePaddingHeight - (endPoint.y - startPoint.y) / 2);
      widthReductionLength = Math.round(tilePaddingWidth - (endPoint.x - startPoint.x) / 2);
    } else {
      /** 축소된 전체 타일 요청 */
      heightReductionLength = -Math.round((endPoint.y - startPoint.y - tileVisibleHeight) / 2);
      widthReductionLength = -Math.round((endPoint.x - startPoint.x - tileVisibleWidth) / 2);
    }
    appendTask(
      startPoint.x - widthReductionLength,
      endPoint.y + heightReductionLength,
      endPoint.x + widthReductionLength,
      startPoint.y - heightReductionLength,
      'A',
    );
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
      /** 우측 이동 */
    } else if (widthExtendLength > 0) {
      appendTask(rightfrom, endPoint.y, rightto, startPoint.y, 'R');
      /** 좌측 이동 */
    } else if (widthExtendLength < 0) {
      appendTask(leftfrom, endPoint.y, leftto, startPoint.y, 'L');
      /** 아래 이동 */
    } else if (heightExtendLength > 0) {
      appendTask(startPoint.x, downfrom, endPoint.x, downto, 'D');
      /** 위 이동 */
    } else if (heightExtendLength < 0) {
      appendTask(startPoint.x, upfrom, endPoint.x, upto, 'U');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorX, cursorY]);

  /** 유저 이동 이벤트 전송 */
  // useEffect(() => {
  //   if (!isOpen) {
  //     return;
  //   }
  //   const body = JSON.stringify({
  //     event: 'moving',
  //     payload: {
  //       position: {
  //         x: cursorOriginX,
  //         y: cursorOriginY,
  //       },
  //     },
  //   });
  //   sendMessage(body);
  // }, [cursorOriginX, cursorOriginY]);

  // /** 유저 클릭 이벤트 전송 */
  // useEffect(() => {
  //   if (!isOpen) {
  //     return;
  //   }
  //   const body = JSON.stringify({
  //     event: 'moving',
  //     payload: {
  //       position: {
  //         x: clickX,
  //         y: clickY,
  //       },
  //     },
  //   });
  //   sendMessage(body);
  // }, [clickX, clickY]);

  return (
    <div className={S.page}>
      {/* <div className={S.zoombar}>
        {zoom * zoomScale < 1.7 && <button onClick={() => setZoom(zoom * zoomScale)}>+</button>}
        {zoom / zoomScale > 0.2 && <button onClick={() => setZoom(zoom / zoomScale)}>-</button>}
      </div> */}
      <div className={S.dashboard}>
        <div className={S.coordinates}>
          <p>
            &nbsp;
            <svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M0.436226 1.88654C0.321855 0.917668 1.42232 0.282312 2.2042 0.865797L20.8289 14.7645C21.6738 15.3951 21.2476 16.7379 20.1937 16.7657L12.1637 16.978C11.0359 17.0078 9.99976 17.606 9.41006 18.5678L5.21123 25.4159C4.66013 26.3147 3.28415 26.0124 3.16055 24.9653L0.436226 1.88654Z"
                fill="white"
              />
            </svg>
            ({cursorOriginX}, {cursorOriginY})
          </p>
          <p>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M20 5L26 5C26.5523 5 27 5.44772 27 6L27 12"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M12 27L6 27C5.44772 27 5 26.5523 5 26L5 20"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path d="M5 12L5 6C5 5.44772 5.44772 5 6 5L12 5" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <path
                d="M27 20L27 26C27 26.5523 26.5523 27 26 27L20 27"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            &nbsp;({clickX === Infinity ? '' : clickX}, {clickY === Infinity ? '' : clickY})
          </p>
        </div>
        <div className={S.zoom}>
          <p>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="9" stroke="white" strokeWidth="4" />
              <path d="M27 27L21.5 21.5" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </svg>
            &nbsp;
            {Math.ceil(zoom * 100)}%
          </p>
          <div className={S.buttons}>
            <button onClick={() => setZoom(zoom / zoomScale > 0.2 ? zoom / zoomScale : zoom)}>-</button>
            <button onClick={() => setZoom(zoom * zoomScale < 1.7 ? zoom * zoomScale : zoom)}>+</button>
          </div>
        </div>
      </div>
      <div className={S.canvas}>
        <CanvasRenderer
          paddingTiles={paddingTiles}
          tiles={renderTiles}
          tileSize={tileSize}
          startPoint={renderStartPoint}
          cursorOriginX={cursorOriginX}
          cursorOriginY={cursorOriginY}
        />
      </div>
    </div>
  );
}
