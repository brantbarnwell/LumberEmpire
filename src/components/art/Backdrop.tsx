// Update 3: home-screen backgrounds (Cosmetics). Same flat style; they change looks only.
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';
import { lessMotion } from '../../services/feel';

const ND = Platform.OS !== 'web';
type Look = {
  sky: [string, string, string]; sun: string | null; moon?: boolean; stars?: boolean; aurora?: boolean;
  mtn: [string, string]; snowcaps: boolean; hill: string; pine: [string, string]; front: string; ground: string; clouds: string | null;
  bigMountains?: boolean; snowGround?: boolean;
};
export const BACKDROPS: Record<string, Look> = {
  'bg-forest': { sky: ['#8fd0ec', '#cdeef5', '#eaf7e2'], sun: '#fff1a0', mtn: ['#9cb8c9', '#c9dfd8'], snowcaps: true, hill: '#8fc27a', pine: ['#4f8f52', '#3e7a45'], front: '#6fae5e', ground: '#6fae5e', clouds: '#ffffff' },
  'bg-mountains': { sky: ['#7cc3e6', '#c4e6f2', '#e3f2ea'], sun: '#fff1a0', mtn: ['#7f9db3', '#aac4cf'], snowcaps: true, hill: '#7fb06c', pine: ['#3e7a45', '#2f6b3a'], front: '#5f9e51', ground: '#5f9e51', clouds: '#ffffff', bigMountains: true },
  'bg-sunset': { sky: ['#f08a5d', '#f7b37a', '#ffe0a3'], sun: '#fff0b8', mtn: ['#8a5a7a', '#c98a8a'], snowcaps: false, hill: '#a8885a', pine: ['#5a4a3a', '#4a3a2e'], front: '#8a7a4a', ground: '#7d8a4a', clouds: '#ffd9c0' },
  'bg-night': { sky: ['#0f1d3d', '#1f3566', '#34507d'], sun: null, moon: true, stars: true, mtn: ['#2a3d5c', '#3c5476'], snowcaps: true, hill: '#2e4a3a', pine: ['#1e3a2a', '#163024'], front: '#2a4a34', ground: '#2a4a34', clouds: null },
  'bg-snowy': { sky: ['#a9d7ef', '#dcf0f8', '#f4fbff'], sun: '#fffbe0', mtn: ['#b9cbd8', '#e4eef3'], snowcaps: true, hill: '#eef6fa', pine: ['#3e6f50', '#2f5c42'], front: '#f4f9fc', ground: '#e8f2f7', clouds: '#ffffff', bigMountains: true, snowGround: true },
  'bg-aurora': { sky: ['#071a2a', '#0f2d3f', '#1d4152'], sun: null, moon: false, stars: true, aurora: true, mtn: ['#1f3a4a', '#2d4d5c'], snowcaps: true, hill: '#24443a', pine: ['#173527', '#10291e'], front: '#1f3d30', ground: '#1f3d30', clouds: null },
};

export function groundColor(bg: string) {
  return (BACKDROPS[bg] ?? BACKDROPS['bg-forest']).ground;
}

function Cloud({ top, size, dur, delay, color }: { top: number; size: number; dur: number; delay: number; color: string }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (lessMotion()) return;
    const l = Animated.loop(Animated.timing(x, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: ND }));
    const t = setTimeout(() => l.start(), delay);
    return () => { clearTimeout(t); l.stop(); };
  }, []);
  return (
    <Animated.View style={{ position: 'absolute', top, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-160, 520] }) }] }}>
      <Svg width={size} height={size * 0.5} viewBox="0 0 100 50">
        <Path d="M10 44 Q0 44 4 34 Q6 24 18 26 Q22 10 40 14 Q50 2 64 12 Q80 8 82 24 Q98 24 96 36 Q96 46 84 44 Z" fill={color} stroke="#3a2210" strokeOpacity={0.25} strokeWidth={2} />
      </Svg>
    </Animated.View>
  );
}

function useTwinkle() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (lessMotion()) return;
    const l = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: 1800, useNativeDriver: ND }),
      Animated.timing(t, { toValue: 0, duration: 1800, useNativeDriver: ND }),
    ]));
    l.start();
    return () => l.stop();
  }, []);
  return t;
}

/** The whole sky-to-ground scene. `live` adds drifting clouds and twinkling stars (home screen). */
export function Backdrop({ bg, h, live }: { bg: string; h: number; live?: boolean }) {
  const L = BACKDROPS[bg] ?? BACKDROPS['bg-forest'];
  const tw = useTwinkle();
  const id = bg.replace(/[^a-z]/g, '');
  const peaks = L.bigMountains
    ? 'M0 90 L50 15 L100 70 L165 0 L235 80 L300 10 L360 60 L400 30 L400 300 L0 300 Z'
    : 'M0 110 L60 40 L110 95 L170 20 L240 105 L300 35 L360 90 L400 60 L400 300 L0 300 Z';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={L.sky} style={StyleSheet.absoluteFill} />
      {L.stars && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: live ? tw.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) : 1 }]}>
          <Svg width="100%" height="100%" viewBox="0 0 400 600" preserveAspectRatio="none">
            {Array.from({ length: 40 }, (_, i) => <Circle key={i} cx={(i * 97) % 400} cy={(i * 53) % 300} r={i % 5 === 0 ? 1.8 : 1.1} fill="#fffbe6" />)}
          </Svg>
        </Animated.View>
      )}
      {L.aurora && (
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 400 600" preserveAspectRatio="none">
          <Defs>
            <SvgGrad id={`au${id}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#6dffb0" stopOpacity="0" /><Stop offset="0.5" stopColor="#6dffb0" stopOpacity="0.55" /><Stop offset="1" stopColor="#5ad1ff" stopOpacity="0" /></SvgGrad>
          </Defs>
          <Path d="M-20 160 Q80 60 180 140 T420 100 L420 200 Q300 240 180 200 T-20 250 Z" fill={`url(#au${id})`} />
          <Path d="M-20 90 Q120 20 220 80 T420 40 L420 110 Q300 150 200 120 T-20 160 Z" fill={`url(#au${id})`} opacity={0.6} />
        </Svg>
      )}
      {L.sun && <View style={[styles.sunGlow, { backgroundColor: L.sun }]} />}
      {L.sun && <View style={[styles.sun, { backgroundColor: L.sun }]} />}
      {L.moon && (
        <View style={styles.moonWrap}>
          <Svg width={50} height={50} viewBox="0 0 50 50"><Circle cx="25" cy="25" r="20" fill="#fff6d6" stroke="#3a2210" strokeOpacity={0.3} strokeWidth={2} /><Circle cx="33" cy="20" r="18" fill={L.sky[0]} /></Svg>
        </View>
      )}
      {L.clouds && live && <Cloud top={16} size={110} dur={70000} delay={0} color={L.clouds} />}
      {L.clouds && live && <Cloud top={70} size={80} dur={90000} delay={25000} color={L.clouds} />}
      {L.clouds && !live && (
        <View style={{ position: 'absolute', top: 10, left: 20 }}>
          <Svg width={70} height={35} viewBox="0 0 100 50"><Path d="M10 44 Q0 44 4 34 Q6 24 18 26 Q22 10 40 14 Q50 2 64 12 Q80 8 82 24 Q98 24 96 36 Q96 46 84 44 Z" fill={L.clouds} /></Svg>
        </View>
      )}
      <Svg style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} width="100%" height={h * 0.78} viewBox="0 0 400 300" preserveAspectRatio="none">
        <Defs>
          <SvgGrad id={`mt${id}`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={L.mtn[0]} /><Stop offset="1" stopColor={L.mtn[1]} /></SvgGrad>
        </Defs>
        <Path d={peaks} fill={`url(#mt${id})`} stroke="#3a2210" strokeOpacity={0.25} strokeWidth={2} />
        {L.snowcaps && !L.bigMountains && <Path d="M170 20 L188 46 L176 42 L164 50 L152 44 Z M300 35 L316 58 L304 54 L292 60 L284 54 Z" fill="#ffffff" opacity={0.9} />}
        {L.snowcaps && L.bigMountains && <Path d="M50 15 L68 42 L56 38 L44 46 L34 38 Z M165 0 L188 34 L174 30 L160 38 L148 30 Z M300 10 L320 40 L306 36 L292 44 L282 36 Z" fill="#ffffff" opacity={0.95} />}
        <Path d="M0 160 Q100 110 200 150 T400 140 L400 300 L0 300 Z" fill={L.hill} />
        {Array.from({ length: 16 }, (_, i) => {
          const x = i * 26 + (i % 2) * 8;
          const ht = 40 + ((i * 37) % 26);
          const base = 166 + ((i * 13) % 14);
          return (
            <Path key={i} d={`M${x} ${base} L${x + 13} ${base - ht} L${x + 26} ${base} Z`} fill={i % 3 ? L.pine[0] : L.pine[1]} stroke="#3a2210" strokeOpacity={0.25} strokeWidth={1.5} />
          );
        })}
        {L.snowGround && Array.from({ length: 16 }, (_, i) => {
          const x = i * 26 + (i % 2) * 8;
          const ht = 40 + ((i * 37) % 26);
          const base = 166 + ((i * 13) % 14);
          return <Path key={`s${i}`} d={`M${x + 7} ${base - ht * 0.55} L${x + 13} ${base - ht} L${x + 19} ${base - ht * 0.55} Z`} fill="#ffffff" />;
        })}
        <Path d="M0 236 Q120 214 220 230 T400 226 L400 300 L0 300 Z" fill={L.front} stroke="#3a2210" strokeOpacity={0.3} strokeWidth={2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  sun: { position: 'absolute', right: 34, top: 18, width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(58,34,16,0.25)' },
  sunGlow: { position: 'absolute', right: 16, top: 0, width: 86, height: 86, borderRadius: 43, opacity: 0.4 },
  moonWrap: { position: 'absolute', right: 30, top: 16 },
});
