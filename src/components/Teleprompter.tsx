import React, { useEffect, useState } from 'react';

interface TeleprompterProps {
  text: string;
  duration: number; // in seconds
  isPlaying: boolean;
  manualProgress?: number;
}

export const Teleprompter: React.FC<TeleprompterProps> = ({ text, duration, isPlaying, manualProgress = 1 }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setProgress(manualProgress); // Show manual progress when statically previewing or idle
      return;
    }

    setProgress(0);
    let start = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / (duration * 1000), 1);
      setProgress(p);

      if (p < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, duration, text, manualProgress]);

  if (!text) return null;

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const highlightCount = Math.floor(progress * words.length);

  return (
    <div className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-normal lg:leading-relaxed text-slate-400">
      {words.map((word, idx) => (
        <span
          key={idx}
          className={`transition-colors duration-200 ${
            idx <= highlightCount
              ? 'text-slate-900 drop-shadow-sm'
              : 'opacity-40'
          }`}
        >
          {word}{' '}
        </span>
      ))}
    </div>
  );
};
