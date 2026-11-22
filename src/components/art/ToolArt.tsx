// Update 2: every tool drawn in the same flat style as the icons.
import type { ReactElement } from 'react';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import { INK, PAL } from './Icons';

const SW = 2;
const ART: Record<string, ReactElement> = {
  sharpstone: (
    <G>
      <Ellipse cx="20" cy="30" rx="16" ry="4" fill="#000" opacity={0.15} />
      <Path d="M6 22 L30 14 L36 20 L12 28 Z" fill="#8d939a" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M10 22 L28 16" stroke="#c3c8cd" strokeWidth={2} />
      <Path d="M24 4 l3 6 M30 6 l-1 6" stroke={PAL.sky} strokeWidth={2} strokeLinecap="round" />
    </G>
  ),
  handsaw: (
    <G>
      <Path d="M4 26 L28 14 L32 22 L8 32 Z" fill={PAL.steel} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M8 32 l2 -3 l2 2 l2 -3 l2 2 l2 -3 l2 2 l2 -3 l2 2 l2 -3 l2 2" stroke={INK} strokeWidth={1.2} fill="none" />
      <Path d="M28 10 h8 v14 h-6 z" fill={PAL.red} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Rect x="31" y="14" width="3" height="6" rx="1.5" fill={PAL.cream} />
    </G>
  ),
  handle: (
    <G>
      <Path d="M8 34 Q14 20 30 6" stroke={PAL.bark} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Path d="M8 34 Q14 20 30 6" stroke={INK} strokeWidth={1.2} strokeLinecap="round" fill="none" opacity={0.5} />
      {[14, 19, 24].map((y, i) => <Path key={y} d={`M${10 + i * 3} ${y + 12} l5 -3`} stroke={PAL.gold} strokeWidth={2.4} />)}
    </G>
  ),
  chainsaw: (
    <G>
      <Rect x="4" y="14" width="18" height="14" rx="3" fill="#f07a1f" stroke={INK} strokeWidth={SW} />
      <Path d="M6 14 q4 -8 12 0" stroke={INK} strokeWidth={2.4} fill="none" />
      <Rect x="21" y="18" width="16" height="6" rx="3" fill={PAL.steel} stroke={INK} strokeWidth={SW} />
      <Path d="M22 18 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2" stroke={INK} strokeWidth={1} fill="none" />
    </G>
  ),
  splitter: (
    <G>
      <Ellipse cx="20" cy="30" rx="12" ry="5" fill={PAL.woodLight} stroke={INK} strokeWidth={SW} />
      <Path d="M8 30 v-6 a12 5 0 0 1 24 0 v6" fill={PAL.bark} stroke={INK} strokeWidth={SW} />
      <Polygon points="16,4 24,4 22,24 18,24" fill={PAL.steel} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
    </G>
  ),
  chipper: (
    <G>
      <Rect x="4" y="16" width="24" height="14" rx="3" fill={PAL.pine} stroke={INK} strokeWidth={SW} />
      <Polygon points="4,16 0,6 12,6 14,16" fill={PAL.pineLight} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M28 18 L38 8 L40 12 L30 22 Z" fill="#555" stroke={INK} strokeWidth={1.6} />
      <Circle cx="10" cy="32" r="4" fill="#333" stroke={INK} strokeWidth={1.4} /><Circle cx="22" cy="32" r="4" fill="#333" stroke={INK} strokeWidth={1.4} />
    </G>
  ),
  truck: (
    <G>
      {[0, 1].map((i) => <Rect key={i} x="2" y={12 + i * 6} width="22" height="6" rx="3" fill={i ? PAL.wood : PAL.bark} stroke={INK} strokeWidth={1.4} />)}
      <Rect x="2" y="24" width="24" height="4" fill="#444" />
      <Rect x="24" y="12" width="14" height="16" rx="2" fill={PAL.red} stroke={INK} strokeWidth={SW} />
      <Rect x="27" y="15" width="8" height="5" fill={PAL.sky} stroke={INK} strokeWidth={1} />
      {[8, 20, 32].map((x) => <Circle key={x} cx={x} cy="31" r="4" fill="#222" stroke={INK} strokeWidth={1.4} />)}
    </G>
  ),
  crane: (
    <G>
      <Rect x="6" y="30" width="18" height="6" rx="2" fill={PAL.gold} stroke={INK} strokeWidth={SW} />
      <Rect x="12" y="8" width="6" height="22" fill={PAL.goldDark} stroke={INK} strokeWidth={1.6} />
      <Path d="M8 8 h28" stroke={INK} strokeWidth={3} />
      <Path d="M32 8 v12" stroke={INK} strokeWidth={1.2} />
      <Rect x="26" y="20" width="12" height="5" rx="2.5" fill={PAL.bark} stroke={INK} strokeWidth={1.2} />
    </G>
  ),
  harvester: (
    <G>
      <Rect x="2" y="18" width="24" height="12" rx="3" fill={PAL.red} stroke={INK} strokeWidth={SW} />
      <Rect x="14" y="8" width="11" height="10" rx="2" fill={PAL.red} stroke={INK} strokeWidth={SW} />
      <Rect x="16" y="10" width="7" height="5" fill={PAL.sky} />
      <Rect x="1" y="30" width="26" height="6" rx="3" fill="#333" />
      <Path d="M26 20 L34 12" stroke="#444" strokeWidth={3} />
      <Circle cx="35" cy="11" r="4.5" fill={PAL.steel} stroke={INK} strokeWidth={1.4} />
    </G>
  ),
  goldchainsaw: (
    <G>
      <Circle cx="20" cy="20" r="18" fill="#ffe27a" opacity={0.45} />
      <Rect x="4" y="14" width="18" height="14" rx="3" fill={PAL.gold} stroke={INK} strokeWidth={SW} />
      <Path d="M6 14 q4 -8 12 0" stroke={INK} strokeWidth={2.4} fill="none" />
      <Rect x="21" y="18" width="16" height="6" rx="3" fill="#fff1b0" stroke={INK} strokeWidth={SW} />
      <Path d="M32 4 l1.4 3 l3 1.4 l-3 1.4 l-1.4 3 l-1.4 -3 l-3 -1.4 l3 -1.4 z" fill="#fff" stroke={INK} strokeWidth={0.8} />
    </G>
  ),
};

export function ToolArt({ id, size = 40 }: { id: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {ART[id] ?? ART.handle}
    </Svg>
  );
}
