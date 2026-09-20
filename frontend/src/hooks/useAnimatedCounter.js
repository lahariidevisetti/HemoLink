// src/hooks/useAnimatedCounter.js
// Smooth easing animated counter for stats & numbers

import { useState, useEffect } from 'react';

export function useAnimatedCounter(endValue, duration = 1400) {
  const [count, setCount] = useState(0);
  const target = typeof endValue === 'number' ? endValue : parseInt(endValue) || 0;

  useEffect(() => {
    let startTimestamp = null;
    let frameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [target, duration]);

  return count;
}
