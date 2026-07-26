import { Play, Square, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Client, Room } from '../types';
import { RoomCanvas } from './RoomCanvas';

interface PresentationOverlayProps {
  rooms: Room[];
  client: Client;
  onClose: () => void;
  autoRead: boolean;
  aspectRatio: string;
}

export const PresentationOverlay: React.FC<PresentationOverlayProps> = ({ rooms, client, onClose, autoRead, aspectRatio }) => {
  const [playingIndex, setPlayingIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentRoom = rooms[playingIndex];

  useEffect(() => {
    if (!currentRoom) return;
    window.speechSynthesis.cancel();
    if (autoRead) {
      const text = currentRoom.teleprompterText || currentRoom.titleText || "";
      if (text) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [playingIndex, currentRoom, autoRead]);


  useEffect(() => {
    if (!currentRoom) return;
    
    // Per-room progress bar ticker
    setProgress(0);
    const start = performance.now();
    let frameId: number;
    
    const tick = (now: number) => {
      const elapsed = now - start;
      const ratio = Math.min(elapsed / (currentRoom.duration * 1000), 1);
      setProgress(ratio * 100);
      if (ratio < 1) frameId = requestAnimationFrame(tick);
    };
    
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [playingIndex, currentRoom]);

  const handleRoomComplete = () => {
    if (playingIndex < rooms.length - 1) {
      setPlayingIndex((prev) => prev + 1);
    } else {
      onClose(); // End presentation automatically after last room
    }
  };

  if (!currentRoom) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col font-sans">
      {/* Top Control Bar */}
      <div className="absolute top-0 left-0 right-0 z-50">
        {/* Progress Bar Track */}
        <div className="h-1.5 w-full bg-slate-800">
          <div 
            className="h-full transition-none"
            style={{ 
              width: `${progress}%`,
              backgroundColor: client.color 
            }} 
          />
        </div>
        
        {/* Header content */}
        <div className="h-16 flex items-center justify-between px-6 bg-gradient-to-b from-black/80 to-transparent text-white">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold tracking-wider uppercase opacity-80" style={{ color: client.color }}>
              {client.name}
            </span>
            <span className="text-sm font-medium bg-white/10 px-3 py-1 rounded-full">
              Room {playingIndex + 1} of {rooms.length}
            </span>
          </div>
          
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            <Square size={18} fill="currentColor" />
            Stop Segment
          </button>
        </div>
      </div>

      {/* Main Canvas View */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <div className={`w-full h-full max-h-full ${aspectRatio === "aspect-video" ? "max-w-none aspect-video" : aspectRatio === "aspect-[9/16]" ? "max-w-[100vh] aspect-[9/16]" : "max-w-[100vh] aspect-square"} relative shadow-2xl`}>
        <RoomCanvas
          room={currentRoom}
          client={client}
          isPlaying={true}
          onComplete={handleRoomComplete}
          playCount={0}
        />
        </div>
      </div>
    </div>
  );
};
