import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '../game/store';
import { rankInfo } from '../game/logic';
import { money, small, whole } from '../game/format';
import { recentWoodPerSec } from '../game/rate';
import { GoldCoin, ProgressBar } from './ui';
import { C } from './theme';

export function TopBar({ onShop }: { onShop: () => void }) {
  const s = useGame();
  const insets = useSafeAreaInsets();
  const [wps, setWps] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWps(recentWoodPerSec()), 1000);
    return () => clearInterval(t);
  }, []);
  const rank = rankInfo(s.totalMoneyEarned);

  return (
    <LinearGradient colors={[C.forest, C.forest2]} style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <View style={[styles.pill, { flex: 1.25 }]}>
          <Text style={styles.money} numberOfLines={1} adjustsFontSizeToFit>{money(s.money)}</Text>
        </View>
        <View style={[styles.pill, { flex: 1 }]}>
          <GoldCoin size={18} />
          <Text style={styles.gold} numberOfLines={1} adjustsFontSizeToFit>{whole(s.gold)}</Text>
        </View>
        <Pressable onPress={onShop} accessibilityRole="button" accessibilityLabel="Open Shop"
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <LinearGradient colors={['#ffd968', '#e3a823']} style={styles.shop}>
            <Text style={styles.shopText}>+ Shop</Text>
          </LinearGradient>
        </Pressable>
      </View>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Text style={styles.stat}>🪵 {whole(s.wood)} wood</Text>
        <Text style={styles.stat}>⚡ {small(wps)}/sec</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.rank} numberOfLines={1}>🏆 {rank.name}</Text>
      </View>
      <View style={[styles.row, { marginTop: 5 }]}>
        <ProgressBar value={rank.progress} />
        <Text style={styles.next} numberOfLines={1}>
          {rank.next ? `Next: ${rank.next} at ${money(rank.nextAt!)} earned` : 'Top rank!'}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 12, paddingBottom: 10, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, zIndex: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 14,
    paddingHorizontal: 12, height: 38, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  money: { color: '#7dff8f', fontWeight: '900', fontSize: 20, flexShrink: 1 },
  gold: { color: C.gold, fontWeight: '900', fontSize: 20, flexShrink: 1 },
  shop: { height: 38, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' },
  shopText: { color: C.ink, fontWeight: '900', fontSize: 15 },
  stat: { color: C.cream, fontWeight: '800', fontSize: 13 },
  rank: { color: C.gold, fontWeight: '800', fontSize: 13, flexShrink: 1 },
  next: { color: 'rgba(246,236,214,0.75)', fontSize: 11, fontWeight: '700', marginLeft: 8, maxWidth: '60%' },
});
