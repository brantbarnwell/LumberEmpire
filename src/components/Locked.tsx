// Update 3: systems unlock on a schedule (every 1 to 3 hours of early play).
import { StyleSheet, Text, View } from 'react-native';
import { useGame } from '../game/store';
import { SYSTEMS, SystemId } from '../game/data';
import { duration } from '../game/format';
import { Icon } from './art/Icons';
import { Card } from './ui';
import { C } from './theme';

export function minutesLeft(playSec: number, id: SystemId) {
  const def = SYSTEMS.find((x) => x.id === id)!;
  return Math.max(0, def.minutes * 60 - playSec);
}

/** A whole tab that is not open yet. */
export function LockedScreen({ id }: { id: SystemId }) {
  const s = useGame();
  const def = SYSTEMS.find((x) => x.id === id)!;
  return (
    <View style={styles.page}>
      <Card style={styles.card}>
        <Icon name="lock" size={56} />
        <Text style={styles.title}>{def.name}</Text>
        <Text style={styles.why}>{def.why}</Text>
        <Text style={styles.when}>Opens in {duration(minutesLeft(s.playSec, id) * 1000)} of play</Text>
      </Card>
    </View>
  );
}

/** A small locked row inside a screen. */
export function LockedRow({ id }: { id: SystemId }) {
  const s = useGame();
  const def = SYSTEMS.find((x) => x.id === id)!;
  return (
    <Card style={styles.row}>
      <Icon name="lock" size={28} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{def.name}</Text>
        <Text style={styles.rowText}>Opens in {duration(minutesLeft(s.playSec, id) * 1000)} of play. {def.why}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream, padding: 20, justifyContent: 'center' },
  card: { alignItems: 'center', gap: 8, paddingVertical: 26 },
  title: { fontSize: 22, fontWeight: '900', color: C.ink },
  why: { fontSize: 14, fontWeight: '700', color: C.inkSoft, textAlign: 'center' },
  when: { fontSize: 15, fontWeight: '900', color: C.bark, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.85 },
  rowTitle: { fontSize: 15, fontWeight: '900', color: C.ink },
  rowText: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
});
