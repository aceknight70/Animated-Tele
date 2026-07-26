import { Room } from '../types';
import { supabase } from './supabase';

export const fetchRooms = async (clientId: string): Promise<Room[]> => {
  const { data, error } = await supabase
    .from('ats_rooms')
    .select('*')
    .eq('client_id', clientId)
    .order('position', { ascending: true });
    
  if (error) {
    console.error('Error fetching rooms:', error);
    throw new Error(error.message || 'Failed to load rooms from database.');
  }

  return data.map((row: any) => {
    let animationStyle = row.animation_style;
    if (row.kind === 'title') {
      animationStyle = row.title_animation_style;
    }
    
    let animationSpeed = 'gentle';
    let backgroundEffect = 'none';
    let backgroundColor = '#ffffff';
    let speedMultiplier = 1;
    let hidden = false;
    try {
      if (row.name && row.name.startsWith('{')) {
        const parsed = JSON.parse(row.name);
        animationSpeed = parsed.speed || 'gentle';
        backgroundEffect = parsed.bg || 'none';
        backgroundColor = parsed.color || '#ffffff';
        speedMultiplier = parsed.speedMultiplier ?? 1;
        hidden = parsed.hidden ?? false;
      } else {
        animationSpeed = row.name || 'gentle';
      }
    } catch(e) {}

    return {
      id: row.id,
      client_id: row.client_id,
      type: row.kind === 'teleprompter_product' ? 'teleprompter' : row.kind,
      animationStyle: animationStyle || 'fade', // fallback
      animationSpeed: animationSpeed as 'gentle' | 'fast',
      backgroundEffect,
      backgroundColor,
      speedMultiplier,
      hidden,
      duration: row.duration_seconds || 7,
      teleprompterText: row.script,
      titleText: row.title_text,
      image_path: row.image_path,
      image_width: row.image_width,
      image_height: row.image_height,
      position: row.position,
      image: row.image_path ? supabase.storage.from('ats-images').getPublicUrl(row.image_path).data.publicUrl : undefined,
    };
  });
};

export const createRoomInDb = async (room: Room): Promise<any> => {
  const nameJson = JSON.stringify({
    speed: room.animationSpeed || 'gentle',
    bg: room.backgroundEffect || 'none',
    color: room.backgroundColor || '#ffffff',
    speedMultiplier: room.speedMultiplier ?? 1,
    hidden: room.hidden ?? false
  });

  const payload: any = {
    id: room.id,
    client_id: room.client_id,
    kind: room.type === 'teleprompter' ? 'teleprompter_product' : room.type,
    name: nameJson,
    duration_seconds: room.duration,
    position: room.position,
  };

  if (room.type === 'title') {
    payload.title_text = room.titleText;
    payload.title_animation_style = room.animationStyle;
    payload.animation_style = 'fade'; // fallback
  } else {
    payload.animation_style = room.animationStyle;
    if (room.teleprompterText !== undefined) payload.script = room.teleprompterText;
    if (room.image_path !== undefined) payload.image_path = room.image_path;
    if (room.image_width !== undefined) payload.image_width = room.image_width;
    if (room.image_height !== undefined) payload.image_height = room.image_height;
  }

  const { data, error } = await supabase.from('ats_rooms').insert(payload).select().single();
  
  if (error) {
    console.error('Insert error:', error);
    throw new Error(`DB Error: ${error.message} - Details: ${error.details || ''} - Hint: ${error.hint || ''}`);
  }
  return data;
};

export const updateRoomInDb = async (room: Room): Promise<void> => {
  const payload: any = {};
  payload.kind = room.type === 'teleprompter' ? 'teleprompter_product' : room.type;
  
  const nameJson = JSON.stringify({
    speed: room.animationSpeed || 'gentle',
    bg: room.backgroundEffect || 'none',
    color: room.backgroundColor || '#ffffff',
    speedMultiplier: room.speedMultiplier ?? 1,
    hidden: room.hidden ?? false
  });
  payload.name = nameJson;
  
  if (room.type === 'title') {
    payload.title_animation_style = room.animationStyle;
  } else {
    payload.animation_style = room.animationStyle;
  }
  
  payload.duration_seconds = room.duration;
  payload.script = room.teleprompterText || null;
  payload.title_text = room.titleText || null;
  payload.image_path = room.image_path || null;
  payload.image_width = room.image_width || null;
  payload.image_height = room.image_height || null;
  payload.position = room.position;

  const { error } = await supabase.from('ats_rooms').update(payload).eq('id', room.id);
  if (error) {
    console.error('Update error:', JSON.stringify(error));
    throw new Error(`DB Error: ${error.message} - Details: ${error.details || ''} - Hint: ${error.hint || ''}`);
  }
};

export const deleteRoomInDb = async (id: string): Promise<void> => {
  const { error } = await supabase.from('ats_rooms').delete().eq('id', id);
  if (error) {
    console.error('Delete error:', JSON.stringify(error));
    throw new Error(`DB Error: ${error.message} - Details: ${error.details || ''} - Hint: ${error.hint || ''}`);
  }
};

// Batch update positions for reordering
export const updateRoomPositions = async (rooms: {id: string, position: number}[]): Promise<void> => {
  if (rooms.length === 0) return;
  
  const promises = rooms.map(r => supabase.from('ats_rooms').update({ position: r.position }).eq('id', r.id));
  const results = await Promise.all(promises);
  const error = results.find(r => r.error)?.error;
  if (error) {
    console.error('Reorder error:', JSON.stringify(error));
    throw new Error(`DB Error: ${error.message} - Details: ${error.details || ''} - Hint: ${error.hint || ''}`);
  }
};
