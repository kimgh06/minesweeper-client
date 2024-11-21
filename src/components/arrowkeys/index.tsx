import React, { useEffect, useState } from 'react';
import useCursorStore from '@/store/cursorStore';
import S from './style.module.scss';

export default function ArrowKeys() {
  const { x, y, setY, setX, setPosition } = useCursorStore();
  const [activedButton, setActivedButton] = useState('');
  const upLeft = () => {
    setActivedButton('upLeft');
    setPosition(x - 1, y - 1);
  };
  const up = () => {
    setActivedButton('up');
    setY(y - 1);
  };
  const upRight = () => {
    setActivedButton('upRight');
    setPosition(x + 1, y - 1);
  };
  const downLeft = () => {
    setActivedButton('downLeft');
    setPosition(x - 1, y + 1);
  };
  const down = () => {
    setActivedButton('down');
    setY(y + 1);
  };
  const downRight = () => {
    setActivedButton('downRight');
    setPosition(x + 1, y + 1);
  };
  const left = () => {
    setActivedButton('left');
    setX(x - 1);
  };
  const right = () => {
    setActivedButton('right');
    setX(x + 1);
  };

  return (
    <div className={S.buttons} onPointerUp={() => setActivedButton('')}>
      <div className={S.row}>
        <button onPointerDown={upLeft} className={`${activedButton === 'upLeft' && S.active}`}>
          <div className={S.text}>↖</div>
        </button>
        <button onPointerDown={up} className={`${activedButton === 'up' && S.active}`}>
          <div className={S.text}>↑</div>
        </button>
        <button onPointerDown={upRight} className={`${activedButton === 'right' && S.active}`}>
          <div className={S.text}>↗</div>
        </button>
      </div>
      <div className={S.row}>
        <button onPointerDown={left} className={`${activedButton === 'left' && S.active}`}>
          <div className={S.text}>←</div>
        </button>
        <button>○</button>
        <button onPointerDown={right} className={`${activedButton === 'right' && S.active}`}>
          <div className={S.text}>→</div>
        </button>
      </div>
      <div className={S.row}>
        <button onPointerDown={downLeft} className={`${activedButton === 'downLeft' && S.active}`}>
          <div className={S.text}>↙</div>
        </button>
        <button onPointerDown={down} className={`${activedButton === 'down' && S.active}`}>
          <div className={S.text}>↓</div>
        </button>
        <button onPointerDown={downRight} className={`${activedButton === 'downRight' && S.active}`}>
          <div className={S.text}>↘</div>
        </button>
      </div>
    </div>
  );
}
