import re

with open("src/App.tsx", "r") as f:
    app = f.read()

# Add Eye, EyeOff, ListPlus, ListMinus imports
app = re.sub(
    r"Eye, ZoomIn",
    "Eye, EyeOff, ListPlus, ListMinus, ZoomIn, GripVertical",
    app
)

# Replace the sidebar header and list with a tabbed version
sidebar_content = """<div className="p-4 border-b border-slate-200 flex flex-col gap-3 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                Sequence
                <button 
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
                  title="Undo last action"
                >
                  <Undo2 size={14} />
                </button>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaybackState('playingAll')}
                  disabled={rooms.length === 0 || isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  title="Play All Rooms"
                >
                  <Play size={14} fill="currentColor" /> Play All
                </button>
              </div>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-md">
              <button 
                onClick={() => setSidebarTab('master')}
                className={`flex-1 text-xs py-1.5 px-2 rounded-sm font-medium transition-colors ${sidebarTab === 'master' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Master List ({rooms.length})
              </button>
              <button 
                onClick={() => setSidebarTab('queue')}
                className={`flex-1 text-xs py-1.5 px-2 rounded-sm font-medium transition-colors ${sidebarTab === 'queue' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Queue ({playbackQueue.length})
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sidebarTab === 'master' ? (
              rooms.map((room, index) => (
                <div
                  key={room.id} draggable={true} onDragStart={(e) => onDragStart(e, room.id)} onDragOver={onDragOver} onDrop={(e) => onDrop(e, room.id)}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`group relative flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedRoomId === room.id
                      ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  } ${room.hidden ? 'opacity-60 grayscale' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <GripVertical size={14} className="text-slate-300 cursor-grab" />
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: room.hidden ? '#94a3b8' : selectedClient.color }}
                      >
                        {index + 1}
                      </span>
                      <span className="font-medium text-sm text-slate-700 capitalize">
                        {ROOM_TYPES.find((t) => t.id === room.type)?.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (playbackQueue.includes(room.id)) {
                            setPlaybackQueue(q => q.filter(id => id !== room.id));
                          } else {
                            setPlaybackQueue(q => [...q, room.id]);
                          }
                        }}
                        className={`p-1 rounded transition-colors ${playbackQueue.includes(room.id) ? 'text-blue-500 hover:bg-blue-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                        title={playbackQueue.includes(room.id) ? "Remove from Queue" : "Add to Queue"}
                      >
                        {playbackQueue.includes(room.id) ? <ListMinus size={14} /> : <ListPlus size={14} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateRoom(room.id, { hidden: !room.hidden });
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        title={room.hidden ? "Show in default playback" : "Hide from default playback"}
                      >
                        {room.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRoom(room.id);
                        }}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                        title="Delete room"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-slate-500 pl-6">
                    <div className="truncate max-w-[120px] flex items-center gap-1">
                      {getAnimationIcon(room.animationStyle)} {room.animationStyle}
                    </div>
                    <div>
                      {room.duration}s {(room.speedMultiplier && room.speedMultiplier !== 1) ? `(${room.speedMultiplier}x)` : ''}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              playbackQueue.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-sm">
                  Queue is empty.<br/><br/>Go to the Master List and click the <ListPlus className="inline" size={14} /> icon to add rooms to your presentation queue.
                </div>
              ) : (
                playbackQueue.map((roomId, queueIndex) => {
                  const room = rooms.find(r => r.id === roomId);
                  if (!room) return null;
                  return (
                    <div
                      key={`queue-${room.id}-${queueIndex}`}
                      draggable={true} 
                      onDragStart={(e) => { e.dataTransfer.setData("queue/plain", queueIndex.toString()); e.dataTransfer.effectAllowed = "move"; }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceIdx = parseInt(e.dataTransfer.getData("queue/plain"));
                        if (isNaN(sourceIdx) || sourceIdx === queueIndex) return;
                        const newQ = [...playbackQueue];
                        const [moved] = newQ.splice(sourceIdx, 1);
                        newQ.splice(queueIndex, 0, moved);
                        setPlaybackQueue(newQ);
                      }}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`group relative flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedRoomId === room.id
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-slate-300 cursor-grab" />
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-blue-500"
                          >
                            Q{queueIndex + 1}
                          </span>
                          <span className="font-medium text-sm text-slate-700 capitalize">
                            {ROOM_TYPES.find((t) => t.id === room.type)?.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlaybackQueue(q => q.filter((_, i) => i !== queueIndex));
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remove from Queue"
                          >
                            <ListMinus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>"""

# Find the start of the aside content
app = re.sub(
    r'<div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">.*?</div>\s*</div>\s*</aside>',
    sidebar_content + '\n        </aside>',
    app,
    flags=re.DOTALL
)

with open("src/App.tsx", "w") as f:
    f.write(app)
