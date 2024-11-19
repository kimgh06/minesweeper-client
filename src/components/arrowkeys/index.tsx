import React, { useEffect, useState } from 'react';
import useCursorStore from '@/app/store/cursorStore';
import S from './style.module.scss';

export default function ArrowKeys() {
  const { x, y, setY, setX } = useCursorStore();
  const [activedButton, setActivedButton] = useState('');
  const up = () => {
    setActivedButton('up');
    setY(y - 1);
  };
  const down = () => {
    setActivedButton('down');
    setY(y + 1);
  };
  const left = () => {
    setActivedButton('left');
    setX(x - 1);
  };
  const right = () => {
    setActivedButton('right');
    setX(x + 1);
  };

  useEffect(() => {
    if (!window) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          up();
          break;
        case 'ArrowDown':
          down();
          break;
        case 'ArrowLeft':
          left();
          break;
        case 'ArrowRight':
          right();
          break;
        default:
          break;
      }
    };

    // Adding event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [x, y]); // Adding x, y as dependencies to make sure they are updated in the event listener

  return (
    <div className={S.buttons}>
      <div className={S.row}>
        <button onClick={up} className={`${activedButton === 'up' && S.active}`}>
          <div className={S.text}>Up</div>
        </button>
        <button onClick={right} className={`${activedButton === 'right' && S.active}`}>
          <div className={S.text}>Right</div>
        </button>
      </div>
      <div className={S.row}>
        <button onClick={left} className={`${activedButton === 'left' && S.active}`}>
          <div className={S.text}>Left</div>
        </button>
        <button onClick={down} className={`${activedButton === 'down' && S.active}`}>
          <div className={S.text}>Down</div>
        </button>
      </div>
    </div>
  );
}
