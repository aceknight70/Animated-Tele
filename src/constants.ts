import { AnimationStyle, Client, RoomType } from './types';

export const CLIENTS: Client[] = [
  { id: 'jotra', name: 'Jotra Interiors', color: '#0ea5e9', logoText: 'JOTRA' }, // Light Blue
  { id: 'hitech', name: 'HiTech Distributors', color: '#ef4444', logoText: 'HITECH' }, // Red
  { id: 'ofrank', name: 'O Frank Electronics', color: '#22c55e', logoText: 'O FRANK' }, // Green
];

export const ANIMATION_STYLES: { id: AnimationStyle; label: string; forTitle?: boolean }[] = [
  { id: 'fade', label: 'Fade Reveal' },
  { id: 'slide', label: 'Slide Glide' },
  { id: 'zoom', label: 'Zoom Pulse' },
  { id: 'spin', label: 'Spin Showcase' },
  { id: 'particle', label: 'Particle Drift' },
  { id: 'blink', label: 'Blink' },
  { id: 'fall', label: 'Fall Down' },
  { id: 'materialize', label: 'Materialize' },
  { id: 'rotate360', label: '360° Rotation' },
  { id: 'block-drop', label: 'Block Drop', forTitle: true },
  { id: 'typewriter', label: 'Typewriter Cascade', forTitle: true },
];

export const ROOM_TYPES: { id: RoomType; label: string; description: string }[] = [
  { id: 'logo', label: 'Logo Room', description: 'Shows client logo. No image.' },
  { id: 'product', label: 'Product Room', description: 'Full image reveal (1200x1200). No text.' },
  { id: 'teleprompter', label: 'Teleprompter + Product', description: 'Image (600x600) + scrolling script.' },
  { id: 'title', label: 'Title Room', description: 'On-screen text title headers.' },
  { id: 'custom', label: 'Custom Room', description: 'Freeform image and script.' },
];

export const BACKGROUND_EFFECTS = [
  { id: 'none', label: 'None / Solid' },
  { id: 'twinkle', label: 'Twinkling Lights' },
  { id: 'confetti', label: 'Confetti Fall' },
  { id: 'sparkle', label: 'Sprinkle Sparkle' },
  { id: 'gradient', label: 'Rainbow Gradient Flow' },
  { id: 'bokeh', label: 'Bokeh Drift' },
  { id: 'glow', label: 'Warm Interior Glow' },
  { id: 'bubbles', label: 'Floating Bubbles' },
];
