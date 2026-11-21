import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getState, update, useGame } from '../game/store';
import { collectOffline } from '../game/logic';
import { adFree } from '../game/meta';
import { AD_OFFLINE_MULT, OFFLINE_MAX_HOURS } from '../game/data';
import { duration, money, whole } from '../game/format';
import { earnReward } from '../services/ads';
import { haptic } from '../services/haptics';
import { Button } from './ui';
import { C, shadow } from './theme';

/** Welcome back: plain Collect, or watch a video (optional) for 2x. Ad-free players get 2x instantly. */
export function WelcomeBack() {
  const s = useGame();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const r = s.pendingOffline;
  if (!r) return null;
  const free = adFree(s);

  const collect = (mult: number) => {
    update((st) => (st.pendingOffline ? { ...collectOffline(st, st.pendingOffline, mult), pendingOffline: null } : null));
    haptic.success();
  };

  return (
    <View style={styles.back}>
      <View style={styles.card}>
        <Text style={styles.icon}>🌙</Text>
        <Text style={styles.title}>Welcome back!</Text>
        <Text style={styles.body}>
          You were away {duration(r.away * 1000)}{r.away >= OFFLINE_MAX_HOURS * 3600 ? ' (8 hour max)' : ''}. Your crew chopped {whole(r.produced)} wood and sold {whole(r.sold)}.
        </Text>
        <Text style={styles.amount}>{money(r.earned)}</Text>
        {err && <Text style={styles.err}>{err}</Text>}
        <Button
          style={{ alignSelf: 'stretch', marginTop: 10 }}
          variant="gold"
          label={free ? `Collect ${AD_OFFLINE_MULT}x (VIP / No Ads)` : `▶ Watch a video: ${AD_OFFLINE_MULT}x`}
          sub={money(r.earned * AD_OFFLINE_MULT)}
          loading={busy}
          onPress={async () => {
            setErr(null);
            setBusy(true);
            const res = await earnReward(adFree(getState()));
            setBusy(false);
            if (res.ok) collect(AD_OFFLINE_MULT);
            else setErr(res.message);
          }}
        />
        <Button style={{ alignSelf: 'stretch', marginTop: 8 }} label={`Collect ${money(r.earned)}`} disabled={busy} onPress={() => collect(1)} />
        <Text style={styles.small}>While you are away, helpers and land work at half speed for up to 8 hours.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,20,12,0.6)', alignItems: 'center', justifyContent: 'center', padding: 26, zIndex: 60 },
  card: { backgroundColor: C.card, borderRadius: 22, padding: 22, alignItems: 'center', width: '100%', maxWidth: 380, borderWidth: 3, borderColor: C.gold, ...shadow },
  icon: { fontSize: 50 },
  title: { fontSize: 24, fontWeight: '900', color: C.ink },
  body: { fontSize: 14, fontWeight: '700', color: C.inkSoft, textAlign: 'center', marginTop: 6 },
  amount: { fontSize: 34, fontWeight: '900', color: C.money, marginTop: 6 },
  err: { color: C.red, fontWeight: '800', fontSize: 12.5, textAlign: 'center', marginTop: 6 },
  small: { fontSize: 11, color: C.inkSoft, fontWeight: '600', textAlign: 'center', marginTop: 10 },
});
