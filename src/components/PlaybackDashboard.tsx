import React from 'react';
import { X, Play, Plus, Minus, GripVertical } from 'lucide-react';
import { Room, Client } from '../types';
import { ROOM_TYPES } from '../constants';

interface PlaybackDashboardProps {
  rooms: Room[];
  client: Client;
  playbackQueue: string[];
  setPlaybackQueue: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
  onPlay: () => void;
}

export const PlaybackDashboard: React.FC<PlaybackDashboardProps> = ({ 
  rooms, 
  client, 
  playbackQueue, 
  setPlaybackQueue, 
  onClose,
  onPlay
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Playback Dashboard</h2>
            <p className="text-sm text-slate-500 mt-1">Select and order the tiles you want to play</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onPlay}
              disabled={playbackQueue.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Play size={18} fill="currentColor" />
              Play Selected ({playbackQueue.length})
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Available Rooms */}
          <div className="w-1/2 p-6 overflow-y-auto border-r border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Available Tiles</h3>
              <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded">
                {rooms.length} total
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {rooms.map((room, index) => {
                const isSelected = playbackQueue.includes(room.id);
                const roomType = ROOM_TYPES.find(t => t.id === room.type);
                
                return (
                  <div 
                    key={room.id}
                    onClick={() => {
                      if (isSelected) {
                        setPlaybackQueue(q => q.filter(id => id !== room.id));
                      } else {
                        setPlaybackQueue(q => [...q, room.id]);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-start gap-2 ${
                      isSelected 
                        ? 'border-slate-900 bg-slate-50 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between w-full items-start">
                      <span 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: client.color }}
                      >
                        {index + 1}
                      </span>
                      {isSelected ? (
                        <div className="bg-slate-900 text-white p-1 rounded-full"><Minus size={12} /></div>
                      ) : (
                        <div className="bg-slate-100 text-slate-400 p-1 rounded-full group-hover:bg-slate-200"><Plus size={12} /></div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-slate-800 capitalize">{roomType?.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{room.animationStyle}</div>
                    </div>
                  </div>
                );
              })}
              {rooms.length === 0 && (
                <div className="col-span-2 text-center p-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">
                  No tiles created yet. Add tiles from the left sidebar first.
                </div>
              )}
            </div>
          </div>

          {/* Right: Selected Queue */}
          <div className="w-1/2 p-6 overflow-y-auto bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Play Sequence</h3>
              <button
                onClick={() => setPlaybackQueue([])}
                disabled={playbackQueue.length === 0}
                className="text-xs text-slate-500 hover:text-red-500 font-medium disabled:opacity-30 transition-colors"
              >
                Clear All
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {playbackQueue.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">
                  Click tiles on the left to add them to your playback sequence.
                </div>
              ) : (
                playbackQueue.map((roomId, idx) => {
                  const room = rooms.find(r => r.id === roomId);
                  if (!room) return null;
                  const roomType = ROOM_TYPES.find(t => t.id === room.type);
                  
                  return (
                    <div 
                      key={`${room.id}-${idx}`}
                      draggable={true}
                      onDragStart={(e) => { e.dataTransfer.setData("queue/dash", idx.toString()); e.dataTransfer.effectAllowed = "move"; }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceIdx = parseInt(e.dataTransfer.getData("queue/dash"));
                        if (isNaN(sourceIdx) || sourceIdx === idx) return;
                        const newQ = [...playbackQueue];
                        const [moved] = newQ.splice(sourceIdx, 1);
                        newQ.splice(idx, 0, moved);
                        setPlaybackQueue(newQ);
                      }}
                      className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical size={16} className="text-slate-300" />
                        <span className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-sm text-slate-800 capitalize">{roomType?.label}</div>
                          <div className="text-xs text-slate-400">{room.duration}s</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setPlaybackQueue(q => q.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
