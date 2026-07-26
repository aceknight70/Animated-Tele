import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, LayoutTemplate, Play, Plus, Square, Trash2, Undo2, Download, Mic, MicOff, MoveRight, Eye, EyeOff, ListPlus, ListMinus, ZoomIn, GripVertical, RefreshCw, Sparkles, Sun, Wand2, RefreshCcw, Type , RectangleHorizontal, RectangleVertical } from 'lucide-react';
import React, { useEffect, useState, useRef } from 'react';
import { PresentationOverlay } from './components/PresentationOverlay';
import { PlaybackDashboard } from './components/PlaybackDashboard';
import { RoomCanvas } from './components/RoomCanvas';
import { ANIMATION_STYLES, CLIENTS, ROOM_TYPES, BACKGROUND_EFFECTS } from './constants';
import { createRoomInDb, deleteRoomInDb, fetchRooms, updateRoomInDb, updateRoomPositions } from './lib/api';
import { supabase } from './lib/supabase';
import { AnimationStyle, Client, PlaybackState, Room, RoomType } from './types';

const generateId = () => crypto.randomUUID();

export default function App() {
  const [selectedClientId, setSelectedClientId] = useState<string>(CLIENTS[0].id);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [showDashboard, setShowDashboard] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'aspect-square' | 'aspect-video' | 'aspect-[9/16]'>('aspect-square');
  const [playCount, setPlayCount] = useState(0);
  const [playbackQueue, setPlaybackQueue] = useState<string[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'master' | 'queue'>('master');
  const [manualProgress, setManualProgress] = useState(1);
  const [history, setHistory] = useState<Room[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [includeMic, setIncludeMic] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
    
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);


  type Action = 
    | { type: 'add'; room: Room }
    | { type: 'delete'; room: Room }
    | { type: 'reorder'; oldRooms: Room[] };
  const [undoStack, setUndoStack] = useState<Action[]>([]);

  const pushUndo = (action: Action) => {
    setUndoStack(prev => {
      const newStack = [...prev, action];
      if (newStack.length > 10) newStack.shift();
      return newStack;
    });
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    try {
      if (lastAction.type === 'add') {
        setRooms(prev => prev.filter(r => r.id !== lastAction.room.id));
        if (selectedRoomId === lastAction.room.id) setSelectedRoomId(null);
        await deleteRoomInDb(lastAction.room.id);
      } else if (lastAction.type === 'delete') {
        setRooms(prev => [...prev, lastAction.room].sort((a, b) => a.position - b.position));
        await createRoomInDb(lastAction.room);
      } else if (lastAction.type === 'reorder') {
        setRooms(lastAction.oldRooms);
        await updateRoomPositions(lastAction.oldRooms.map(r => ({ id: r.id, position: r.position })));
      }
    } catch(err) {
      console.error('Undo failed', err);
      alert('Undo failed: check console');
    }
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) return;
    
    pushUndo({ type: "reorder", oldRooms: [...rooms] });
    
    const sourceIndex = rooms.findIndex(r => r.id === sourceId);
    const targetIndex = rooms.findIndex(r => r.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    
    const newRooms = [...rooms];
    const [movedRoom] = newRooms.splice(sourceIndex, 1);
    newRooms.splice(targetIndex, 0, movedRoom);
    
    const updatedRooms = newRooms.map((r, i) => ({ ...r, position: i }));
    setRooms(updatedRooms);
    
    try {
      await updateRoomPositions(updatedRooms.map(r => ({ id: r.id, position: r.position })));
    } catch (err) {
      console.error("Drag reorder failed", err);
    }
  };

  const getAnimationIcon = (style: string) => {
    switch (style) {
      case "fade": return <Eye size={14} className="text-slate-400" title="Fade" />;
      case "slide": return <MoveRight size={14} className="text-slate-400" title="Slide" />;
      case "zoom": return <ZoomIn size={14} className="text-slate-400" title="Zoom" />;
      case "spin": return <RefreshCw size={14} className="text-slate-400" title="Spin" />;
      case "particle": return <Sparkles size={14} className="text-slate-400" title="Particle" />;
      case "blink": return <Sun size={14} className="text-slate-400" title="Blink" />;
      case "fall": return <ArrowDown size={14} className="text-slate-400" title="Fall Down" />;
      case "materialize": return <Wand2 size={14} className="text-slate-400" title="Materialize" />;
      case "rotate360": return <RefreshCcw size={14} className="text-slate-400" title="360 Rotation" />;
      case "block-drop": return <ArrowDown size={14} className="text-slate-400" title="Block Drop" />;
      case "typewriter": return <Type size={14} className="text-slate-400" title="Typewriter" />;
      default: return null;
    }
  };

  const selectedClient = CLIENTS.find((c) => c.id === selectedClientId) || CLIENTS[0];
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  useEffect(() => {
    loadRooms();
  }, [selectedClientId]);

  useEffect(() => {
    if (playbackState === 'idle' && isExporting && mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
  }, [playbackState, isExporting]);

  const loadRooms = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const fetchedRooms = await fetchRooms(selectedClientId);
      setRooms(fetchedRooms);
      if (fetchedRooms.length > 0) {
        setSelectedRoomId(fetchedRooms[0].id);
      } else {
        setSelectedRoomId(null);
      }
      setHistory([]); // clear history on client switch
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const currentProductRoomsCount = rooms.filter(
    (r) => r.type === 'product' || r.type === 'teleprompter'
  ).length;

  const saveHistory = (currentRooms: Room[]) => {
    setHistory((prev) => [...prev, currentRooms].slice(-10));
  };

  const undo = async () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    
    try {
      // Figure out what changed between `rooms` (current) and `previous`
      const currentIds = new Set(rooms.map(r => r.id));
      const previousIds = new Set(previous.map(r => r.id));

      const added = rooms.filter(r => !previousIds.has(r.id));
      const removed = previous.filter(r => !currentIds.has(r.id));
      
      // Revert deletes (insert removed back)
      for (const r of removed) {
        await createRoomInDb(r);
      }
      
      // Revert creates (delete added)
      for (const r of added) {
        await deleteRoomInDb(r.id);
      }

      // Revert reorders
      const orderChanged = previous.some((p, i) => {
        const c = rooms.find(r => r.id === p.id);
        return c && c.position !== p.position;
      });

      if (orderChanged) {
        await updateRoomPositions(previous.map(r => ({ id: r.id, position: r.position })));
      }

      setRooms(previous);
      setHistory((prev) => prev.slice(0, -1));
      if (!previous.find(r => r.id === selectedRoomId)) {
        setSelectedRoomId(previous[0]?.id || null);
      }
    } catch (err: any) {
      setErrorMsg('Undo failed: ' + err.message);
    }
  };

  const addRoom = async (type: RoomType) => {
    if ((type === 'product' || type === 'teleprompter') && currentProductRoomsCount >= 8) {
      alert('Maximum capacity reached: Up to 8 Product or Teleprompter rooms are allowed.');
      return;
    }

    saveHistory(rooms);

    const newRoom: Room = {
      id: generateId(),
      client_id: selectedClientId,
      type,
      animationStyle: type === 'title' ? 'block-drop' : (type === 'product' ? 'spin' : 'fade'),
      duration: 7,
      teleprompterText: type === 'teleprompter' ? '' : undefined,
      titleText: type === 'title' ? 'New Title' : undefined,
      position: rooms.length,
    };
    
    pushUndo({ type: 'add', room: newRoom });
    // Optimistic update
    const newRooms = [...rooms, newRoom];
    setRooms(newRooms);
    setSelectedRoomId(newRoom.id);

    try {
      await createRoomInDb(newRoom);
    } catch (err: any) {
      setErrorMsg('Failed to create room: ' + err.message);
      // rollback
      setRooms(rooms);
    }
  };

  const deleteRoom = async (id: string) => {
    saveHistory(rooms);
    const filtered = rooms.filter((r) => r.id !== id);
    // re-calculate positions
    const updatedRooms = filtered.map((r, idx) => ({ ...r, position: idx }));
    
    setRooms(updatedRooms);
    if (selectedRoomId === id) {
      setSelectedRoomId(updatedRooms[0]?.id || null);
    }

    try {
      await deleteRoomInDb(id);
      await updateRoomPositions(updatedRooms.map(r => ({ id: r.id, position: r.position })));
    } catch (err: any) {
      setErrorMsg('Failed to delete room: ' + err.message);
      setRooms(rooms);
    }
  };

  const moveRoom = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rooms.length - 1) return;

    saveHistory(rooms);

    const newRooms = [...rooms];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newRooms[index], newRooms[targetIndex]] = [newRooms[targetIndex], newRooms[index]];
    
    // Update positions
    newRooms.forEach((r, idx) => r.position = idx);
    setRooms(newRooms);

    try {
      await updateRoomPositions(newRooms.map(r => ({ id: r.id, position: r.position })));
    } catch (err: any) {
      setErrorMsg('Failed to move room: ' + err.message);
      setRooms(rooms); // rollback
    }
  };

  const updateRoom = async (id: string, updates: Partial<Room>, skipDb: boolean = false) => {
    const roomToUpdate = rooms.find(r => r.id === id);
    if (!roomToUpdate) return;

    const newRooms = rooms.map((r) => (r.id === id ? { ...r, ...updates } : r));
    setRooms(newRooms);

    if (!skipDb) {
      try {
        await updateRoomInDb(newRooms.find(r => r.id === id)!);
      } catch (err: any) {
        setErrorMsg('Failed to update room: ' + err.message);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, roomId: string, roomType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read synchronously before await to prevent upload bugs on mobile/webview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const fileBlob = new Blob([arrayBuffer], { type: file.type });
      const fileName = `${selectedClientId}/${generateId()}-${file.name}`;
      
      try {
        const { data, error } = await supabase.storage.from('ats-images').upload(fileName, fileBlob, {
          contentType: file.type,
          upsert: true
        });
        
        if (error) throw error;

        const imagePath = data.path;
        const imageUrl = supabase.storage.from('ats-images').getPublicUrl(imagePath).data.publicUrl;

        const width = roomType === 'teleprompter' ? 600 : 1200;
        const height = width;


        updateRoom(roomId, { 
          image: imageUrl, 
          image_path: imagePath, 
          image_width: width, 
          image_height: height 
        }, true); 

      } catch (err: any) {
        setErrorMsg(`Upload failed: ${err.message || JSON.stringify(err)}`);
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  const handlePreviewRoom = () => {
    if (!selectedRoom) return;
    setPlayCount((prev) => prev + 1);
    setPlaybackState('previewing');
    setTimeout(() => {
      setPlaybackState((current) => (current === 'previewing' ? 'idle' : current));
    }, selectedRoom.duration * 1000);
  };

  const startVideoExport = async () => {
    // Check iOS Safari support roughly
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      alert("Video export isn't supported in this browser — you can still screen-record the segment manually.");
      return;
    }

    try {
      alert("Please select 'This Tab' (or the current window) in the upcoming screen share prompt to record the video.");
      
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      let micStream: MediaStream | null = null;
      if (includeMic) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          console.warn("Could not get microphone access:", e);
        }
      }

      const tracks = [...displayStream.getVideoTracks()];
      if (includeMic && micStream) {
        tracks.push(...micStream.getAudioTracks());
      } else {
        const audioTracks = displayStream.getAudioTracks();
        if (audioTracks.length > 0) {
          tracks.push(...audioTracks);
        }
      }

      const combinedStream = new MediaStream(tracks);
      
      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      recordedChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = selectedClientId + "-segment-" + new Date().toISOString().split('T')[0] + ".webm";
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);

        // Also export JSON
        const jsonPayload = {
          client: selectedClientId,
          exportDate: new Date().toISOString(),
          totalDuration: rooms.reduce((acc, r) => acc + (r.duration || 7), 0),
          roomsCount: rooms.length
        };
        const jsonBlob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: "application/json" });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonA = document.createElement("a");
        jsonA.style.display = "none";
        jsonA.href = jsonUrl;
        jsonA.download = selectedClientId + "-segment-" + timestamp + ".json";
        document.body.appendChild(jsonA);
        jsonA.click();
        
        setTimeout(() => {
          document.body.removeChild(jsonA);
          window.URL.revokeObjectURL(jsonUrl);
        }, 100);

        
        // Stop all tracks
        combinedStream.getTracks().forEach(track => track.stop());
        displayStream.getTracks().forEach(track => track.stop());
        if (micStream) micStream.getTracks().forEach(track => track.stop());
        
        setIsExporting(false);
      };

      mediaRecorderRef.current = recorder;
      
      // Stop automatically if user stops screen sharing
      displayStream.getVideoTracks()[0].onended = () => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      };

      recorder.start();
      setIsExporting(true);
      setPlaybackState('playingAll');
      
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setErrorMsg(`Failed to start recording: ${err.message}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-500 font-sans">
        Loading rooms...
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* HEADER */}
      <header className="min-h-[4rem] py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between px-6 shrink-0 shadow-sm z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-white">
            <LayoutTemplate size={18} />
          </div>
          <h1 className="font-bold text-lg tracking-tight hidden sm:block">Animated Template Studio</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-500">Client:</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-slate-100 border-none rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {CLIENTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg mr-2 border border-slate-200">
              <button onClick={() => setAspectRatio('aspect-video')} className={`p-1.5 rounded-md ${aspectRatio === 'aspect-video' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Widescreen (16:9)"><RectangleHorizontal size={18} /></button>
              <button onClick={() => setAspectRatio('aspect-square')} className={`p-1.5 rounded-md ${aspectRatio === 'aspect-square' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Square (1:1)"><Square size={18} /></button>
              <button onClick={() => setAspectRatio('aspect-[9/16]')} className={`p-1.5 rounded-md ${aspectRatio === 'aspect-[9/16]' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Portrait (9:16)"><RectangleVertical size={18} /></button>
            </div>
            <button
              onClick={() => setPlaybackState('playingAll')}
              disabled={rooms.length === 0 || isExporting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-full font-medium shadow-sm transition-all"
              title="Run selected lineup or visible rooms"
            >
              <Play size={16} fill="currentColor" />
              {playbackQueue.length > 0 ? "Run Queue" : "Run Segment"}
            </button>
            <button
              onClick={() => setShowDashboard(true)}
              disabled={rooms.length === 0 || isExporting}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-full font-medium shadow-sm transition-all"
            >
              <LayoutTemplate size={16} />
              Playback Dashboard
            </button>
          </div>
        </div>
      </header>
      
      {errorMsg && (
        <div className="bg-red-500 text-white px-4 py-2 text-sm text-center">
          {errorMsg}
        </div>
      )}

      {/* MAIN LAYOUT */}
      <main className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory">
        {/* LEFT SIDEBAR: Room Sequence */}
        <aside className="w-[100vw] sm:w-[85vw] md:w-72 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 snap-center overflow-x-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col gap-3 bg-white">
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
                  title="Run selected lineup or visible rooms"
                >
                  <Play size={14} fill="currentColor" /> {playbackQueue.length > 0 ? "Run Queue" : "Run Segment"}
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
          </div>
          
          <div className="p-4 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
            <h3 className="font-medium text-xs text-slate-500 uppercase tracking-wider mb-3">Add to Sequence</h3>
            <div className="grid grid-cols-2 gap-2">
              {ROOM_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => addRoom(type.id)}
                  title={type.description}
                  className="flex items-center justify-center gap-1.5 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors"
                >
                  <Plus size={14} />
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

                {/* CENTER CANVAS: Preview Area */}
        <section className="w-[100vw] sm:w-[85vw] md:w-auto md:flex-1 md:min-w-[500px] relative bg-slate-200 flex flex-col shrink-0 snap-center overflow-x-hidden">
          <div className="flex-1 p-4 md:p-8 flex flex-col items-center overflow-y-auto overflow-x-hidden min-h-0 gap-8 snap-y snap-mandatory scroll-smooth pb-[50vh] w-full max-w-full">
            {rooms.length > 0 ? rooms.map((room) => (
              <div 
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`w-full ${aspectRatio === "aspect-video" ? "max-w-[800px] lg:max-w-[1000px]" : aspectRatio === "aspect-[9/16]" ? "max-w-[400px] lg:max-w-[450px]" : "max-w-[500px] lg:max-w-[700px]"} ${aspectRatio} bg-white rounded-xl overflow-hidden shadow-2xl relative shadow-slate-400/50 shrink-0 transition-all duration-500 flex items-center justify-center snap-center cursor-pointer ${selectedRoomId === room.id ? 'ring-4 ring-blue-500' : ''}`}
              >
                <RoomCanvas
                  room={room}
                  client={selectedClient}
                  isPlaying={playbackState === 'previewing' && selectedRoomId === room.id}
                  playCount={playCount}
                  manualProgress={selectedRoomId === room.id ? manualProgress : 0}
                />
              </div>
            )) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <LayoutTemplate size={48} className="mb-4 opacity-50" />
                <p className="font-medium text-lg text-slate-600">No Rooms Available</p>
                <p className="text-sm opacity-70 mt-1">Add a room to begin</p>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT SIDEBAR: Editor */}
        <aside className="w-[100vw] sm:w-[85vw] md:w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 snap-center overflow-x-hidden">
          {selectedRoom ? (
            <>
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800 text-lg">Room Properties</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {ROOM_TYPES.find((t) => t.id === selectedRoom.type)?.label}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* Duration Control */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-700">Duration</label>
                    <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {selectedRoom.duration}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="10"
                    step="1"
                    value={selectedRoom.duration}
                    onChange={(e) => updateRoom(selectedRoom.id, { duration: parseInt(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>5s</span>
                    <span>10s</span>
                  </div>
                </div>

                {/* Animation Style and Speed */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 block">Entrance Animation</label>
                    <select
                      value={selectedRoom.animationStyle}
                      onChange={(e) => updateRoom(selectedRoom.id, { animationStyle: e.target.value as AnimationStyle })}
                      className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      {ANIMATION_STYLES.filter(s => selectedRoom.type === 'title' ? s.forTitle : !s.forTitle).map((style) => (
                        <option key={style.id} value={style.id}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedRoom.type !== 'title' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 flex justify-between">
                        <span>Speed Multiplier</span>
                        <span className="text-slate-500 font-mono">{(selectedRoom.speedMultiplier ?? 1).toFixed(2)}x</span>
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="3.0"
                        step="0.01"
                        value={selectedRoom.speedMultiplier ?? 1}
                        onChange={(e) => updateRoom(selectedRoom.id, { speedMultiplier: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                        title="Drag to smoothly adjust animation speed"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1 mt-1">
                        <span>0.1x</span>
                        <span>1.0x</span>
                        <span>3.0x</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Background Selector & Color */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Background Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={selectedRoom.backgroundColor || '#ffffff'}
                        onChange={(e) => updateRoom(selectedRoom.id, { backgroundColor: e.target.value })}
                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0 m-0"
                        title="Choose background color"
                      />
                      <span className="text-sm text-slate-500 uppercase">{selectedRoom.backgroundColor || '#ffffff'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Background Effect</label>
                    <select
                      value={selectedRoom.backgroundEffect || 'none'}
                      onChange={(e) => updateRoom(selectedRoom.id, { backgroundEffect: e.target.value })}
                      className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      {BACKGROUND_EFFECTS.map((effect) => (
                        <option key={effect.id} value={effect.id}>
                          {effect.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Title Text Input (for Title Room) */}
                {selectedRoom.type === 'title' && (
                  <div className="space-y-2 flex flex-col h-32">
                    <label className="text-sm font-medium text-slate-700 block">
                      Title Text
                    </label>
                    <textarea
                      value={selectedRoom.titleText || ''}
                      onChange={(e) => updateRoom(selectedRoom.id, { titleText: e.target.value })}
                      placeholder="Enter title here..."
                      className="flex-1 w-full border border-slate-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                )}

                {/* Image Upload (for Logo, Product, Teleprompter, Custom) */}
                {selectedRoom.type !== 'title' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 block">
                      {selectedRoom.type === 'logo' ? 'Logo Image (Optional)' : 'Image'}
                    </label>
                    <div className="text-xs text-slate-500 mb-2">
                      {selectedRoom.type === 'teleprompter' ? 'Target size: 600x600px' : 
                       selectedRoom.type === 'logo' ? 'Transparent PNG recommended' :
                       'Target size: 1200x1200px'}
                    </div>
                    <label className="block w-full border-2 border-dashed border-slate-300 bg-white rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, selectedRoom.id, selectedRoom.type)}
                        className="hidden"
                      />
                      <div className="text-sm font-medium text-blue-600">Click to upload</div>
                      <div className="text-xs text-slate-400 mt-1">PNG, JPG, WebP</div>
                    </label>
                    {selectedRoom.image && (
                      <div className="mt-2 flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div> Image loaded
                        </span>
                        <button 
                          onClick={() => updateRoom(selectedRoom.id, { image: null, image_path: null, image_width: null, image_height: null })}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Teleprompter Script */}
                {(selectedRoom.type === 'teleprompter' || selectedRoom.type === 'custom') && (
                  <div className="space-y-2 flex flex-col h-72">
                    <label className="text-sm font-medium text-slate-700 block">
                      Teleprompter Script
                    </label>
                    <textarea
                      value={selectedRoom.teleprompterText || ''}
                      onChange={(e) => updateRoom(selectedRoom.id, { teleprompterText: e.target.value })}
                      placeholder="Enter the script text here..."
                      className="flex-1 w-full border border-slate-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    <div className="pt-2">
                      <label className="text-xs font-medium text-slate-500 flex justify-between">
                        <span>Preview Effect</span>
                        <span>{Math.round(manualProgress * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={manualProgress}
                        onChange={(e) => setManualProgress(parseFloat(e.target.value))}
                        className="w-full accent-blue-500 mt-1"
                      />
                    </div>
                  </div>
                )}
                
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 p-8 text-center">
              Select or add a room to edit properties.
            </div>
          )}
        </aside>
      </main>

      {/* PLAYBACK DASHBOARD */}
      {showDashboard && (
        <PlaybackDashboard
          rooms={rooms}
          client={selectedClient}
          playbackQueue={playbackQueue}
          setPlaybackQueue={setPlaybackQueue}
          onClose={() => setShowDashboard(false)}
          onPlay={() => {
            setShowDashboard(false);
            setPlaybackState('playingAll');
          }}
        />
      )}

      {/* PRESENTATION OVERLAY */}
      {playbackState === 'playingAll' && (
        <PresentationOverlay
          rooms={playbackQueue.length > 0 ? (playbackQueue.map(id => rooms.find(r => r.id === id)).filter(Boolean) as Room[]) : rooms.filter(r => !r.hidden)}
          client={selectedClient}
          onClose={() => setPlaybackState('idle')}
          autoRead={true}
          aspectRatio={aspectRatio}
        />
      )}
    </div>
  );
}
