// Update 2: the production line behind the tree on the home screen.
// Logs ride a conveyor from the tree to the Sawmill, planks go to the truck, helpers carry logs,
// and the machines (debarker, canting machine, forklift, truck) move only while wood is being made.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { GameState } from '../../game/logic';
import { passiveWoodPerSec } from '../../game/logic';
import { HELPERS } from '../../game/data';
import { INK, PAL } from './Icons';
import { Blade, SawmillArt } from './Buildings';
import { Person, WHO } from './Crew';
import { lessMotion, onPop } from '../../services/feel';

const ND = Platform.OS !== 'web';

function useLoop(duration: number, running: boolean, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running || lessMotion()) { v.stopAnimation(); return; }
    const l = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: ND }));
    const t = setTimeout(() => l.start(), delay);
    return () => { clearTimeout(t); l.stop(); };
  }, [duration, running, delay]);
  return v;
}

const LogPiece = ({ w = 30, gold }: { w?: number; gold?: boolean }) => (
  <Svg width={w} height={w * 0.4} viewBox="0 0 30 12">
    <Rect x="1" y="1" width="25" height="10" rx="5" fill={gold ? PAL.gold : PAL.bark} stroke={INK} strokeWidth={1.4} />
    <Ellipse cx="25" cy="6" rx="3.5" ry="5" fill={gold ? '#fff1b0' : PAL.woodLight} stroke={INK} strokeWidth={1.4} />
  </Svg>
);

function Conveyor({ x1, x2, y, running, speed }: { x1: number; x2: number; y: number; running: boolean; speed: number }) {
  const len = x2 - x1;
  const v = useLoop(Math.max(1600, 5200 / speed), running);
  const [special, setSpecial] = useState(0);
  const sv = useRef(new Animated.Value(0)).current;
  // a log visibly travels down the line every time you buy something that adds wood/sec
  useEffect(() => onPop((t) => {
    if (t !== 'wps' || lessMotion()) return;
    setSpecial((n) => n + 1);
    sv.setValue(0);
    Animated.timing(sv, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }).start();
  }), []);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x1, top: y, width: len, height: 26 }}>
      <Svg width={len} height={26} viewBox={`0 0 ${len} 26`} style={{ position: 'absolute', top: 10 }}>
        <Rect x="0" y="0" width={len} height="8" rx="4" fill="#4a4a4a" stroke={INK} strokeWidth={1.8} />
        {Array.from({ length: Math.floor(len / 18) }, (_, i) => <Circle key={i} cx={9 + i * 18} cy="4" r="2" fill="#888" />)}
        {Array.from({ length: Math.floor(len / 40) + 1 }, (_, i) => <Path key={i} d={`M${10 + i * 40} 8 v8`} stroke={INK} strokeWidth={2.4} />)}
      </Svg>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={{ position: 'absolute', top: 0, opacity: running ? 1 : 0, transform: [{ translateX: Animated.add(Animated.modulo(Animated.add(Animated.multiply(v, len), (i * len) / 3), len), -24) }] }}>
          <LogPiece />
        </Animated.View>
      ))}
      {special > 0 && (
        <Animated.View key={special} style={{ position: 'absolute', top: -2, opacity: sv.interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: sv.interpolate({ inputRange: [0, 1], outputRange: [-10, len - 30] }) }, { scale: 1.25 }] }}>
          <LogPiece gold />
        </Animated.View>
      )}
    </View>
  );
}

function Debarker({ x, y, running }: { x: number; y: number; running: boolean }) {
  const v = useLoop(700, running);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: 40, height: 40 }}>
      <Svg width={40} height={40} viewBox="0 0 40 40">
        <Rect x="2" y="8" width="36" height="24" rx="4" fill={PAL.pine} stroke={INK} strokeWidth={2} />
        <Rect x="6" y="32" width="4" height="8" fill={INK} /><Rect x="30" y="32" width="4" height="8" fill={INK} />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 10, top: 10, transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        <Svg width={20} height={20} viewBox="0 0 20 20"><Circle cx="10" cy="10" r="8" fill={PAL.steel} stroke={INK} strokeWidth={1.6} /><Path d="M10 2 v16 M2 10 h16" stroke={INK} strokeWidth={1.6} /></Svg>
      </Animated.View>
    </View>
  );
}

function Canter({ x, y, running }: { x: number; y: number; running: boolean }) {
  const v = useLoop(900, running);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: 36, height: 48 }}>
      <Svg width={36} height={48} viewBox="0 0 36 48">
        <Rect x="2" y="22" width="32" height="18" rx="3" fill={PAL.gold} stroke={INK} strokeWidth={2} />
        <Rect x="14" y="0" width="8" height="24" fill={PAL.steel} stroke={INK} strokeWidth={1.6} />
        <Rect x="5" y="40" width="4" height="8" fill={INK} /><Rect x="27" y="40" width="4" height="8" fill={INK} />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 9, top: 4, transform: [{ translateY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 14, 0] }) }] }}>
        <Svg width={18} height={8} viewBox="0 0 18 8"><Rect x="0" y="0" width="18" height="8" rx="2" fill={PAL.red} stroke={INK} strokeWidth={1.4} /></Svg>
      </Animated.View>
    </View>
  );
}

function Forklift({ x1, x2, y, running }: { x1: number; x2: number; y: number; running: boolean }) {
  const v = useLoop(6000, running);
  const flip = v.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [1, 1, -1, -1] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x1, top: y, transform: [{ translateX: v.interpolate({ inputRange: [0, 0.45, 0.5, 0.95, 1], outputRange: [0, x2 - x1, x2 - x1, 0, 0] }) }, { scaleX: flip }] }}>
      <Svg width={56} height={40} viewBox="0 0 56 40">
        <Rect x="4" y="14" width="30" height="16" rx="3" fill={PAL.gold} stroke={INK} strokeWidth={2} />
        <Rect x="12" y="2" width="16" height="14" rx="2" fill="none" stroke={INK} strokeWidth={2} />
        <Path d="M36 2 v28 M36 26 h16" stroke={INK} strokeWidth={2.4} />
        <Rect x="38" y="16" width="16" height="9" rx="1" fill={PAL.woodLight} stroke={INK} strokeWidth={1.4} />
        <Circle cx="12" cy="32" r="6" fill="#333" stroke={INK} strokeWidth={1.6} /><Circle cx="28" cy="32" r="6" fill="#333" stroke={INK} strokeWidth={1.6} />
      </Svg>
    </Animated.View>
  );
}

function Truck({ x, y, running }: { x: number; y: number; running: boolean }) {
  // loads up, drives off to the right, comes back empty
  const v = useLoop(9000, running);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, transform: [{ translateX: v.interpolate({ inputRange: [0, 0.6, 0.75, 0.85, 1], outputRange: [0, 0, 260, 260, 0] }) }] }}>
      <Svg width={92} height={52} viewBox="0 0 92 52">
        <Rect x="2" y="26" width="54" height="8" fill="#444" stroke={INK} strokeWidth={1.4} />
        <Rect x="56" y="12" width="32" height="24" rx="3" fill={PAL.red} stroke={INK} strokeWidth={2} />
        <Rect x="62" y="16" width="16" height="9" rx="1" fill={PAL.sky} stroke={INK} strokeWidth={1.2} />
        <Circle cx="16" cy="40" r="7.5" fill="#222" stroke={INK} strokeWidth={1.6} /><Circle cx="44" cy="40" r="7.5" fill="#222" stroke={INK} strokeWidth={1.6} /><Circle cx="76" cy="40" r="7.5" fill="#222" stroke={INK} strokeWidth={1.6} />
      </Svg>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={{ position: 'absolute', left: 6, top: 18 - i * 7, opacity: v.interpolate({ inputRange: [0, 0.15 + i * 0.15, 0.16 + i * 0.15, 1], outputRange: [0, 0, 1, 1] }) }}>
          <Svg width={48} height={8} viewBox="0 0 48 8"><Rect x="0" y="0" width="48" height="7" rx="1.5" fill={i % 2 ? PAL.woodLight : PAL.wood} stroke={INK} strokeWidth={1.2} /></Svg>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

/** A helper walking from the tree to the mill with a log, and back. */
function Walker({ id, x1, x2, y, delay }: { id: string; x1: number; x2: number; y: number; delay: number }) {
  const dur = { apprentice: 7000, lumberjack: 8000, veteran: 9000, feller: 6500, master: 10000, crew: 7500 }[id] ?? 8000;
  const v = useLoop(dur, true, delay);
  const step = useLoop(420, true, delay);
  const flip = v.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [1, 1, -1, -1] });
  if (id === 'crew') return null; // the Elite Crew is the skidder in the Helpers tab
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x1, top: y, transform: [
      { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, x2 - x1, 0] }) },
      { translateY: step.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -2.5, 0] }) },
      { scaleX: flip }, { scale: 0.56 },
    ] }}>
      <Person w={WHO[id]} />
      <Animated.View style={{ position: 'absolute', left: 14, top: 22, opacity: v.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] }) }}>
        <LogPiece w={36} />
      </Animated.View>
    </Animated.View>
  );
}

/** Everything behind the big tree: mill, conveyor, machines, walking helpers. */
export function ProductionLine({ s, width, groundY }: { s: GameState; width: number; groundY: number }) {
  const running = passiveWoodPerSec(s, Date.now()) > 0;
  const lvl = s.sawmill.level;
  const millW = Math.min(170, width * 0.42);
  const millX = width - millW - 2;
  const millH = (millW * 100) / 150;
  const beltY = groundY - 30;
  const types = HELPERS.filter((h) => (s.helpers[h.id]?.count ?? 0) > 0).map((h) => h.id);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height: groundY + 40 }}>
      <View style={{ position: 'absolute', left: millX, top: groundY - millH - 6 }}>
        <SawmillArt level={Math.max(1, lvl)} running={running} width={millW} />
      </View>
      <Conveyor x1={width * 0.44} x2={millX + millW * 0.3} y={beltY} running={running} speed={1 + lvl * 0.5} />
      {lvl >= 2 && <Debarker x={width * 0.5} y={beltY - 22} running={running} />}
      {lvl >= 3 && <Canter x={millX - 30} y={beltY - 30} running={running} />}
      {(lvl >= 1 || s.tools.truck) && <Truck x={width - 96} y={groundY - 4} running={running} />}
      {lvl >= 4 && <Forklift x1={8} x2={width * 0.22} y={groundY - 8} running={running} />}
      {types.map((id, i) => (
        <Walker key={id} id={id} x1={width * 0.46} x2={millX + 10} y={groundY - 22 + (i % 3) * 5} delay={i * 900} />
      ))}
    </View>
  );
}

export { Blade };
