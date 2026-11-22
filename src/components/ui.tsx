import { ReactNode, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { durabilityColor } from '../game/logic';
import { C, shadow } from './theme';
import { Icon } from './art/Icons';

export function GoldCoin({ size = 18 }: { size?: number }) {
  return <Icon name="gold" size={size + 2} />;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style as any]}>{children}</View>;
}

type Variant = 'green' | 'gold' | 'brown' | 'red' | 'ghost';
const GRAD: Record<Variant, [string, string]> = {
  green: ['#5fb85a', '#2e8a3e'],
  gold: ['#ffd968', '#e3a823'],
  brown: ['#9a6a3c', '#6b4423'],
  red: ['#f06b5b', '#c9372a'],
  ghost: ['#fff8ea', '#f1e4c6'],
};

export function Button({
  label, onPress, variant = 'green', disabled, loading, small, style, sub,
}: {
  label: string; onPress: () => void; variant?: Variant; disabled?: boolean; loading?: boolean;
  small?: boolean; style?: ViewStyle; sub?: string;
}) {
  const dark = variant === 'gold' || variant === 'ghost';
  const sc = useRef(new Animated.Value(1)).current;
  const nd = Platform.OS !== 'web';
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(sc, { toValue: 0.94, friction: 7, tension: 320, useNativeDriver: nd }).start()}
      onPressOut={() => Animated.spring(sc, { toValue: 1, friction: 3.5, tension: 220, useNativeDriver: nd }).start()}
      disabled={disabled || loading}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={{ transform: [{ scale: sc }] }}>
      <LinearGradient colors={GRAD[variant]} style={[styles.btn, small && styles.btnSmall, !dark && styles.btnShine]}>
        {loading ? (
          <ActivityIndicator color={dark ? C.ink : '#fff'} />
        ) : (
          <>
            <Text style={[styles.btnText, small && { fontSize: 13 }, { color: dark ? C.ink : '#fff' }]}>{label}</Text>
            {sub ? <Text style={[styles.btnSub, { color: dark ? C.inkSoft : '#eaffea' }]}>{sub}</Text> : null}
          </>
        )}
      </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export function DurabilityBar({ value, width = 120 }: { value: number; width?: number }) {
  return (
    <View style={[styles.dur, { width }]}>
      <View style={[styles.durFill, { width: `${Math.max(0, value)}%`, backgroundColor: durabilityColor(value) }]} />
    </View>
  );
}

export function ProgressBar({ value, color = C.gold, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={[styles.prog, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  coin: { backgroundColor: C.gold, borderColor: C.goldDark, alignItems: 'center', justifyContent: 'center' },
  coinG: { color: '#8a5d00', fontWeight: '900' },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 2, borderColor: '#d9c39a', padding: 12, ...shadow },
  btn: { borderRadius: 12, borderWidth: 2, borderColor: '#3a2210', paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  btnShine: { borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.22)' },
  btnSmall: { paddingVertical: 6, paddingHorizontal: 10, minHeight: 34 },
  btnText: { fontWeight: '900', fontSize: 15, textShadowColor: 'rgba(0,0,0,0.18)', textShadowRadius: 1, textShadowOffset: { width: 0, height: 1 } },
  btnSub: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  dur: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.15)', overflow: 'hidden' },
  durFill: { height: '100%', borderRadius: 4 },
  prog: { flexGrow: 1, flexShrink: 1, alignSelf: 'stretch', backgroundColor: 'rgba(0,0,0,0.3)', overflow: 'hidden' },
});
