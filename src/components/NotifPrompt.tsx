import { StyleSheet, Text, View } from 'react-native';
import { update, useGame } from '../game/store';
import { askPermission } from '../services/notify';
import { Button } from './ui';
import { C, shadow } from './theme';

/** Asked once, after the first win (first upgrade), never on first launch. */
export function NotifPrompt() {
  const s = useGame();
  if (!s.firstWin || s.notif.asked || s.pendingOffline) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>🔔 Nice first upgrade!</Text>
        <Text style={styles.body}>Want a heads-up when your helpers fill the yard? At most 1 a day, never between 9pm and 9am.</Text>
        <View style={styles.row}>
          <Button style={{ flex: 1 }} small label="Yes, tell me" onPress={async () => {
            const granted = await askPermission();
            update((st) => ({ ...st, notif: { ...st.notif, asked: true, granted } }));
          }} />
          <Button style={{ flex: 1 }} small variant="ghost" label="No thanks" onPress={() => update((st) => ({ ...st, notif: { ...st.notif, asked: true } }))} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, bottom: 100, zIndex: 40, alignItems: 'center' },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 14, width: '100%', maxWidth: 420, borderWidth: 2, borderColor: C.leafLight, ...shadow },
  title: { fontSize: 16, fontWeight: '900', color: C.ink },
  body: { fontSize: 13, fontWeight: '700', color: C.inkSoft, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
