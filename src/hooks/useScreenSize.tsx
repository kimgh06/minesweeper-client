'use client';
import { useState, useEffect } from 'react';

interface WindowSize {
  windowWidth: number;
  windowHeight: number;
}

export default function useScreenSize() {
  // 초기 값으로 화면의 너비와 높이를 설정
  const [windowSize, setWindowSize] = useState<WindowSize>({
    windowWidth: 0,
    windowHeight: 0,
  });
  const magnification = 1.1;

  useEffect(() => {
    // 윈도우 리사이즈 이벤트 핸들러
    if (typeof window === 'undefined') {
      return;
    }
    setWindowSize({
      windowWidth: window.innerWidth * magnification,
      windowHeight: window.innerHeight * magnification,
    });

    const handleResize = () => {
      setWindowSize({
        windowWidth: window.innerWidth * magnification,
        windowHeight: window.innerHeight * magnification,
      });
    };

    // 리사이즈 이벤트 리스너 등록
    window.addEventListener('resize', handleResize);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}
