// Your hired helpers and big machines, drawn in the forest yard, each with its own work animation.
import { ReactElement, ReactNode, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { GameState } from '../../game/logic';
import { HELPERS } from '../../game/data';

const ND = Platform.OS !== 'web';
const SKIN = '#f2c79b';

// ---------- people ----------

type Hat = 'cap' | 'beanie' | 'hardhat' | 'helmet' | 'hood';
type Who = { shirt: string; pants: string; hat: Hat; hatColor: string; beard?: string; vest?: boolean; plaid?: boolean; belt?: string; big?: boolean };

function Person({ w }: { w: Who }) {
  const torsoW = w.big ? 28 : 22;
  const tx = 25 - torsoW / 2;
  return (
    <Svg width={50} height={72} viewBox="0 0 50 72">
      <Ellipse cx="25" cy="70" rx="15" ry="2.5" fill="#000" opacity="0.2" />
      {/* legs + boots */}
      <Rect x="17" y="46" width="7" height="18" rx="2" fill={w.pants} />
      <Rect x="26" y="46" width="7" height="18" rx="2" fill={w.pants} />
      <Rect x="15" y="62" width="10" height="6" rx="2" fill="#3a2210" />
      <Rect x="25" y="62" width="10" height="6" rx="2" fill="#3a2210" />
      {/* torso */}
      <Rect x={tx} y="24" width={torsoW} height="25" rx="6" fill={w.shirt} stroke="#2b1d10" strokeWidth="1.2" />
      {w.plaid && (
        <G opacity="0.45">
          {[30, 37, 44].map((y) => <Line key={y} x1={tx} y1={y} x2={tx + torsoW} y2={y} stroke="#2b1010" strokeWidth="2" />)}
          {[19, 25, 31].map((x) => <Line key={x} x1={x} y1="24" x2={x} y2="49" stroke="#2b1010" strokeWidth="2" />)}
        </G>
      )}
      {w.vest && (
        <G>
          <Rect x={tx + 1} y="25" width={torsoW - 2} height="23" rx="5" fill="#d8f23a" opacity="0.95" />
          <Rect x={tx + 1} y="36" width={torsoW - 2} height="3" fill="#e8e8e8" />
          <Rect x={tx + 1} y="42" width={torsoW - 2} height="3" fill="#e8e8e8" />
        </G>
      )}
      {w.belt && <Rect x={tx} y="44" width={torsoW} height="4" fill={w.belt} />}
      {/* back arm (the work arm is drawn separately) */}
      <Rect x={tx - 4} y="27" width="6" height="16" rx="3" fill={w.shirt} stroke="#2b1d10" strokeWidth="1" />
      {/* head */}
      <Circle cx="25" cy="15" r="9" fill={SKIN} stroke="#2b1d10" strokeWidth="1.2" />
      <Circle cx="28.5" cy="14" r="1.2" fill="#2b1d10" />
      <Path d="M27 19 Q29.5 20.5 32 19" stroke="#2b1d10" strokeWidth="1" fill="none" />
      {w.beard && <Path d={w.big ? 'M16 15 Q16 34 25 36 Q34 34 34 15 Q30 21 25 21 Q20 21 16 15 Z' : 'M17 16 Q18 27 25 27 Q32 27 33 16 Q30 21 25 21 Q20 21 17 16 Z'} fill={w.beard} />}
      {w.hat === 'cap' && <Path d="M16 12 Q25 2 34 12 Z M30 11 L40 12 L34 13 Z" fill={w.hatColor} stroke="#2b1d10" strokeWidth="1" />}
      {w.hat === 'beanie' && <Path d="M15.5 13 Q25 0 34.5 13 Z" fill={w.hatColor} stroke="#2b1d10" strokeWidth="1" />}
      {w.hat === 'beanie' && <Circle cx="25" cy="4" r="2.5" fill="#fff" />}
      {w.hat === 'hardhat' && <Path d="M14 13 Q25 0 36 13 L38 13 L38 15 L12 15 L12 13 Z" fill={w.hatColor} stroke="#2b1d10" strokeWidth="1" />}
      {w.hat === 'helmet' && (
        <G>
          <Path d="M15 13 Q25 1 35 13 Z" fill={w.hatColor} stroke="#2b1d10" strokeWidth="1" />
          <Rect x="22" y="12" width="15" height="8" rx="2" fill="#222" opacity="0.55" />
          <Rect x="13" y="12" width="5" height="7" rx="2" fill="#333" />
        </G>
      )}
      {w.hat === 'hood' && <Path d="M14 16 Q14 2 25 2 Q36 2 36 16 L33 16 Q32 8 25 8 Q18 8 17 16 Z" fill={w.hatColor} stroke="#2b1d10" strokeWidth="1" />}
    </Svg>
  );
}

// ---------- tools held in the work arm (60x60, the hand is at the center 30,30) ----------

function Arm({ shirt, children }: { shirt: string; children?: ReactNode }) {
  return (
    <Svg width={60} height={60} viewBox="0 0 60 60">
      {children}
      <Rect x="27" y="27" width="16" height="6" rx="3" fill={shirt} stroke="#2b1d10" strokeWidth="1" />
      <Circle cx="44" cy="30" r="3.4" fill={SKIN} stroke="#2b1d10" strokeWidth="1" />
    </Svg>
  );
}

const Hatchet = () => (
  <G>
    <Rect x="42.5" y="12" width="3.5" height="22" rx="1.5" fill="#a87645" stroke="#2b1d10" strokeWidth="0.8" />
    <Path d="M41 10 L52 8 Q56 14 52 20 L46 18 Z" fill="#b9c2cc" stroke="#2b1d10" strokeWidth="1" />
  </G>
);
const BigAxe = ({ gold }: { gold?: boolean }) => (
  <G>
    <Rect x="42.5" y="0" width="4" height="34" rx="1.5" fill={gold ? '#5b2d8e' : '#8a5a2e'} stroke="#2b1d10" strokeWidth="0.8" />
    <Path d="M40 2 L52 0 Q62 9 52 18 L46 14 Z" fill={gold ? '#f5c542' : '#d7e1ea'} stroke="#2b1d10" strokeWidth="1" />
    {gold && <Circle cx="47" cy="7" r="2" fill="#d1243c" />}
  </G>
);
const Saw = () => (
  <G>
    <Rect x="44" y="27" width="16" height="5" rx="1" fill="#c9d3dc" stroke="#2b1d10" strokeWidth="0.8" />
    <Path d="M44 32 l2 2 l2 -2 l2 2 l2 -2 l2 2 l2 -2 l2 2 l2 -2" stroke="#7b8188" strokeWidth="1" fill="none" />
  </G>
);
const ChainsawTool = () => (
  <G>
    <Rect x="40" y="22" width="12" height="10" rx="2" fill="#f07a1f" stroke="#2b1d10" strokeWidth="1" />
    <Rect x="51" y="25" width="9" height="4" rx="2" fill="#9aa0a6" stroke="#2b1d10" strokeWidth="0.8" />
    <Path d="M51 25 l1.5 -1.2 l1.5 1.2 l1.5 -1.2 l1.5 1.2 l1.5 -1.2" stroke="#444" strokeWidth="0.8" fill="none" />
  </G>
);

// ---------- what they work on ----------

function LittleTree({ w = 44, h = 64 }: { w?: number; h?: number }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 44 64">
      <Rect x="18" y="44" width="8" height="20" fill="#7a4f2a" stroke="#3a2210" strokeWidth="1" />
      <Path d="M22 2 L40 30 L30 30 L42 48 L2 48 L14 30 L4 30 Z" fill="#3f8a48" stroke="#1d5430" strokeWidth="1.5" strokeLinejoin="round" />
      <Path d="M22 2 L40 30 L30 30 L42 48 L22 48 Z" fill="#1d5430" opacity="0.25" />
    </Svg>
  );
}
function Log({ w = 50 }: { w?: number }) {
  return (
    <Svg width={w} height={22} viewBox="0 0 50 22">
      <Rect x="4" y="4" width="40" height="14" rx="7" fill="#8a5a2e" stroke="#3a2210" strokeWidth="1.2" />
      <Ellipse cx="44" cy="11" rx="5" ry="7" fill="#f1d49c" stroke="#b98a5a" strokeWidth="1.2" />
      <Ellipse cx="44" cy="11" rx="2" ry="3" fill="none" stroke="#c99a5b" strokeWidth="0.8" />
    </Svg>
  );
}
function Sawhorse() {
  return (
    <Svg width={54} height={34} viewBox="0 0 54 34">
      <Path d="M8 34 L16 8 M24 34 L16 8 M30 34 L38 8 M46 34 L38 8" stroke="#6b4423" strokeWidth="3" />
      <Rect x="4" y="2" width="44" height="12" rx="6" fill="#8a5a2e" stroke="#3a2210" strokeWidth="1.2" />
      <Ellipse cx="48" cy="8" rx="4" ry="6" fill="#f1d49c" stroke="#b98a5a" strokeWidth="1" />
    </Svg>
  );
}

/** Little flying wood chips / sawdust tied to the work loop. */
function Chips({ v, at, color = '#e2c18b', n = 4, spray }: { v: Animated.Value; at: number; color?: string; n?: number; spray?: boolean }) {
  const chips = useMemo(() => Array.from({ length: n }, (_, i) => ({ dx: (spray ? 12 : -18) + Math.random() * 26, up: 10 + Math.random() * 18, r: Math.random() * 360, k: i })), [n, spray]);
  const end = Math.min(1, at + 0.3);
  return (
    <>
      {chips.map((c) => (
        <Animated.View
          key={c.k}
          pointerEvents="none"
          style={[
            styles.chip,
            { backgroundColor: color, width: spray ? 3 : 6, height: spray ? 3 : 4, borderRadius: spray ? 2 : 1 },
            {
              opacity: v.interpolate({ inputRange: [0, at, at + 0.01, end, 1], outputRange: [0, 0, 1, 0, 0], extrapolate: 'clamp' }),
              transform: [
                { translateX: v.interpolate({ inputRange: [0, at, end, 1], outputRange: [0, 0, c.dx, c.dx], extrapolate: 'clamp' }) },
                { translateY: v.interpolate({ inputRange: [0, at, (at + end) / 2, end, 1], outputRange: [0, 0, -c.up, 6, 6], extrapolate: 'clamp' }) },
                { rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${c.r}deg`, `${c.r + 540}deg`] }) },
              ],
            },
          ]}
        />
      ))}
    </>
  );
}

function useLoop(duration: number, delay: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: ND }));
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [duration, delay]);
  return v;
}

// ---------- one station per helper type ----------

const WHO: Record<string, Who> = {
  apprentice: { shirt: '#4f9a4f', pants: '#3b5b8a', hat: 'cap', hatColor: '#2f6fb0' },
  lumberjack: { shirt: '#c9372a', pants: '#2f3f5a', hat: 'beanie', hatColor: '#8e1f17', beard: '#6b3a1c', plaid: true },
  veteran: { shirt: '#e07b26', pants: '#4a4a4a', hat: 'hardhat', hatColor: '#f5c542', beard: '#9aa0a6' },
  feller: { shirt: '#2f6b3a', pants: '#2b2b2b', hat: 'helmet', hatColor: '#f07a1f', vest: true },
  master: { shirt: '#2f5fb0', pants: '#3a2a1a', hat: 'hood', hatColor: '#1f3f7a', beard: '#eeeeee', belt: '#f5c542', big: true },
};

function Station({ id, delay }: { id: string; delay: number }) {
  if (id === 'crew') return <Skidder delay={delay} />;
  const w = WHO[id];
  // speed and swing per worker
  const cfg = {
    apprentice: { dur: 650, hit: 0.5, from: '-70deg', to: '25deg', tool: <Hatchet /> },
    lumberjack: { dur: 1000, hit: 0.55, from: '-120deg', to: '30deg', tool: <BigAxe /> },
    veteran: { dur: 700, hit: 0.5, from: '0deg', to: '0deg', tool: <Saw /> },
    feller: { dur: 260, hit: 0.3, from: '-4deg', to: '4deg', tool: <ChainsawTool /> },
    master: { dur: 1400, hit: 0.6, from: '-180deg', to: '180deg', tool: <BigAxe gold /> },
  }[id as 'apprentice']!;
  const v = useLoop(cfg.dur, delay);
  const sawing = id === 'veteran';
  const buzzing = id === 'feller';
  const spin = id === 'master';
  const rotate = sawing
    ? '0deg'
    : buzzing
      ? v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [cfg.from, cfg.to, cfg.from, cfg.to, cfg.from] })
      : spin
        ? v.interpolate({ inputRange: [0, cfg.hit, 0.8, 1], outputRange: ['-140deg', '40deg', '-140deg', '-140deg'] })
        : v.interpolate({ inputRange: [0, cfg.hit, cfg.hit + 0.15, 1], outputRange: [cfg.from, cfg.to, cfg.to, cfg.from] });
  const slide = sawing ? v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-6, 8, -6] }) : 0;
  const shake = v.interpolate({ inputRange: [0, cfg.hit, cfg.hit + 0.06, cfg.hit + 0.14, 1], outputRange: ['0deg', '0deg', '4deg', '0deg', '0deg'], extrapolate: 'clamp' });
  const bob = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, spin ? -3 : -1.5, 0] });

  return (
    <View style={styles.station}>
      <View style={styles.target}>
        {sawing ? <Sawhorse /> : (
          <Animated.View style={{ transform: [{ rotate: buzzing ? v.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-1deg', '1deg', '-1deg'] }) : shake }] }}>
            <LittleTree />
          </Animated.View>
        )}
      </View>
      <View style={styles.chipsAt}>
        <Chips v={v} at={cfg.hit} n={buzzing || sawing ? 6 : 4} spray={buzzing || sawing} color={buzzing || sawing ? '#f1d49c' : '#d2a46a'} />
      </View>
      <Animated.View style={[styles.person, { transform: [{ translateY: bob }, { scale: id === 'apprentice' ? 0.85 : 1 }] }]}>
        <Person w={w} />
      </Animated.View>
      <Animated.View style={[styles.arm, { transform: [{ translateY: bob }, { translateX: slide as any }, { rotate: rotate as any }] }]}>
        <Arm shirt={w.shirt}>{cfg.tool}</Arm>
      </Animated.View>
      {spin && (
        <Animated.Text style={[styles.sparkle, { opacity: v.interpolate({ inputRange: [0, cfg.hit, cfg.hit + 0.1, 1], outputRange: [0, 0, 1, 0] }) }]}>✨</Animated.Text>
      )}
    </View>
  );
}

/** Elite Logging Crew: a skidder hauling logs back and forth. */
function Skidder({ delay }: { delay: number }) {
  const v = useLoop(4200, delay);
  const x = v.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [-14, 22, 22, -14] });
  const flip = v.interpolate({ inputRange: [0, 0.499, 0.5, 0.999, 1], outputRange: [1, 1, -1, -1, 1] });
  const wheel = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1440deg'] });
  return (
    <View style={styles.station}>
      <Animated.View style={{ position: 'absolute', bottom: 10, left: 12, transform: [{ translateX: x }, { scaleX: flip }] }}>
        <Svg width={84} height={50} viewBox="0 0 84 50">
          <Rect x="2" y="24" width="40" height="8" rx="4" fill="#8a5a2e" stroke="#3a2210" strokeWidth="1" />
          <Rect x="6" y="16" width="36" height="8" rx="4" fill="#7a4f2a" stroke="#3a2210" strokeWidth="1" />
          <Ellipse cx="4" cy="20" rx="3" ry="4" fill="#f1d49c" />
          <Ellipse cx="2" cy="28" rx="3" ry="4" fill="#f1d49c" />
          <Rect x="40" y="18" width="34" height="18" rx="3" fill="#f5c542" stroke="#2b1d10" strokeWidth="1.2" />
          <Rect x="52" y="4" width="18" height="16" rx="2" fill="#f5c542" stroke="#2b1d10" strokeWidth="1.2" />
          <Rect x="55" y="7" width="12" height="9" rx="1" fill="#bfe6f2" stroke="#2b1d10" strokeWidth="0.8" />
          <Rect x="72" y="24" width="10" height="6" fill="#555" />
          <Rect x="44" y="10" width="3" height="9" fill="#444" />
        </Svg>
        {[48, 70].map((left) => (
          <Animated.View key={left} style={{ position: 'absolute', left: left - 9, top: 30, transform: [{ rotate: wheel }] }}>
            <Svg width={18} height={18} viewBox="0 0 18 18">
              <Circle cx="9" cy="9" r="8.5" fill="#222" />
              <Circle cx="9" cy="9" r="3.5" fill="#888" />
              <Rect x="8" y="1" width="2" height="5" fill="#555" />
            </Svg>
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
}

// ---------- machines you own ----------

function Truck({ delay }: { delay: number }) {
  const v = useLoop(1800, delay);
  const idle = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -1, 0] });
  const puff = v.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  return (
    <View style={styles.station}>
      <Animated.View style={{ position: 'absolute', bottom: 10, left: 6, transform: [{ translateY: idle }] }}>
        <Svg width={96} height={54} viewBox="0 0 96 54">
          <Rect x="4" y="26" width="56" height="6" fill="#444" />
          {[0, 1, 2].map((i) => <Rect key={i} x="6" y={8 + i * 6} width="52" height="7" rx="3.5" fill={i % 2 ? '#7a4f2a' : '#8a5a2e'} stroke="#3a2210" strokeWidth="0.8" />)}
          <Rect x="60" y="12" width="30" height="22" rx="3" fill="#2f6fb0" stroke="#2b1d10" strokeWidth="1.2" />
          <Rect x="66" y="15" width="16" height="9" rx="1" fill="#bfe6f2" stroke="#2b1d10" strokeWidth="0.8" />
          {[16, 46, 78].map((cx) => <Circle key={cx} cx={cx} cy="40" r="8" fill="#222" stroke="#555" strokeWidth="2" />)}
        </Svg>
      </Animated.View>
      <Animated.Text style={[styles.puff, { opacity: v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.6, 0] }), transform: [{ translateY: puff }] }]}>💨</Animated.Text>
    </View>
  );
}

function Crane({ delay }: { delay: number }) {
  const v = useLoop(5000, delay);
  const turn = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-14deg', '14deg', '-14deg'] });
  const lift = v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [10, -4, -4, 10, 10] });
  return (
    <View style={styles.station}>
      <Svg width={100} height={110} viewBox="0 0 100 110" style={StyleSheet.absoluteFill as any}>
        <Rect x="30" y="88" width="40" height="16" rx="3" fill="#f5c542" stroke="#2b1d10" strokeWidth="1.2" />
        <Rect x="44" y="30" width="8" height="60" fill="#e3a823" stroke="#2b1d10" strokeWidth="1" />
        {[38, 50, 62, 74].map((y) => <Line key={y} x1="44" y1={y} x2="52" y2={y + 8} stroke="#2b1d10" strokeWidth="1" />)}
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 8, top: 18, width: 84, height: 70, transform: [{ rotate: turn }] }}>
        <Svg width={84} height={14} viewBox="0 0 84 14">
          <Rect x="0" y="4" width="84" height="6" fill="#e3a823" stroke="#2b1d10" strokeWidth="1" />
        </Svg>
        <Animated.View style={{ position: 'absolute', left: 64, top: 10, alignItems: 'center', transform: [{ translateY: lift }] }}>
          <View style={{ width: 1.5, height: 24, backgroundColor: '#333' }} />
          <Log w={40} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Chipper({ delay }: { delay: number }) {
  const v = useLoop(600, delay);
  return (
    <View style={styles.station}>
      <Svg width={90} height={60} viewBox="0 0 90 60" style={{ position: 'absolute', bottom: 8, left: 6 }}>
        <Rect x="10" y="22" width="44" height="26" rx="4" fill="#2e8a3e" stroke="#2b1d10" strokeWidth="1.2" />
        <Polygon points="10,22 0,10 18,10 24,22" fill="#3f9a4f" stroke="#2b1d10" strokeWidth="1" />
        <Path d="M54 26 L74 10 L80 16 L60 32 Z" fill="#555" stroke="#2b1d10" strokeWidth="1" />
        <Circle cx="22" cy="50" r="7" fill="#222" />
        <Circle cx="44" cy="50" r="7" fill="#222" />
      </Svg>
      <View style={{ position: 'absolute', left: 84, top: 44 }}>
        <Chips v={v} at={0.05} n={6} spray color="#f1d49c" />
      </View>
    </View>
  );
}

function Harvester({ delay }: { delay: number }) {
  const v = useLoop(1600, delay);
  const arm = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-20deg', '10deg', '-20deg'] });
  const saw = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1080deg'] });
  return (
    <View style={styles.station}>
      <Svg width={70} height={50} viewBox="0 0 70 50" style={{ position: 'absolute', bottom: 8, left: 4 }}>
        <Rect x="4" y="18" width="50" height="20" rx="4" fill="#d1361e" stroke="#2b1d10" strokeWidth="1.2" />
        <Rect x="30" y="4" width="20" height="16" rx="3" fill="#d1361e" stroke="#2b1d10" strokeWidth="1.2" />
        <Rect x="33" y="7" width="14" height="9" fill="#bfe6f2" />
        <Rect x="2" y="38" width="56" height="10" rx="5" fill="#333" />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 44, top: 34, width: 60, height: 20, transform: [{ rotate: arm }] }}>
        <View style={{ position: 'absolute', left: 0, top: 8, width: 40, height: 5, backgroundColor: '#444', borderRadius: 2 }} />
        <Animated.View style={{ position: 'absolute', left: 34, top: 1, transform: [{ rotate: saw }] }}>
          <Svg width={18} height={18} viewBox="0 0 18 18">
            <Circle cx="9" cy="9" r="8.5" fill="#c9d3dc" stroke="#555" strokeWidth="1" />
            <Path d="M9 0 L11 4 L18 9 L14 11 L9 18 L7 14 L0 9 L4 7 Z" fill="#9aa0a6" />
          </Svg>
        </Animated.View>
      </Animated.View>
      <View style={{ position: 'absolute', left: 80, top: 44 }}>
        <Chips v={v} at={0.4} n={5} spray color="#f1d49c" />
      </View>
    </View>
  );
}

const MACHINES: Record<string, (p: { delay: number }) => ReactElement> = {
  truck: Truck, crane: Crane, chipper: Chipper, harvester: Harvester,
};
const MACHINE_NAMES: Record<string, string> = { truck: 'Logging Truck', crane: 'Crane', chipper: 'Wood Chipper', harvester: 'Harvester' };

/** The working yard: every helper type you hired and every big machine you own, all animated. */
export function WorkYard({ s }: { s: GameState }) {
  const helpers = HELPERS.filter((h) => (s.helpers[h.id]?.count ?? 0) > 0);
  const machines = Object.keys(MACHINES).filter((id) => s.tools[id]);
  if (!helpers.length && !machines.length) return null;
  return (
    <View style={styles.yard}>
      <View style={styles.grass} />
      <View style={styles.grid}>
        {helpers.map((h, i) => (
          <View key={h.id} style={styles.cell}>
            <Station id={h.id} delay={i * 170} />
            <View style={styles.badge}><Text style={styles.badgeText}>×{s.helpers[h.id].count}</Text></View>
            <Text style={styles.label} numberOfLines={1}>{h.name.replace(' Helper', '')}{s.helpers[h.id].level > 0 ? ` Lv${s.helpers[h.id].level + 1}` : ''}</Text>
          </View>
        ))}
        {machines.map((id, i) => {
          const M = MACHINES[id];
          const broken = (s.tools[id]?.durability ?? 100) <= 0;
          return (
            <View key={id} style={[styles.cell, broken && { opacity: 0.45 }]}>
              <M delay={i * 230} />
              <Text style={styles.label} numberOfLines={1}>{MACHINE_NAMES[id]}{broken ? ' (broken)' : ''}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yard: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#9fd3e6', borderWidth: 2, borderColor: '#5e9a52' },
  grass: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '30%', backgroundColor: '#7cb66a' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingVertical: 6 },
  cell: { width: 112, height: 128, alignItems: 'center' },
  station: { width: 110, height: 110 },
  target: { position: 'absolute', right: 2, bottom: 8 },
  chipsAt: { position: 'absolute', left: 80, top: 80 },
  person: { position: 'absolute', left: 14, bottom: 6 },
  arm: { position: 'absolute', left: 20, top: 30 },
  chip: { position: 'absolute' },
  sparkle: { position: 'absolute', left: 62, top: 30, fontSize: 18 },
  puff: { position: 'absolute', left: 4, top: 30, fontSize: 16 },
  badge: { position: 'absolute', top: 4, left: 6, backgroundColor: '#2b1d10', borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  label: { fontSize: 10.5, fontWeight: '900', color: '#17301f', marginTop: -4, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 6, paddingHorizontal: 5, overflow: 'hidden' },
});
