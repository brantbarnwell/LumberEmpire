// Update 2: workshop buildings (shed to global hub), the Sawmill, land plots and the Golden Log,
// all in the same flat style as the icons: thick dark-brown outline, warm timber colours, soft ground shadow.
import { ReactElement, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import { INK, PAL } from './Icons';
import { WOOD_TREES } from './TreeArt';
import { LAND, WOODS } from '../../game/data';
import { lessMotion } from '../../services/feel';

const ND = Platform.OS !== 'web';
const SW = 2.4;
const Shadow = ({ cx = 60, cy = 86, rx = 50 }: { cx?: number; cy?: number; rx?: number }) => <Ellipse cx={cx} cy={cy} rx={rx} ry={4} fill="#000" opacity={0.15} />;
const Win = ({ x, y, w = 10, h = 9 }: { x: number; y: number; w?: number; h?: number }) => (
  <G>
    <Rect x={x} y={y} width={w} height={h} rx={1.5} fill={PAL.sky} stroke={INK} strokeWidth={1.6} />
    <Path d={`M${x + w / 2} ${y} v${h} M${x} ${y + h / 2} h${w}`} stroke={INK} strokeWidth={1} />
  </G>
);
const Boards = ({ x, y, w, h, n }: { x: number; y: number; w: number; h: number; n: number }) => (
  <G>{Array.from({ length: n - 1 }, (_, i) => <Path key={i} d={`M${x + ((i + 1) * w) / n} ${y} v${h}`} stroke={INK} strokeOpacity={0.25} strokeWidth={1.2} />)}</G>
);

/** Workshop level 0..7 (Backyard Shed .. Global Manufacturing Hub). */
export function WorkshopArt({ level, size = 110 }: { level: number; size?: number }) {
  return (
    <Svg width={size} height={(size * 90) / 120} viewBox="0 0 120 90">
      <Shadow />
      {level <= 0 && (
        <G>
          <Rect x="30" y="40" width="60" height="44" fill={PAL.wood} stroke={INK} strokeWidth={SW} />
          <Boards x={30} y={40} w={60} h={44} n={6} />
          <Polygon points="24,42 60,20 96,42" fill={PAL.bark} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <Rect x="52" y="58" width="16" height="26" fill={PAL.bark} stroke={INK} strokeWidth={2} />
          <Circle cx="65" cy="71" r="1.5" fill={INK} />
        </G>
      )}
      {level === 1 && (
        <G>
          <Rect x="14" y="36" width="88" height="40" rx="8" fill={PAL.cream} stroke={INK} strokeWidth={SW} />
          <Rect x="14" y="58" width="88" height="6" fill={PAL.pine} />
          <Win x={26} y={44} w={16} h={10} /><Win x={74} y={44} w={16} h={10} />
          <Rect x="50" y="44" width="16" height="30" rx="2" fill={PAL.wood} stroke={INK} strokeWidth={2} />
          <Circle cx="34" cy="80" r="7" fill="#333" stroke={INK} strokeWidth={2} /><Circle cx="84" cy="80" r="7" fill="#333" stroke={INK} strokeWidth={2} />
          <Path d="M102 66 h12" stroke={INK} strokeWidth={3} />
        </G>
      )}
      {level === 2 && (
        <G>
          <Rect x="84" y="14" width="10" height="20" fill={PAL.red} stroke={INK} strokeWidth={2} />
          <Rect x="20" y="40" width="80" height="44" fill={PAL.wood} stroke={INK} strokeWidth={SW} />
          {[46, 54, 62, 70, 78].map((y) => <Path key={y} d={`M20 ${y} h80`} stroke={INK} strokeOpacity={0.25} strokeWidth={1.2} />)}
          <Polygon points="12,42 60,14 108,42" fill={PAL.bark} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <Rect x="50" y="56" width="20" height="28" fill={PAL.bark} stroke={INK} strokeWidth={2} />
          <Win x={28} y={52} w={14} h={12} /><Win x={78} y={52} w={14} h={12} />
        </G>
      )}
      {level === 3 && (
        <G>
          <Rect x="14" y="34" width="92" height="50" fill={PAL.woodLight} stroke={INK} strokeWidth={SW} />
          <Rect x="22" y="14" width="76" height="16" rx="3" fill={PAL.pine} stroke={INK} strokeWidth={SW} />
          <Path d="M34 22 h52" stroke={PAL.gold} strokeWidth={3} strokeLinecap="round" />
          <Path d="M10 34 h100 l-6 12 h-88 z" fill={PAL.red} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          {[24, 40, 56, 72, 88].map((x) => <Path key={x} d={`M${x} 34 l-2 12`} stroke="#fff" strokeWidth={3} />)}
          <Rect x="24" y="52" width="26" height="20" fill={PAL.sky} stroke={INK} strokeWidth={2} />
          <Rect x="70" y="52" width="22" height="32" fill={PAL.bark} stroke={INK} strokeWidth={2} />
        </G>
      )}
      {level === 4 && (
        <G>
          <Rect x="6" y="36" width="108" height="48" fill={PAL.steel} stroke={INK} strokeWidth={SW} />
          {Array.from({ length: 12 }, (_, i) => <Path key={i} d={`M${12 + i * 9} 36 v48`} stroke={INK} strokeOpacity={0.2} strokeWidth={1.2} />)}
          <Path d="M2 38 Q60 6 118 38 Z" fill={PAL.bark} stroke={INK} strokeWidth={SW} />
          <Rect x="38" y="50" width="44" height="34" fill={PAL.wood} stroke={INK} strokeWidth={2} />
          {[56, 62, 68, 74].map((y) => <Path key={y} d={`M38 ${y} h44`} stroke={INK} strokeOpacity={0.35} strokeWidth={1.2} />)}
        </G>
      )}
      {level === 5 && (
        <G>
          <Rect x="92" y="6" width="10" height="40" fill={PAL.red} stroke={INK} strokeWidth={2} />
          <Rect x="8" y="40" width="104" height="44" fill={PAL.woodLight} stroke={INK} strokeWidth={SW} />
          <Path d="M8 40 l17 -16 v16 l17 -16 v16 l17 -16 v16 l17 -16 v16 l17 -16 v16" fill={PAL.bark} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <Win x={16} y={52} w={14} h={10} /><Win x={36} y={52} w={14} h={10} /><Win x={78} y={52} w={14} h={10} />
          <Rect x="56" y="58" width="18" height="26" fill={PAL.bark} stroke={INK} strokeWidth={2} />
        </G>
      )}
      {level === 6 && (
        <G>
          <Rect x="86" y="20" width="22" height="64" rx="10" fill={PAL.steel} stroke={INK} strokeWidth={SW} />
          <Rect x="70" y="30" width="18" height="54" rx="8" fill={PAL.steel} stroke={INK} strokeWidth={SW} />
          <Rect x="6" y="42" width="70" height="42" fill={PAL.wood} stroke={INK} strokeWidth={SW} />
          <Path d="M6 42 l14 -14 v14 l14 -14 v14 l14 -14 v14 l14 -14 v14" fill={PAL.pine} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <Rect x="14" y="10" width="9" height="20" fill={PAL.red} stroke={INK} strokeWidth={2} />
          <Win x={14} y={54} w={14} h={10} /><Win x={34} y={54} w={14} h={10} />
          <Rect x="54" y="60" width="16" height="24" fill={PAL.bark} stroke={INK} strokeWidth={2} />
        </G>
      )}
      {level >= 7 && (
        <G>
          <Rect x="40" y="4" width="40" height="80" fill={PAL.sky} stroke={INK} strokeWidth={SW} />
          {[12, 24, 36, 48, 60].map((y) => <Path key={y} d={`M40 ${y} h40`} stroke={INK} strokeOpacity={0.35} strokeWidth={1.4} />)}
          <Path d="M60 4 v80" stroke={INK} strokeOpacity={0.3} strokeWidth={1.4} />
          <Rect x="6" y="44" width="36" height="40" fill={PAL.wood} stroke={INK} strokeWidth={SW} />
          <Rect x="78" y="44" width="36" height="40" fill={PAL.wood} stroke={INK} strokeWidth={SW} />
          <Circle cx="60" cy="0" r="0" />
          <Circle cx="24" cy="58" r="6" fill={PAL.pineLight} stroke={INK} strokeWidth={1.8} />
          <Path d="M18 58 h12 M24 52 q4 6 0 12 q-4 -6 0 -12" stroke={INK} strokeWidth={1} fill="none" />
          <Rect x="88" y="58" width="16" height="26" fill={PAL.bark} stroke={INK} strokeWidth={2} />
          <Polygon points="60,0 64,6 56,6" fill={PAL.gold} stroke={INK} strokeWidth={1.2} />
        </G>
      )}
    </Svg>
  );
}

/** Spinning circular saw blade. Spins only while `running`. */
export function Blade({ size, running, speed = 1 }: { size: number; running: boolean; speed?: number }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running || lessMotion()) { spin.stopAnimation(); return; }
    const l = Animated.loop(Animated.timing(spin, { toValue: 1, duration: Math.max(250, 900 / speed), easing: Easing.linear, useNativeDriver: ND }));
    l.start();
    return () => l.stop();
  }, [running, speed]);
  const teeth = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {teeth.map((a) => <Polygon key={a} points="20,1 23,6 17,6" fill={PAL.steel} stroke={INK} strokeWidth={1} transform={`rotate(${a} 20 20)`} />)}
        <Circle cx="20" cy="20" r="14.5" fill={PAL.steel} stroke={INK} strokeWidth={2} />
        <Circle cx="20" cy="20" r="4" fill={PAL.goldDark} stroke={INK} strokeWidth={1.6} />
        <Path d="M20 8 v5 M20 27 v5 M8 20 h5 M27 20 h5" stroke={INK} strokeOpacity={0.35} strokeWidth={1.4} />
      </Svg>
    </Animated.View>
  );
}

/** The Sawmill building with its blade. Level 0 = not built (shown faded). */
export function SawmillArt({ level, running, width = 150 }: { level: number; running: boolean; width?: number }) {
  const h = (width * 100) / 150;
  const k = width / 150;
  return (
    <View style={{ width, height: h, opacity: level > 0 ? 1 : 0.55 }}>
      <Svg width={width} height={h} viewBox="0 0 150 100">
        <Shadow cx={75} cy={96} rx={70} />
        <Rect x="20" y="36" width="122" height="58" fill={PAL.wood} stroke={INK} strokeWidth={SW} />
        <Boards x={20} y={36} w={122} h={58} n={10} />
        <Polygon points="10,38 81,8 152,38" fill={PAL.bark} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <Rect x="108" y="4" width="12" height="22" fill={PAL.red} stroke={INK} strokeWidth={2} />
        {/* open saw bay on the left where the logs go in */}
        <Rect x="20" y="52" width="46" height="42" fill="#5a3519" stroke={INK} strokeWidth={2} />
        <Rect x="82" y="58" width="22" height="36" fill={PAL.bark} stroke={INK} strokeWidth={2} />
        <Rect x="112" y="50" width="20" height="14" rx="2" fill={PAL.sky} stroke={INK} strokeWidth={1.6} />
        {level > 1 && <Rect x="112" y="70" width="20" height="14" rx="2" fill={PAL.sky} stroke={INK} strokeWidth={1.6} />}
        {/* level marks on the roof */}
        {Array.from({ length: Math.max(0, level) }, (_, i) => <Circle key={i} cx={48 + i * 9} cy={30} r={3} fill={PAL.gold} stroke={INK} strokeWidth={1.2} />)}
      </Svg>
      <View style={{ position: 'absolute', left: 25 * k, top: 54 * k }}>
        <Blade size={36 * k} running={running && level > 0} speed={1 + level * 0.4} />
      </View>
    </View>
  );
}

// ---------- land plots ----------

/** Update 4: a small tree in the house style, coloured like its tree type. */
function typeTree(x: number, y: number, sc: number, type: string, key: string) {
  const P = WOOD_TREES[type] ?? WOOD_TREES.pine;
  const c1 = P.rainbow ? P.rainbow[0] : P.light;
  const c2 = P.rainbow ? P.rainbow[2] : P.mid;
  const a = P.alpha ?? 1;
  return (
    <G key={key}>
      <Rect x={x - 1.8 * sc} y={y - 6 * sc} width={3.6 * sc} height={6 * sc} fill={P.trunk[1]} stroke={INK} strokeWidth={1} />
      <Polygon points={`${x},${y - 18 * sc} ${x + 9 * sc},${y - 5 * sc} ${x - 9 * sc},${y - 5 * sc}`} fill={c2} fillOpacity={a} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <Polygon points={`${x},${y - 26 * sc} ${x + 6.5 * sc},${y - 14 * sc} ${x - 6.5 * sc},${y - 14 * sc}`} fill={c1} fillOpacity={a} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      {P.sparkle && <Path d={`M${x + 4 * sc} ${y - 24 * sc} l1.2 2.4 l2.4 1.2 l-2.4 1.2 l-1.2 2.4 l-1.2 -2.4 l-2.4 -1.2 l2.4 -1.2 z`} fill={P.sparkle} stroke={INK} strokeWidth={0.6} />}
    </G>
  );
}

/** A small landscape for each piece of land (14 plots), with that land's own trees. */
export function LandArt({ id, width = 120, owned }: { id: string; width?: number; owned?: boolean }) {
  const h = (width * 70) / 120;
  const def = LAND.find((l) => l.id === id);
  const type = def?.wood ?? 'pine';
  const idx = WOODS.findIndex((w) => w.id === type);
  const older = idx > 0 ? WOODS[idx - 1].id : type;
  const scene: Record<string, { sky: string; ground: string; back?: ReactElement }> = {
    clearing: { sky: PAL.sky, ground: PAL.pineLight },
    pine: { sky: PAL.sky, ground: PAL.pineLight },
    hillside: { sky: PAL.sky, ground: '#7cb66a', back: <Path d="M0 56 Q40 16 90 40 Q110 48 120 56 Z" fill="#8fc27a" stroke={INK} strokeWidth={1.6} /> },
    river: { sky: PAL.sky, ground: PAL.pineLight, back: <Path d="M48 70 Q58 58 52 50 L64 50 Q70 60 62 70 Z" fill={PAL.sky} stroke={INK} strokeWidth={1.4} /> },
    redwood: { sky: '#bfe3f0', ground: '#5e9a52' },
    mountain: { sky: '#bcd7e6', ground: '#6f9a5e', back: <G><Polygon points="0,56 34,12 64,56" fill="#9cb8c9" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" /><Polygon points="44,56 84,6 120,56" fill="#8aa7ba" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" /><Polygon points="84,6 93,18 75,18" fill="#fff" /></G> },
    cherrygrove: { sky: '#fde4ee', ground: '#9fd08a', back: <G>{[20, 50, 80, 104].map((x) => <Circle key={x} cx={x} cy={14 + (x % 3) * 4} r={1.8} fill="#f6b6cf" />)}</G> },
    darkwood: { sky: '#4a4a66', ground: '#2e3a2a', back: <Circle cx={100} cy={14} r={7} fill="#e8e6f0" stroke={INK} strokeWidth={1.2} /> },
    bamboo: { sky: '#dff3c8', ground: '#8fc26a', back: <Path d="M0 52 Q60 36 120 52 Z" fill="#b6dc8a" stroke={INK} strokeWidth={1.4} /> },
    crystal: { sky: '#1e2e4a', ground: '#3a5a7a', back: <G><Path d="M0 56 Q20 10 60 14 Q100 10 120 56 Z" fill="#2a3e5e" stroke={INK} strokeWidth={1.6} />{[[24, 46], [96, 44], [60, 26]].map(([x, y]) => <Polygon key={x} points={`${x},${y - 8} ${x + 4},${y} ${x},${y + 4} ${x - 4},${y}`} fill="#8fd8ff" stroke={INK} strokeWidth={1} />)}</G> },
    glass: { sky: '#e8fbff', ground: '#bfe9ee', back: <Path d="M10 20 L30 10 M80 18 L104 8" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" /> },
    diamond: { sky: '#cfe3f2', ground: '#e9f1f7', back: <G><Polygon points="20,56 60,6 100,56" fill="#dbe6ef" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" /><Polygon points="60,6 70,20 50,20" fill="#ffffff" /></G> },
    goldenvalley: { sky: '#fff1c8', ground: '#e8c25a', back: <Circle cx={96} cy={16} r={9} fill={PAL.gold} stroke={INK} strokeWidth={1.4} /> },
    rainforest: { sky: '#cfeefc', ground: '#5ea84e', back: <G>{['#ff5a7a', '#ffb03a', '#6fd25a', '#5ab0ff'].map((c, i) => <Path key={c} d={`M8 ${56 - i * 0} A52 ${44 - i * 5} 0 0 1 112 56`} transform={`translate(0 ${-6 - i * 4})`} fill="none" stroke={c} strokeWidth={3} />)}</G> },
  };
  const sc = scene[id] ?? scene.clearing;
  const xs = [16, 38, 60, 82, 104];
  return (
    <Svg width={width} height={h} viewBox="0 0 120 70">
      <Rect x="0" y="0" width="120" height="70" rx="10" fill={sc.sky} />
      {sc.back}
      <Path d="M0 54 Q60 44 120 54 L120 70 L0 70 Z" fill={sc.ground} stroke={INK} strokeWidth={1.8} />
      {xs.map((x, i) => typeTree(x, 58 + (i % 2) * 3, i % 2 ? 0.95 : 1.15, i === 1 || i === 4 ? older : type, `${id}${i}`))}
      {owned && <G><Path d="M108 30 v24" stroke={INK} strokeWidth={2} /><Path d="M108 30 l10 4 l-10 4 z" fill={PAL.gold} stroke={INK} strokeWidth={1.4} /></G>}
      <Rect x="1" y="1" width="118" height="68" rx="10" fill="none" stroke={INK} strokeWidth={2.4} />
    </Svg>
  );
}

/** The Golden Log: glows and bobs while it waits to be tapped. */
export function GoldenLogArt({ size = 70 }: { size?: number }) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (lessMotion()) return;
    const l = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
      Animated.timing(glow, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: ND }),
    ]));
    l.start();
    return () => l.stop();
  }, []);
  return (
    <Animated.View style={{ width: size, height: size * 0.7, transform: [{ translateY: glow.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }, { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
      <Animated.View style={{ position: 'absolute', left: -size * 0.15, top: -size * 0.2, width: size * 1.3, height: size * 1.1, borderRadius: size, backgroundColor: '#ffe27a', opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] }) }} />
      <Svg width={size} height={size * 0.7} viewBox="0 0 70 49">
        <Path d="M10 14 h44 a8 11 0 0 1 0 22 h-44 z" fill={PAL.gold} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
        <Ellipse cx="10" cy="25" rx="8" ry="11" fill="#fff1b0" stroke={INK} strokeWidth={2.4} />
        <Ellipse cx="10" cy="25" rx="4" ry="6" fill="none" stroke={PAL.goldDark} strokeWidth={1.6} />
        <Path d="M24 20 h20 M28 30 h18" stroke={PAL.goldDark} strokeWidth={2} strokeLinecap="round" />
        <Path d="M60 4 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#fff" stroke={INK} strokeWidth={1} />
        <Path d="M30 2 l1.4 3 l3 1.4 l-3 1.4 l-1.4 3 l-1.4 -3 l-3 -1.4 l3 -1.4 z" fill="#fff" stroke={INK} strokeWidth={0.8} />
      </Svg>
    </Animated.View>
  );
}
