import { StyleSheet, Text, View } from 'react-native';
import { update, useGame } from '../game/store';
import { askPermission } from '../services/notify';
import { Button } from './ui';
import { C, shadow } from './theme';

/** Update 3: asked once, after the first win or the first offline return, never on first launch. */
export function NotifPrompt() {
  const s = useGame();
  const ready = s.firstWin || (s.stats.offlineCollects ?? 0) > 0;
  if (!ready || s.notif.asked || s.pendingOffline) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>Tell me when my sawmill is full?</Text>
        <Text style={styles.body}>At most 1 a day, never between 9pm and 9am, never while you play.</Text>
        <View style={styles.row}>
          <Button style={{ flex: 1 }} small label="Yes, tell me" onPress={async () => {
            const granted = await askPermission();
            update((st) => ({ ...st, notif: { ...st.notif, asked: true, granted } }));
          }} />
          <Button style={{ flex: 1 }} small variant="ghost" label="Not now" onPress={() => update((st) => ({ ...st, notif: { ...st.notif, asked: true } }))} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, top: 120, zIndex: 40, alignItems: 'center' },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, width: '100%', maxWidth: 420, borderWidth: 2, borderColor: C.leafLight, ...shadow },
  title: { fontSize: 16, fontWeight: '900', color: C.ink },
  body: { fontSize: 13, fontWeight: '700', color: C.inkSoft, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
