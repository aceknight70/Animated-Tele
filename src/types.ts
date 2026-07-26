export type Client = {
  id: string;
  name: string;
  color: string;
  logoText: string;
};

export type RoomType = 'logo' | 'product' | 'teleprompter' | 'custom' | 'title';

export type AnimationStyle = 'fade' | 'slide' | 'zoom' | 'spin' | 'particle' | 'blink' | 'fall' | 'materialize' | 'rotate360' | 'block-drop' | 'typewriter';

export interface Room {
  id: string; // db id
  client_id: string; // db client_id
  type: RoomType;
  image?: string | null; // Display URL
  image_path?: string | null; // db image_path
  image_width?: number | null; // db image_width
  image_height?: number | null; // db image_height
  animationStyle: AnimationStyle;
  animationSpeed?: 'gentle' | 'fast';
  backgroundEffect?: string;
  backgroundColor?: string;
  speedMultiplier?: number;
  hidden?: boolean;
  duration: number; // 5 to 10 seconds
  teleprompterText?: string;
  titleText?: string;
  position: number;
}

export type PlaybackState = 'idle' | 'previewing' | 'playingAll';
