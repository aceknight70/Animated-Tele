import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BackgroundLayer } from './BackgroundLayer';
import React, { useEffect, useState } from 'react';
import { Client, Room } from '../types';
import { Teleprompter } from './Teleprompter';

interface RoomCanvasProps {
  room: Room;
  client: Client;
  isPlaying: boolean;
  onComplete?: () => void;
  playCount: number; // Used to trigger re-renders for 'Preview' clicks
  manualProgress?: number; // 0 to 1
}

export const RoomCanvas: React.FC<RoomCanvasProps> = ({ room, client, isPlaying, onComplete, playCount, manualProgress = 1 }) => {
  const prefersReduced = useReducedMotion();

  // Auto-advance logic
  useEffect(() => {
    if (isPlaying && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, room.duration * 1000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, room.duration, onComplete, playCount]);

  const getVariants = () => {
    if (prefersReduced) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.5 } },
        exit: { opacity: 0, transition: { duration: 0.5 } },
      };
    }

    // For title rooms, we let the inner letters animate, whole container just fades in
    if (room.type === 'title') {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.5 } },
        exit: { opacity: 0, transition: { duration: 0.5 } },
      };
    }

    const speedMult = room.speedMultiplier ?? 1.0;
    const getTransition = (baseProps: any) => {
      const duration = baseProps.duration ? baseProps.duration / speedMult : undefined;
      return { ...baseProps, duration };
    };

    switch (room.animationStyle) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1, transition: getTransition({ duration: 1 }) },
          exit: { opacity: 0, transition: { duration: 0.5 } },
        };
      case 'slide':
        return {
          initial: { opacity: 0, x: 100 },
          animate: { opacity: 1, x: 0, transition: getTransition({ duration: 0.8, type: 'spring', damping: 20 }) },
          exit: { opacity: 0, x: -100, transition: { duration: 0.5 } },
        };
      case 'zoom':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1, transition: getTransition({ duration: 0.8, type: 'spring', damping: 15 }) },
          exit: { opacity: 0, scale: 1.1, transition: { duration: 0.5 } },
        };
      case 'spin':
        return {
          initial: { opacity: 0, rotate: -45, scale: 0.8 },
          animate: { opacity: 1, rotate: 0, scale: 1, transition: getTransition({ duration: 1, ease: 'easeOut' }) },
          exit: { opacity: 0, rotate: 45, transition: { duration: 0.5 } },
        };
      case 'particle':
        return {
          initial: { opacity: 0, y: 30 },
          animate: {
            opacity: 1,
            y: [0, -15, 0, 15, 0],
            transition: {
              opacity: getTransition({ duration: 1 }),
              y: { repeat: Infinity, duration: 6, ease: 'easeInOut' },
            },
          },
          exit: { opacity: 0, y: -30, transition: { duration: 0.5 } },
        };
      case 'blink':
        return {
          initial: { opacity: 0 },
          animate: {
            opacity: [0, 1, 0, 1, 0, 1],
            transition: { duration: 2.0 / speedMult, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: 'easeInOut' },
          },
          exit: { opacity: 0, transition: { duration: 0.5 } },
        };
      case 'fall':
        return {
          initial: { opacity: 0, y: -300 },
          animate: { opacity: 1, y: 0, transition: getTransition({ duration: 0.8, type: 'spring', bounce: 0.4 }) },
          exit: { opacity: 0, y: 300, transition: { duration: 0.5 } },
        };
      case 'materialize':
        return {
          initial: { opacity: 0, filter: 'blur(10px)', scale: 1.1 },
          animate: {
            opacity: [0, 1, 1, 0],
            filter: ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(10px)'],
            scale: [1.1, 1, 1, 0.9],
            transition: { duration: 3.0 / speedMult, times: [0, 0.15, 0.85, 1], ease: 'easeInOut' },
          },
          exit: { opacity: 0, filter: 'blur(10px)' },
        };
      case 'rotate360':
        return {
          initial: { opacity: 0, rotate: -360, scale: 0.5 },
          animate: { opacity: 1, rotate: 0, scale: 1, transition: getTransition({ duration: 1.2, type: 'spring' }) },
          exit: { opacity: 0, rotate: 360, transition: { duration: 0.5 } },
        };
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };

  const renderContent = () => {
    switch (room.type) {
      case 'logo':
        return (
          <div className="flex items-center justify-center w-full h-full p-8 md:p-16">
            {room.image ? (
              <img src={room.image} alt="Client Logo" className="w-full h-full object-contain drop-shadow-2xl" />
            ) : (
              <h1
                className="text-7xl md:text-9xl font-bold tracking-tight drop-shadow-2xl"
                style={{ color: client.color }}
              >
                {client.logoText}
              </h1>
            )}
          </div>
        );
      case 'product':
        return (
          <div className="flex items-center justify-center w-full h-full p-8 md:p-16">
            <div className="w-full h-full max-w-[1200px] flex items-center justify-center">
              {room.image ? (
                <img src={room.image} alt="Product" className="w-full h-full object-contain drop-shadow-2xl" />
              ) : (
                <div className="w-full h-full border-4 border-dashed border-slate-300 bg-white rounded-3xl flex items-center justify-center text-slate-400 text-2xl shadow-sm">
                  Upload Image (Target: 1200x1200px)
                </div>
              )}
            </div>
          </div>
        );
      case 'teleprompter':
        return (
          <div className="flex flex-col md:flex-row items-center justify-center w-full h-full p-8 md:p-16 gap-8 md:gap-16">
            <div className="w-full h-full max-h-[600px] max-w-[600px] shrink-0 flex items-center justify-center">
              {room.image ? (
                <img src={room.image} alt="Product" className="w-full h-full object-contain rounded-3xl shadow-2xl" />
              ) : (
                <div className="w-full h-full border-4 border-dashed border-slate-300 bg-white rounded-3xl flex items-center justify-center text-slate-400 text-xl text-center p-4 shadow-sm">
                  Upload Image<br />(Target: 600x600px)
                </div>
              )}
            </div>
            <div className="flex-1 w-full max-w-4xl max-h-full overflow-y-auto flex flex-col justify-center pr-2 bg-white/40 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50">
              <Teleprompter text={room.teleprompterText || 'Enter script text...'} duration={room.duration} isPlaying={isPlaying} manualProgress={manualProgress} />
            </div>
          </div>
        );
      case 'custom':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full p-8 gap-8">
            {room.image && (
              <div className="flex-1 min-h-[300px] w-full max-w-[1000px] flex items-center justify-center">
                <img src={room.image} alt="Custom Content" className="w-full h-full object-contain drop-shadow-xl" />
              </div>
            )}
            {room.teleprompterText && (
              <div className="flex-1 w-full max-w-4xl max-h-full overflow-y-auto flex items-center justify-center pr-2 bg-white/40 backdrop-blur-md p-8 rounded-3xl shadow-sm border border-white/50">
                <Teleprompter text={room.teleprompterText} duration={room.duration} isPlaying={isPlaying} manualProgress={manualProgress} />
              </div>
            )}
            {!room.image && !room.teleprompterText && (
              <div className="text-slate-500 text-2xl">Custom Room (Empty)</div>
            )}
          </div>
        );
      case 'title':
        const titleText = room.titleText || 'Enter Title...';
        const letters = titleText.split('');
        
        return (
          <div className="flex items-center justify-center w-full h-full p-8 md:p-16">
            <h2 className="text-6xl md:text-8xl font-bold text-center flex flex-wrap justify-center drop-shadow-2xl">
              {letters.map((char, i) => {
                if (room.animationStyle === 'block-drop' && !prefersReduced) {
                  return (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: -50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.1, type: 'spring', bounce: 0.5 }}
                      style={{ color: client.color, marginRight: char === ' ' ? '1rem' : '2px' }}
                    >
                      {char}
                    </motion.span>
                  );
                } else if (room.animationStyle === 'typewriter' && !prefersReduced) {
                  return (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.1, delay: i * 0.1 }}
                      style={{ color: client.color, marginRight: char === ' ' ? '1rem' : '2px' }}
                    >
                      {char}
                    </motion.span>
                  );
                }
                // Fallback for reduced motion or missing style
                return (
                  <span key={i} style={{ color: client.color, marginRight: char === ' ' ? '1rem' : '2px' }}>
                    {char}
                  </span>
                );
              })}
            </h2>
          </div>
        );
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden text-slate-900 font-sans">
      <BackgroundLayer effect={room.backgroundEffect} color={room.backgroundColor || '#ffffff'} reducedMotion={prefersReduced} />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundColor: client.color }} />
      <AnimatePresence mode="wait">
        <motion.div
          key={`${room.id}-${playCount}`}
          variants={getVariants()}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0 w-full h-full z-10"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
