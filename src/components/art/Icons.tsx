// Update 2: one icon set for the whole game. Flat vector, thick dark-brown outline, warm timber palette.
import type { ReactElement } from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

export const INK = '#3a2210'; // outline colour for every drawing
export const PAL = {
  bark: '#7a4f2a', wood: '#c99a5b', woodLight: '#f1d49c', pine: '#2f7040', pineLight: '#4f9a4f',
  gold: '#f5c542', goldDark: '#d99a1e', sky: '#8fd0ec', cream: '#fff8ea', red: '#d1462f', steel: '#c9d3dc',
};
const SW = 2.2; // one line weight

export type IconName =
  | 'money' | 'gold' | 'wood' | 'planks' | 'wps' | 'tools' | 'helpers' | 'land' | 'market' | 'buildings' | 'shop' | 'home'
  | 'goals' | 'settings' | 'up' | 'down' | 'flat' | 'frenzy' | 'sun' | 'rain' | 'snow' | 'storm' | 'seller' | 'lock';

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {DRAW[name]}
    </Svg>
  );
}

const DRAW: Record<IconName, ReactElement> = {
  money: (
    <G>
      <Rect x="3" y="8" width="26" height="16" rx="3" fill={PAL.pineLight} stroke={INK} strokeWidth={SW} />
      <Circle cx="16" cy="16" r="4.5" fill={PAL.woodLight} stroke={INK} strokeWidth={1.6} />
      <Path d="M16 13.5 v5 M14.6 14.6 q1.4 -1 2.8 0 q-2.8 1.4 0 2.8 q-1.4 1 -2.8 0" stroke={INK} strokeWidth={1.2} fill="none" />
      <Circle cx="7.5" cy="16" r="1.4" fill={INK} /><Circle cx="24.5" cy="16" r="1.4" fill={INK} />
    </G>
  ),
  gold: (
    <G>
      <Circle cx="16" cy="16" r="12" fill={PAL.gold} stroke={INK} strokeWidth={SW} />
      <Circle cx="16" cy="16" r="8" fill="none" stroke={PAL.goldDark} strokeWidth={1.8} />
      <Path d="M19.5 13 q-1.5 -2 -3.8 -2 q-4 0 -4 5 q0 5 4 5 q3.6 0 3.8 -4 h-3.4" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
    </G>
  ),
  wood: (
    <G>
      <Path d="M6 11 h18 a5 6 0 0 1 0 12 h-18 z" fill={PAL.bark} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Ellipse cx="6" cy="17" rx="4.5" ry="6" fill={PAL.woodLight} stroke={INK} strokeWidth={SW} />
      <Ellipse cx="6" cy="17" rx="2" ry="3" fill="none" stroke={PAL.wood} strokeWidth={1.4} />
      <Path d="M13 14 h7 M15 20 h6" stroke={INK} strokeOpacity={0.4} strokeWidth={1.4} strokeLinecap="round" />
    </G>
  ),
  planks: (
    <G>
      <Rect x="4" y="18" width="24" height="6" rx="1.5" fill={PAL.wood} stroke={INK} strokeWidth={SW} />
      <Rect x="6" y="12" width="22" height="6" rx="1.5" fill={PAL.woodLight} stroke={INK} strokeWidth={SW} />
      <Rect x="4" y="6" width="22" height="6" rx="1.5" fill={PAL.wood} stroke={INK} strokeWidth={SW} />
      <Path d="M9 9 h8 M11 15 h9 M9 21 h10" stroke={INK} strokeOpacity={0.35} strokeWidth={1.2} />
    </G>
  ),
  wps: (
    <G>
      <Polygon points="18,3 7,18 15,18 12,29 25,12 17,12" fill={PAL.gold} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
    </G>
  ),
  frenzy: (
    <G>
      <Circle cx="16" cy="16" r="13" fill={PAL.red} stroke={INK} strokeWidth={SW} />
      <Polygon points="18,5 9,18 15,18 13,27 23,13 17,13" fill={PAL.gold} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
    </G>
  ),
  tools: (
    <G>
      <Path d="M8 26 L22 8" stroke={PAL.bark} strokeWidth={4} strokeLinecap="round" />
      <Path d="M8 26 L22 8" stroke={INK} strokeWidth={1} strokeLinecap="round" opacity={0.4} />
      <Path d="M18 5 L27 4 Q30 11 24 15 L20 11 Z" fill={PAL.steel} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M24 26 L10 12" stroke={PAL.bark} strokeWidth={4} strokeLinecap="round" />
      <Rect x="3" y="6" width="11" height="5" rx="1" fill={PAL.steel} stroke={INK} strokeWidth={1.8} transform="rotate(45 8.5 8.5)" />
    </G>
  ),
  helpers: (
    <G>
      <Path d="M6 27 q0 -9 10 -9 q10 0 10 9 z" fill={PAL.red} stroke={INK} strokeWidth={SW} />
      <Circle cx="16" cy="13" r="6" fill="#f2c79b" stroke={INK} strokeWidth={SW} />
      <Path d="M8 11 q8 -11 16 0 z" fill={PAL.gold} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Rect x="6.5" y="10" width="19" height="3" rx="1.5" fill={PAL.gold} stroke={INK} strokeWidth={1.6} />
    </G>
  ),
  land: (
    <G>
      <Path d="M2 26 Q10 14 18 22 Q24 16 30 24 L30 28 L2 28 Z" fill={PAL.pineLight} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Polygon points="11,4 17,15 14,15 18,21 4,21 8,15 5,15" fill={PAL.pine} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M24 6 v10 M24 6 l5 2 l-5 2" stroke={INK} strokeWidth={1.8} fill={PAL.red} strokeLinejoin="round" />
    </G>
  ),
  market: (
    <G>
      <Rect x="5" y="14" width="22" height="13" rx="1.5" fill={PAL.woodLight} stroke={INK} strokeWidth={SW} />
      <Path d="M3 14 L6 6 H26 L29 14 Z" fill={PAL.red} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M9.5 6 L8.5 14 M16 6 v8 M22.5 6 l1 8" stroke={INK} strokeWidth={1.4} />
      <Path d="M9 23 l4 -4 l3 2 l6 -6" stroke={PAL.pine} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </G>
  ),
  buildings: (
    <G>
      <Rect x="4" y="14" width="24" height="14" fill={PAL.wood} stroke={INK} strokeWidth={SW} />
      <Path d="M2 15 L16 5 L30 15 Z" fill={PAL.bark} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Rect x="13" y="19" width="6" height="9" fill={PAL.bark} stroke={INK} strokeWidth={1.6} />
      <Circle cx="9" cy="19" r="2.5" fill={PAL.steel} stroke={INK} strokeWidth={1.4} />
    </G>
  ),
  shop: (
    <G>
      <Path d="M6 11 h20 l-2 17 h-16 z" fill={PAL.gold} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M11 13 v-4 a5 5 0 0 1 10 0 v4" stroke={INK} strokeWidth={SW} fill="none" strokeLinecap="round" />
      <Path d="M13 19 l3 3 l4 -5" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
    </G>
  ),
  home: (
    <G>
      <Rect x="14" y="22" width="4" height="7" fill={PAL.bark} stroke={INK} strokeWidth={1.6} />
      <Polygon points="16,3 25,14 21,14 27,23 5,23 11,14 7,14" fill={PAL.pineLight} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
    </G>
  ),
  goals: (
    <G>
      <Circle cx="16" cy="16" r="12" fill={PAL.cream} stroke={INK} strokeWidth={SW} />
      <Circle cx="16" cy="16" r="7.5" fill={PAL.red} stroke={INK} strokeWidth={1.6} />
      <Circle cx="16" cy="16" r="3" fill={PAL.cream} stroke={INK} strokeWidth={1.4} />
    </G>
  ),
  settings: (
    <G>
      <Path d="M14 3 h4 l1 4 l3.5 1.5 l3.5 -2 l3 3 l-2 3.5 l1.5 3.5 l4 1 v4 l-4 1 l-1.5 3.5 l2 3.5 l-3 3 l-3.5 -2 l-3.5 1.5 l-1 4 h-4 l-1 -4 l-3.5 -1.5 l-3.5 2 l-3 -3 l2 -3.5 l-1.5 -3.5 l-4 -1 v-4 l4 -1 l1.5 -3.5 l-2 -3.5 l3 -3 l3.5 2 l3.5 -1.5 z" transform="scale(0.9) translate(1.8 1.8)" fill={PAL.steel} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Circle cx="16" cy="16" r="4.5" fill={PAL.cream} stroke={INK} strokeWidth={SW} />
    </G>
  ),
  up: <Polygon points="16,6 27,22 5,22" fill={PAL.pineLight} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />,
  down: <Polygon points="16,26 27,10 5,10" fill={PAL.red} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />,
  flat: <Rect x="5" y="13" width="22" height="6" rx="3" fill={PAL.steel} stroke={INK} strokeWidth={SW} />,
  sun: (
    <G>
      {Array.from({ length: 8 }, (_, i) => <Path key={i} d="M16 2 v5" stroke={PAL.goldDark} strokeWidth={2.4} strokeLinecap="round" transform={`rotate(${i * 45} 16 16)`} />)}
      <Circle cx="16" cy="16" r="7" fill={PAL.gold} stroke={INK} strokeWidth={SW} />
    </G>
  ),
  rain: (
    <G>
      <Path d="M8 18 a5 5 0 0 1 2 -9.6 a7 7 0 0 1 13 1.6 a4 4 0 0 1 1 8 z" fill={PAL.cream} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M11 22 l-1.5 4 M17 22 l-1.5 4 M23 22 l-1.5 4" stroke={PAL.sky} strokeWidth={2.6} strokeLinecap="round" />
    </G>
  ),
  snow: (
    <G>
      <Path d="M8 18 a5 5 0 0 1 2 -9.6 a7 7 0 0 1 13 1.6 a4 4 0 0 1 1 8 z" fill={PAL.cream} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {[10, 16, 22].map((x) => <Circle key={x} cx={x} cy={24} r={1.8} fill="#fff" stroke={INK} strokeWidth={1} />)}
    </G>
  ),
  storm: (
    <G>
      <Path d="M8 17 a5 5 0 0 1 2 -9.6 a7 7 0 0 1 13 1.6 a4 4 0 0 1 1 8 z" fill={PAL.steel} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Polygon points="17,17 12,24 16,24 14,30 21,21 17,21" fill={PAL.gold} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
    </G>
  ),
  seller: (
    <G>
      <Path d="M6 27 q0 -9 10 -9 q10 0 10 9 z" fill={PAL.pine} stroke={INK} strokeWidth={SW} />
      <Path d="M14 18 l2 5 l2 -5" fill={PAL.gold} stroke={INK} strokeWidth={1.2} />
      <Circle cx="16" cy="12" r="6" fill="#f2c79b" stroke={INK} strokeWidth={SW} />
      <Path d="M10 10 q6 -7 12 0" fill="none" stroke={INK} strokeWidth={2.4} />
      <Circle cx="26" cy="8" r="4.5" fill={PAL.gold} stroke={INK} strokeWidth={1.6} />
    </G>
  ),
  lock: (
    <G>
      <Path d="M10 14 v-4 a6 6 0 0 1 12 0 v4" stroke={INK} strokeWidth={2.6} fill="none" />
      <Rect x="7" y="14" width="18" height="14" rx="3" fill={PAL.gold} stroke={INK} strokeWidth={SW} />
      <Circle cx="16" cy="21" r="2" fill={INK} />
    </G>
  ),
};

// Update 4: a log for each tree type (pine brown, oak dark, crystal blue, glass clear, diamond white, golden, rainbow Starwood)
import { WOOD, WoodType } from '../../game/data';
export function LogIcon({ type = 'pine', size = 24 }: { type?: WoodType; size?: number }) {
  const w = WOOD[type] ?? WOOD.pine;
  const rainbow = type === 'starwood';
  const clear = type === 'glass';
  const shine = type === 'crystal' || type === 'diamond' || type === 'golden' || rainbow;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {shine && <Circle cx="16" cy="17" r="14" fill={type === 'golden' ? '#ffe27a' : type === 'crystal' ? '#8fd8ff' : '#ffffff'} opacity={0.45} />}
      <Path d="M6 11 h18 a5 6 0 0 1 0 12 h-18 z" fill={w.bark} fillOpacity={clear ? 0.55 : 1} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {rainbow && (
        <G>
          <Path d="M7 13 h18" stroke="#ff5a7a" strokeWidth={2} />
          <Path d="M7 16 h19" stroke="#ffb03a" strokeWidth={2} />
          <Path d="M7 19 h19" stroke="#6fd25a" strokeWidth={2} />
          <Path d="M7 22 h18" stroke="#5ab0ff" strokeWidth={1.6} />
        </G>
      )}
      {clear && <Path d="M10 13 L20 21" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />}
      <Ellipse cx="6" cy="17" rx="4.5" ry="6" fill={w.end} fillOpacity={clear ? 0.7 : 1} stroke={INK} strokeWidth={SW} />
      <Ellipse cx="6" cy="17" rx="2" ry="3" fill="none" stroke={w.ring} strokeWidth={1.4} />
      {!rainbow && !clear && <Path d="M13 14 h7 M15 20 h6" stroke={INK} strokeOpacity={0.4} strokeWidth={1.4} strokeLinecap="round" />}
      {shine && <Path d="M26 3 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2 z" fill="#fff" stroke={INK} strokeWidth={0.8} />}
    </Svg>
  );
}
