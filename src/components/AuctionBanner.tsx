import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useGame } from '../game/store';
import { LAND } from '../game/data';
import { money } from '../game/format';
import { C } from './theme';

/** Shows on every tab while an auction is running, so you never miss being outbid. */
export function AuctionBanner({ onOpen }: { onOpen: () => void }) {
  const s = useGame();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const a = s.auction;
  if (!a) return null;
  const left = Math.max(0, Math.ceil((a.endsAt - now) / 1000));
  const winning = a.leader === 'you';
  return (
    <Pressable onPress={onOpen} style={[styles.bar, { backgroundColor: winning ? C.leaf : '#b3361f' }]} accessibilityRole="button">
      <Text style={styles.text}>
        🔨 {LAND.find((l) => l.id === a.landId)!.name}: {left}s · {money(a.bid)} · {winning ? 'You are winning' : a.leader ? `${a.leader} is winning. Tap to bid!` : 'Tap to bid'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: 7, paddingHorizontal: 12 },
  text: { color: '#fff', fontWeight: '900', fontSize: 13, textAlign: 'center' },
});
