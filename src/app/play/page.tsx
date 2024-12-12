'use client';
/** style */
import './globals.css';
import S from './page.module.scss';

/** hooks */
import { useEffect, useState } from 'react';
import useScreenSize from '@/hooks/useScreenSize';
import { useCursorStore, useOtherUserCursorsStore } from '../../store/cursorStore';

/** components */
import CanvasRenderer from '@/components/canvas';
import useClickStore from '@/store/clickStore';
import useWebSocketStore from '@/store/websocketStore';
import Inactive from '@/components/inactive';

interface Point {
  x: number;
  y: number;
}

export default function Play() {
  /** constants */
  const zoomScale = 1.5;
  const renderRange = 2;
  const originTileSize = 80;
  const webSocketUrl = `${process.env.NEXT_PUBLIC_WS_HOST}/session`;

  /** stores */
  const { isOpen, message, sendMessage, connect } = useWebSocketStore();
  const {
    x: cursorX,
    y: cursorY,
    setColor,
    setPosition: setCursorPosition,
    zoom,
    setZoom,
    originX: cursorOriginX,
    originY: cursorOriginY,
    setOringinPosition,
  } = useCursorStore();
  const { setCursors, addCursors, cursors } = useOtherUserCursorsStore();
  const { x: clickX, y: clickY, setPosition: setClickPosition } = useClickStore();

  /** hooks */
  const { windowWidth, windowHeight } = useScreenSize();

  /** states */
  const [tileSize, setTileSize] = useState<number>(0); //px
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState<Point>({ x: 0, y: 0 });
  const [renderStartPoint, setRenderStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [cachingTiles, setCachingTiles] = useState<string[][]>([]);
  const [renderTiles, setRenderTiles] = useState<string[][]>([...cachingTiles.map(row => [...row])]);
  const [reviveTime, setReviveTime] = useState<number>(-1);

  /**
   * Request Tiles
   * Please send start y and end y coordinates are reversed because the y-axis is reversed.
   * @param start_x {number} - start x position
   * @param start_y {number} - start y position
   * @param end_x {number} - end x position
   * @param end_y {number} - end y position
   * @param type {string} - Request type (R: Right tiles, L: Left tiles, U: Up tiles, D: Down tiles, A: All tiles)
   *  */
  const appendTask = (
    start_x: number,
    start_y: number,
    end_x: number,
    end_y: number,
    type: 'R' | 'L' | 'U' | 'D' | 'A',
  ) => {
    if (!isOpen) return;
    /** add Dummy data to originTiles */
    const rowlength = Math.abs(end_x - start_x) + 1;
    const columnlength = Math.abs(start_y - end_y) + 1;

    setCachingTiles(tiles => {
      const newTiles = [...tiles];
      if (type.includes('U')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles.unshift([...Array(rowlength).fill('??')]);
          newTiles.pop();
        }
      }
      if (type.includes('D')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles.push([...Array(rowlength).fill('??')]);
          newTiles.shift();
        }
      }
      if (type.includes('L')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles[i] = [...Array(rowlength).fill('??'), ...newTiles[i].slice(0, -1)];
        }
      }
      if (type.includes('R')) {
        for (let i = 0; i < columnlength; i++) {
          newTiles[i] = [...newTiles[i].slice(rowlength, newTiles[0].length), ...Array(rowlength).fill('??')];
        }
      }
      if (type.includes('A')) {
        const newTiles = Array.from({ length: columnlength }, () => Array.from({ length: rowlength }, () => '??'));
        return newTiles;
      }
      return newTiles;
    });

    const body = JSON.stringify({
      event: 'fetch-tiles',
      payload: {
        start_p: { x: start_x, y: start_y },
        end_p: { x: end_x, y: end_y },
      },
    });
    sendMessage(body);
    return;
  };

  /** Re-connect websocket when websocket is closed state. */
  useEffect(() => {
    if (!isOpen && startPoint.x !== 0 && startPoint.y !== 0 && endPoint.x !== 0 && endPoint.y) {
      connect(
        webSocketUrl + `?view_width=${endPoint.x - startPoint.x + 1}&view_height=${endPoint.y - startPoint.y + 1}`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, startPoint, endPoint]);

  /** decode Hex using two charactors
   * @param hex {string} - Hex string
   */
  const decodeHex = (hex: string) => {
    const hexArray = hex.match(/.{1,2}/g);
    if (!hexArray) return '';
    // hex to byte
    const byte = hexArray.map(hex => parseInt(hex, 16).toString(2).padStart(8, '0')).join('');
    // byte 0 - IsOpen, 1 - IsMine, 2 - IsFlag, 3 ~ 4 color, 5 ~ 7 number of mines
    const isOpen = byte[0] === '1';
    if (isOpen) {
      const isMine = byte[1] === '1';
      const number = parseInt(byte.slice(5), 2);
      return isMine ? 'B' : number === 0 ? 'O' : number.toString();
    }
    const isFlag = byte[2] === '1';
    let color = '';
    switch (byte.slice(3, 5)) {
      case '00' /** red */:
        color = '0';
        break;
      case '01' /** yellow */:
        color = '1';
        break;
      case '10' /** blue */:
        color = '2';
        break;
      case '11' /** purple */:
        color = '3';
        break;
      default:
        color = '';
    }
    if (isFlag) {
      return 'F' + color;
    }
    return 'C';
  };

  const replaceTiles = (end_x: number, end_y: number, start_x: number, start_y: number, unsortedTiles: string) => {
    const rowlength = Math.abs(end_x - start_x + 1) * 2;
    const columnlength = Math.abs(start_y - end_y + 1);
    const sortedTiles: string[][] = [];
    if (unsortedTiles.length === 0) return;
    for (let i = 0; i < columnlength; i++) {
      const sortedlist = unsortedTiles.slice(i * rowlength, (i + 1) * rowlength);
      const tempTilelist = [] as string[];
      for (let j = 0; j < rowlength / 2; j++) {
        const hex = sortedlist.slice(j * 2, j * 2 + 2);
        tempTilelist[j] = decodeHex(hex);
      }
      sortedTiles[i] = tempTilelist;
    }
    /** The y-axis is reversed.*/
    sortedTiles.reverse();
    /** Replace dummy data according to coordinates */
    setCachingTiles(() => {
      const newTiles = [...cachingTiles];
      for (let i = 0; i < columnlength; i++) {
        /** Move down only when receiving tiles from below. */
        const rowIndex = i + (cursorY < end_y ? endPoint.y - startPoint.y - columnlength + 1 : 0);
        for (let j = 0; j < rowlength; j++) {
          if (!newTiles[rowIndex]) {
            newTiles[rowIndex] = [];
          }
          let tile = sortedTiles[i][j];
          if (tile?.includes('C') || tile?.includes('F')) {
            tile += (i - end_y + j - start_x) % 2 === 0 ? '0' : '1';
          }
          if (tile) {
            newTiles[rowIndex][j + start_x - startPoint.x] = tile;
          }
        }
      }
      return newTiles;
    });
  };

  /** Handling Websocket Message */
  useEffect(() => {
    if (!message) return;
    try {
      const { event, payload } = JSON.parse(message as string);
      /** When receiving requested tiles */
      if (event === 'tiles') {
        const {
          end_p: { x: end_x, y: end_y },
          start_p: { x: start_x, y: start_y },
          tiles: unsortedTiles,
        } = payload;
        replaceTiles(end_x, end_y, start_x, start_y, unsortedTiles);
        /** When receiving unrequested tiles & when sending tile open event */
      } else if (event === 'flag-set' || event === 'tile-updated') {
        setCachingTiles(tiles => {
          const {
            position: { x, y },
            tile: { color, is_flag, is_mine, is_open: is_tile_open, number },
          } = payload;
          const newTiles = [...tiles];
          if (is_tile_open) {
            if (is_mine) {
              newTiles[y - startPoint.y][x - startPoint.x] = 'B';
            } else {
              newTiles[y - startPoint.y][x - startPoint.x] = number?.toString() ?? 'O';
            }
          } else {
            newTiles[y - startPoint.y][x - startPoint.x] =
              (is_flag ? 'F' + color : 'C') + ((x + y) % 2 === 0 ? '0' : '1');
          }
          return newTiles;
        });
        /** Fetches own information only once when connected. */
      } else if (event === 'my-cursor') {
        const { position, pointer, color } = payload;
        setOringinPosition(position.x, position.y);
        setCursorPosition(position.x, position.y);
        setColor(color.toLowerCase());
        if (pointer) {
          setClickPosition(pointer.x, pointer.y, '');
        }
        /** Fetches information of other users. */
      } else if (event === 'you-died') {
        const { revive_at } = payload;
        const leftTime = new Date(revive_at)?.getTime() - new Date().getTime();
        setReviveTime(Math.floor(leftTime / 1000));
      } else if (event === 'cursors') {
        const newCursors = payload.cursors.map((cursor: { position: { x: number; y: number }; color: string }) => {
          const { position, color } = cursor;
          return { x: position.x, y: position.y, color: color.toLowerCase() };
        });
        addCursors(newCursors);
        /** Receives movement events from other users. */
      } else if (event === 'moved') {
        const { origin_position, new_position, color } = payload;
        const { x: originX, y: originY } = origin_position;
        const { x: newX, y: newY } = new_position;
        const newCursors = [...cursors];
        const index = newCursors.findIndex(
          (cursor: { x: number; y: number; color: string }) =>
            cursor.x === originX && cursor.y === originY && cursor.color === color.toLowerCase(),
        );
        console.log();
        if (index !== -1) {
          newCursors[index].x = newX;
          newCursors[index].y = newY;
        }
        setCursors(newCursors);
      } else if (event === 'cursor-quit') {
        const { color, position } = payload;
        const newCursors = [...cursors];
        const index = newCursors.findIndex(
          (cursor: { x: number; y: number; color: string }) =>
            cursor.x === position.x && cursor.y === position.y && cursor.color === color.toLowerCase(),
        );
        if (index !== -1) {
          newCursors.splice(index, 1);
        }
        setCursors(newCursors);
      }
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  /** Detect changes in cached tile content and position */
  useEffect(() => {
    setRenderTiles(() => {
      const newTiles = [...cachingTiles.map(row => [...row.map(() => '??')])];
      for (let i = 0; i < cachingTiles.length; i++) {
        const rowIndex = i + cursorOriginY - cursorY;
        for (let j = 0; j < cachingTiles[i].length; j++) {
          const columnIndex = j + cursorOriginX - cursorX;
          if (!cachingTiles[rowIndex]?.[columnIndex]) {
            continue;
          }
          newTiles[i][j] = cachingTiles[rowIndex]?.[columnIndex] || '??';
        }
      }
      return newTiles;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachingTiles, cursorOriginX, cursorOriginY]);

  /** Reset screen range when cursor position or screen size changes */
  useEffect(() => {
    const newTileSize = originTileSize * zoom;
    const tilePaddingWidth = Math.floor(Math.floor((windowWidth * renderRange) / newTileSize) / 2);
    const tilePaddingHeight = Math.floor(Math.floor((windowHeight * renderRange) / newTileSize) / 2);

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
    setTileSize(newTileSize);

    if (!isOpen) return;
    const body = JSON.stringify({
      event: 'set-view-size',
      payload: {
        width: Math.floor(Math.floor((windowWidth * renderRange) / newTileSize)),
        height: Math.floor(Math.floor((windowHeight * renderRange) / newTileSize)),
      },
    });
    sendMessage(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, windowHeight, zoom, cursorOriginX, cursorOriginY, cursorX, cursorY, renderRange, isOpen]);

  /** Handling zoom event */
  useEffect(() => {
    const newTileSize = originTileSize * zoom;
    const tileVisibleWidth = Math.floor((windowWidth * renderRange) / newTileSize);
    const tileVisibleHeight = Math.floor((windowHeight * renderRange) / newTileSize);

    const tilePaddingWidth = Math.floor(tileVisibleWidth / 2);
    const tilePaddingHeight = Math.floor(tileVisibleHeight / 2);
    let heightReductionLength = 0;
    let widthReductionLength = 0;
    if (tileVisibleWidth > endPoint.x - startPoint.x + 1 || tileVisibleHeight > endPoint.y - startPoint.y + 1) {
      /** Request for expanded entire tiles */
      heightReductionLength = Math.floor(tilePaddingHeight - (endPoint.y - startPoint.y) / 2);
      widthReductionLength = Math.round(tilePaddingWidth - (endPoint.x - startPoint.x) / 2);
    } else {
      /** Request for reduced entire tiles */
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
  }, [windowWidth, windowHeight, zoom, renderRange, isOpen]);

  /** When cursor position has changed. */
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

    /** Bottom right */
    if (widthExtendLength > 0 && heightExtendLength > 0) {
      appendTask(rightfrom, downfrom, rightto, upto, 'R');
      appendTask(leftfrom, downfrom, rightto, downto, 'D');
      /** Bottom left */
    } else if (widthExtendLength < 0 && heightExtendLength > 0) {
      appendTask(leftfrom, downfrom, leftto, upto, 'L');
      appendTask(leftfrom, downfrom, rightto, downto, 'D');
      /** Top right */
    } else if (widthExtendLength > 0 && heightExtendLength < 0) {
      appendTask(rightfrom, downfrom, rightto, upto, 'R');
      appendTask(leftfrom, upfrom, rightto, upto, 'U');
      /** Top left */
    } else if (widthExtendLength < 0 && heightExtendLength < 0) {
      appendTask(leftfrom, downfrom, leftto, upto, 'L');
      appendTask(leftfrom, upfrom, rightto, upto, 'U');
      /** Right move */
    } else if (widthExtendLength > 0) {
      appendTask(rightfrom, endPoint.y, rightto, startPoint.y, 'R');
      /** Left move */
    } else if (widthExtendLength < 0) {
      appendTask(leftfrom, endPoint.y, leftto, startPoint.y, 'L');
      /** Down move */
    } else if (heightExtendLength > 0) {
      appendTask(startPoint.x, downfrom, endPoint.x, downto, 'D');
      /** Up move */
    } else if (heightExtendLength < 0) {
      appendTask(startPoint.x, upfrom, endPoint.x, upto, 'U');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorX, cursorY]);

  /** Send user move event */
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const body = JSON.stringify({
      event: 'moving',
      payload: {
        position: {
          x: cursorOriginX,
          y: cursorOriginY,
        },
      },
    });
    sendMessage(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorOriginX, cursorOriginY]);

  useEffect(() => {
    if (reviveTime < 1) return;
    setTimeout(() => {
      setReviveTime(e => e - 1);
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviveTime]);

  return (
    <div className={S.page}>
      {reviveTime > 0 && <Inactive time={reviveTime} />}
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
          paddingTiles={renderRange}
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
