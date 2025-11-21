import React, { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number; // seconds
  direction?: 'up' | 'down';
  className?: string;
  separator?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

const getDecimalPlaces = (num: number) => {
  const str = num.toString();
  return str.includes('.') ? str.split('.')[1].length : 0;
};

const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 1,
  direction = 'up',
  className = '',
  separator = ',',
  onStart,
  onEnd,
}) => {
  const [value, setValue] = useState(direction === 'down' ? to : from);
  const frameRef = useRef<number>();

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));
  const formatter = new Intl.NumberFormat('en-US', {
    useGrouping: !!separator,
    minimumFractionDigits: maxDecimals,
    maximumFractionDigits: maxDecimals,
  });

  useEffect(() => {
    const startValue = direction === 'down' ? to : from;
    const endValue = direction === 'down' ? from : to;
    const startTime = performance.now();
    const runtime = Math.max(duration, 0.1) * 1000;

    onStart?.();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / runtime, 1);
      const next = startValue + (endValue - startValue) * progress;
      setValue(next);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        onEnd?.();
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [direction, duration, from, onEnd, onStart, to]);

  const formatted = separator
    ? formatter.format(value).replace(/,/g, separator)
    : formatter.format(value);

  return <span className={className}>{formatted}</span>;
};

export default CountUp;
