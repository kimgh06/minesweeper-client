'use client';
/** style */
import S from './page.module.scss';

/** hooks */
import { useEffect, useState } from 'react';
import useScreenSize from '@/hooks/useScreenSize';
import useCursorStore from '../store/cursorStore';

/** components */
import ArrowKeys from '@/components/arrowkeys';
import CanvasRenderer from '@/components/canvas';

interface Point {
  x: number;
  y: number;
}

export default function Play() {
  const originTileSize = 80;
  const paddingTiles = 1;
  const zoomScale = 1.5;
  // const ws = useRef<WebSocket | null>(null);
  const { x: cursorX, y: cursorY } = useCursorStore();
  const { windowWidth, windowHeight } = useScreenSize();
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [tileSize, setTileSize] = useState<number>(originTileSize); //px
  const [tiles, setTiles] = useState<string[][]>([
    ['1', '1', '1', 'C', 'C', 'C', 'C', 'C', 'C'],
    ['2', 'F', '2', 'C', 'C', 'C', 'C', 'C', 'C'],
    ['2', 'F', '2', 'C', 'C', 'C', 'C', 'C', 'C'],
    ['1', '1', '1', 'C', 'C', '1', '1', '1', 'C'],
    ['C', 'C', 'C', 'C', 'C', '1', 'F', '1', 'C'],
    ['C', 'C', 'C', 'C', 'C', '1', '1', '1', 'C'],
    ['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C'],
  ]);
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
  }, [windowWidth, windowHeight, zoom, cursorX, cursorY]);

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
          columnTile.push('?');
        }
        /** 가로 요청 보내야 함. */
        newTiles = newTiles.map(row => [...columnTile, ...row, ...columnTile]);
        /** 세로 획 추가 */
        const heightExtendLength = Math.floor(tilePaddingHeight - (endPoint.y - startPoint.y) / 2);
        const rowTile = Array.from({ length: newTiles[0].length }, () => '?');
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
  }, [windowWidth, windowHeight, zoom]);

  /** cursor change evnet */
  useEffect(() => {
    /** 커서 위치가 바뀌었을 때 */
    let newTiles = [...tiles];
    const widthExtendLength = 1;
    const heightExtendLength = 1;
    /** 우측 이동 */
    if (Math.abs(cursorX - startPoint.x) > Math.abs(cursorX - endPoint.x)) {
      for (let i = 0; i < widthExtendLength; i++) {
        newTiles = newTiles.map(row => [...row.slice(1), '?']);
      }
    } else if (Math.abs(cursorX - startPoint.x) < Math.abs(cursorX - endPoint.x)) {
      /** 좌측 이동 */
      for (let i = 0; i < widthExtendLength; i++) {
        newTiles = newTiles.map(row => ['?', ...row.slice(0, -1)]);
      }
    }
    /** 아래 이동 */
    if (Math.abs(cursorY - startPoint.y) > Math.abs(cursorY - endPoint.y)) {
      for (let i = 0; i < heightExtendLength; i++) {
        newTiles.shift();
        newTiles.push(Array.from({ length: newTiles[0].length }, () => '?'));
      }
    } else if (Math.abs(cursorY - startPoint.y) < Math.abs(cursorY - endPoint.y)) {
      /** 위 이동 */
      for (let i = 0; i < heightExtendLength; i++) {
        newTiles.pop();
        newTiles.unshift(Array.from({ length: newTiles[0].length }, () => '?'));
      }
    }
    setTiles(newTiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorX, cursorY]);

  // const sendMessage = (message: string) => {
  // 요청 형식
  //{
  // 	"event": "fetch-tiles",
  // 	"data": {
  // 		"start_x": int,
  // 		"start_y": int,
  // 		"end_x": int,
  // 		"end_y": int
  // 	}
  // }
  //   ws.current?.send(message);
  // };

  /** 초기화 */
  // useEffect(() => {
  //   ws.current = new WebSocket('ws://localhost:8080');
  //   ws.current.onopen = () => {
  //     console.log('WebSocket connection established');
  //   };
  //   ws.current.onmessage = event => {
  //     console.log('Message from server:', event.data);
  //     // 응답 형식
  //     // {
  //     // 	"event": "tiles",
  //     // 	"data": {
  //     // 		"start_x": int,
  //     // 		"start_y": int,
  //     // 		"end_x": int,
  //     // 		"end_y": int,
  //     // 		"tiles": "CCCCCCCCCCC111CC1F1CC111C"
  //     // 	}
  //     // }
  //   };
  //   ws.current.onclose = () => {
  //     console.log('WebSocket connection closed');
  //   };
  //   ws.current.onerror = error => {
  //     console.error('WebSocket error:', error);
  //   };
  //   return () => {
  //     ws.current?.close();
  //   };
  // }, []);

  return (
    <div className={S.page}>
      <ArrowKeys />
      <div className={S.zoombar}>
        {zoom * zoomScale < 1.7 && <button onClick={() => setZoom(zoom * zoomScale)}>+</button>}
        {zoom / zoomScale > 0.2 && <button onClick={() => setZoom(zoom / zoomScale)}>-</button>}
      </div>
      <div className={S.monitoringFrame}>
        <p>
          Pointer XY ({cursorX}, {cursorY})
        </p>
        <p>
          Rendered X ({startPoint.x} ~ {endPoint.x})
        </p>
        <p>
          Rendered Y ({startPoint.y} ~ {endPoint.y})
        </p>
        <p>Total {(endPoint.x - startPoint.x + 1) * (endPoint.y - startPoint.y + 1)} Tiles</p>
        <p></p>
      </div>
      <div className={S.canvas}>
        <CanvasRenderer tiles={tiles} tileSize={tileSize} startPoint={startPoint} cursorX={cursorX} cursorY={cursorY} />
      </div>
    </div>
  );
}
