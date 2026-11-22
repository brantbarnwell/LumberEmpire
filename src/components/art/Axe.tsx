// Hand-drawn axes, one look per axe tier (and skins). Drawn pointing up, handle bottom at (50, 98).
import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { GameState } from '../../game/logic';
import { AXES } from '../../game/data';

export type AxeLook = 'rusty' | 'stone' | 'iron' | 'steel' | 'titanium' | 'diamond' | 'mythic' | 'dragon' | 'frost';

/** What your axe looks like right now (a skin wins over the axe you own). */
// Update 3: axe skins from the Cosmetics shop (looks only, your axe's stats stay the same)
export const COSMETIC_AXE_LOOK: Record<string, AxeLook> = {
  'axe-rusty': 'rusty', 'axe-steelblue': 'titanium', 'axe-golden': 'mythic', 'axe-fire': 'dragon', 'axe-diamond': 'diamond', 'axe-frost': 'frost',
};

export function axeLookOf(s: Pick<GameState, 'axeIndex' | 'equippedSkin'> & { cosmetics?: GameState['cosmetics'] }): AxeLook {
  if (s.cosmetics?.axe && COSMETIC_AXE_LOOK[s.cosmetics.axe]) return COSMETIC_AXE_LOOK[s.cosmetics.axe];
  if (s.equippedSkin === 'diamond-axe-skin') return 'diamond';
  if (s.equippedSkin === 'steel-axe-skin') return 'steel';
  return AXES[s.axeIndex].id as AxeLook;
}

type Look = { handle: [string, string]; grip?: string; bands?: string; head: [string, string, string]; edge: string; glow?: string };
const LOOKS: Record<AxeLook, Look> = {
  rusty: { handle: ['#b98a5a', '#8a5f36'], head: ['#a8714b', '#8a5532', '#6e3f22'], edge: '#c9a184' },
  stone: { handle: ['#b98a5a', '#8a5f36'], head: ['#9aa0a6', '#7b8188', '#5d636a'], edge: '#c3c8cd', bands: '#d6b77a' },
  iron: { handle: ['#a87645', '#7a4f2a'], grip: '#4a2e17', head: ['#8e98a3', '#6c7580', '#4c545e'], edge: '#dfe5ea' },
  steel: { handle: ['#7a4f2a', '#5a3519'], grip: '#222', head: ['#eef3f7', '#c4cfd8', '#93a1ad'], edge: '#ffffff' },
  titanium: { handle: ['#3b4450', '#262c34'], grip: '#2f6fb0', head: ['#cfe0ef', '#9fb7d0', '#6d89a6'], edge: '#f2f8ff' },
  diamond: { handle: ['#2d2d3a', '#18181f'], grip: '#19a3b5', head: ['#e8fdff', '#7fe3f0', '#2fb6c9'], edge: '#ffffff', glow: '#9ff4ff' },
  mythic: { handle: ['#5b2d8e', '#3a1a5e'], grip: '#2b1145', bands: '#f5c542', head: ['#fff1b0', '#f5c542', '#c8941b'], edge: '#fffbe6', glow: '#ffe27a' },
  dragon: { handle: ['#3a1010', '#1d0707'], grip: '#7a1010', bands: '#f08a24', head: ['#ff8a5b', '#d1361e', '#6e0f0f'], edge: '#ffd29a', glow: '#ff7a3c' },
  frost: { handle: ['#cfe8f5', '#8fb8d0'], grip: '#2f6fb0', bands: '#ffffff', head: ['#ffffff', '#bfe9fb', '#6fb6db'], edge: '#ffffff', glow: '#bfefff' },
};

export function AxeArt({ look, size = 80 }: { look: AxeLook; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const L = LOOKS[look];
  const double = look === 'titanium' || look === 'mythic' || look === 'dragon' || look === 'frost';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`h${id}`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={L.handle[0]} />
          <Stop offset="1" stopColor={L.handle[1]} />
        </LinearGradient>
        <LinearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={L.head[0]} />
          <Stop offset="0.55" stopColor={L.head[1]} />
          <Stop offset="1" stopColor={L.head[2]} />
        </LinearGradient>
        {L.glow && (
          <RadialGradient id={`g${id}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={L.glow} stopOpacity="0.75" />
            <Stop offset="1" stopColor={L.glow} stopOpacity="0" />
          </RadialGradient>
        )}
      </Defs>
      {L.glow && <Circle cx="58" cy="26" r="34" fill={`url(#g${id})`} />}
      {/* handle */}
      <Path d="M46 20 Q44 60 47 97 L55 97 Q53 60 54 20 Z" fill={`url(#h${id})`} stroke="#2b1d10" strokeWidth="1.5" />
      <Path d="M48.5 30 Q47.5 60 49.5 92" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      {L.grip && <Rect x="45.5" y="72" width="10" height="20" rx="3" fill={L.grip} stroke="#111" strokeWidth="1" />}
      {L.grip && [76, 81, 86].map((y) => <Path key={y} d={`M46 ${y} L55 ${y + 3}`} stroke="#000" strokeOpacity="0.35" strokeWidth="1" />)}
      <Ellipse cx="51" cy="97" rx="5" ry="2.5" fill={L.handle[1]} stroke="#2b1d10" strokeWidth="1" />

      {/* head */}
      {look === 'stone' ? (
        <G>
          <Polygon points="50,12 78,8 92,22 88,40 72,44 52,36" fill={`url(#b${id})`} stroke="#3c4146" strokeWidth="2" strokeLinejoin="round" />
          <Path d="M60 16 L66 22 M74 30 L80 26 M70 14 L72 18" stroke="#4d5359" strokeWidth="1.5" />
          <Path d="M86 18 L92 22 L88 40" stroke={L.edge} strokeWidth="2.5" fill="none" />
          {[18, 24, 30].map((y) => <Path key={y} d={`M43 ${y} Q51 ${y + 3} 58 ${y - 1}`} stroke={L.bands} strokeWidth="2.5" fill="none" />)}
        </G>
      ) : (
        <G>
          {double && <Path d="M48 14 L30 6 Q18 24 30 42 L48 34 Z" fill={`url(#b${id})`} stroke="#2b1d10" strokeWidth="2" strokeLinejoin="round" />}
          {double && <Path d="M30 6 Q18 24 30 42" stroke={L.edge} strokeWidth="3" fill="none" />}
          <Path d="M44 12 L58 10 L74 4 Q94 22 76 46 L58 34 L44 34 Z" fill={`url(#b${id})`} stroke="#2b1d10" strokeWidth="2" strokeLinejoin="round" />
          <Path d="M74 4 Q94 22 76 46" stroke={L.edge} strokeWidth="3.5" fill="none" />
          <Path d="M60 14 L72 10" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
          <Rect x="42" y="10" width="17" height="26" rx="3" fill={L.head[2]} stroke="#2b1d10" strokeWidth="1.5" />
          {look === 'rusty' && (
            <G>
              <Circle cx="64" cy="22" r="3" fill="#6e3f22" opacity="0.8" />
              <Circle cx="70" cy="32" r="2" fill="#5a2f17" opacity="0.8" />
              <Circle cx="58" cy="28" r="1.5" fill="#c58a5a" />
              <Path d="M84 20 L80 22 L83 25" stroke="#6e3f22" strokeWidth="1.5" fill="none" />
            </G>
          )}
          {(look === 'iron' || look === 'steel' || look === 'titanium') && (
            <G>
              <Circle cx="50.5" cy="16" r="1.6" fill="#ddd" stroke="#333" strokeWidth="0.6" />
              <Circle cx="50.5" cy="30" r="1.6" fill="#ddd" stroke="#333" strokeWidth="0.6" />
            </G>
          )}
          {look === 'frost' && <Path d="M62 14 l4 6 l-4 6 M70 12 l3 8 M76 26 l-4 8" stroke="#6fb6db" strokeWidth="1.6" fill="none" />}
          {look === 'diamond' && (
            <G>
              <Path d="M58 12 L70 22 L60 32 M70 22 L84 18 M70 22 L80 38" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.2" fill="none" />
              <Path d="M86 8 L88 13 L93 15 L88 17 L86 22 L84 17 L79 15 L84 13 Z" fill="#fff" />
            </G>
          )}
          {(look === 'mythic' || look === 'dragon') && (
            <G>
              <Circle cx="50.5" cy="23" r="4.5" fill={look === 'mythic' ? '#d1243c' : '#ffd23f'} stroke="#2b1d10" strokeWidth="1.2" />
              <Circle cx="49.3" cy="21.6" r="1.4" fill="#fff" opacity="0.8" />
              <Path d="M62 18 Q68 22 62 28 M70 16 Q78 22 70 32" stroke={look === 'mythic' ? '#fff6c8' : '#ffb36b'} strokeWidth="1.5" fill="none" />
            </G>
          )}
          {look === 'dragon' && <Path d="M44 12 L46 2 L50 10 L54 0 L56 10" fill="#d1361e" stroke="#2b1d10" strokeWidth="1.2" strokeLinejoin="round" />}
        </G>
      )}
      {L.bands && look !== 'stone' && [44, 60].map((y) => <Rect key={y} x="45" y={y} width="10" height="3" rx="1" fill={L.bands} stroke="#2b1d10" strokeWidth="0.6" />)}
    </Svg>
  );
}
