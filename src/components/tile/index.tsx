import useCursorStore from '@/app/store/cursorStore';
import S from './style.module.scss';

interface TileProps {
  x: number;
  y: number;
  content: string;
  tileSize: number;
}

export default function Tile({ x, y, content, tileSize }: TileProps) {
  const { x: cursorX, y: cursorY } = useCursorStore();
  return (
    <div
      className={`
        ${S.tile}
        ${content === 'C' && ((x + y) % 2 === 0 ? S.even : S.odd)}
        ${!isNaN(Number(content)) && S.number}
        ${content === 'F' && S.flag}
      `}
      style={{ width: tileSize, height: tileSize }}
    >
      {(x === cursorX && y === cursorY && <div className={S.cursor}>O</div>) || content}
    </div>
  );
}
