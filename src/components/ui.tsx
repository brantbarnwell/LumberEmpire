import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { durabilityColor } from '../game/logic';
import { C, shadow } from './theme';

export function GoldCoin({ size = 18 }: { size?: number }) {
  return (
    <View style={[styles.coin, { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(1.5, size / 10) }]}>
      <Text style={[styles.coinG, { fontSize: size * 0.55 }]}>G</Text>
    </View>
  );
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient colors={GRAD[variant]} style={[styles.btn, small && styles.btnSmall]}>
        {loading ? (
          <ActivityIndicator color={dark ? C.ink : '#fff'} />
        ) : (
          <>
            <Text style={[styles.btnText, small && { fontSize: 13 }, { color: dark ? C.ink : '#fff' }]}>{label}</Text>
            {sub ? <Text style={[styles.btnSub, { color: dark ? C.inkSoft : '#eaffea' }]}>{sub}</Text> : null}
          </>
        )}
      </LinearGradient>
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
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardEdge, padding: 12, ...shadow },
  btn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  btnSmall: { paddingVertical: 6, paddingHorizontal: 10, minHeight: 34 },
  btnText: { fontWeight: '900', fontSize: 15 },
  btnSub: { fontSize: 11, fontWeight: '700', marginTop: 1 },
  dur: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.15)', overflow: 'hidden' },
  durFill: { height: '100%', borderRadius: 4 },
  prog: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', overflow: 'hidden' },
});
