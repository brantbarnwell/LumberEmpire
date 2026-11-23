// Playbook 3: the Starter Pack offer. Pops up once, after the first helper, only in the first 72 hours,
// never on the home screen while you are chopping. "No thanks" closes it for good; it stays in the Shop until 72 hours.
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getState, update, useGame } from '../game/store';
import { grantProduct } from '../game/logic';
import { STARTER_ID, starterPopupDue } from '../game/meta';
import { STARTER_PACK_HOURS, productById } from '../game/data';
import { duration } from '../game/format';
import { buy, useStore } from '../services/purchases';
import { haptic } from '../services/haptics';
import { Button } from './ui';
import { C, shadow } from './theme';

export function StarterOffer({ onHome }: { onHome: boolean }) {
  const s = useGame();
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const now = Date.now();
  const p = productById(STARTER_ID)!;

  const due = !open && !onHome && !s.pendingOffline && starterPopupDue(s, now);
  useEffect(() => {
    if (!due) return;
    // marked shown the moment it appears, so it is only ever shown once
    update((st) => (st.offers.starterShown ? null : { ...st, offers: { ...st.offers, starterShown: true } }));
    setOpen(true);
  }, [due]);
  if (!open) return null;

  const onBuy = async () => {
    setMsg(null);
    setBusy(true);
    const r = await buy(p.id);
    setBusy(false);
    if (!r.ok) {
      setMsg(r.message);
      return;
    }
    update((st) => grantProduct(st, r.productId, r.transactionId, Date.now()));
    haptic.success();
    setOpen(false);
  };
  const left = getState().offers.firstSeenAt + STARTER_PACK_HOURS * 3600_000 - now;

  return (
    <View style={styles.back}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Your first helper is working!</Text>
        <Text style={styles.title}>Starter Pack</Text>
        {p.perks.map((k) => (
          <Text key={k} style={styles.perk}>• {k}</Text>
        ))}
        <Text style={styles.small}>Only in your first 72 hours ({duration(Math.max(0, left))} left). Shown once. Everything in it can also be earned by playing.</Text>
        {msg && <Text style={styles.err}>{msg}</Text>}
        <View style={styles.buttons}>
          <Button style={{ flex: 1 }} variant="ghost" label="No thanks" disabled={busy} onPress={() => setOpen(false)} />
          <Button style={{ flex: 1 }} variant="gold" label={store.prices[p.id] ?? p.usd} loading={busy} onPress={onBuy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,20,12,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 55 },
  card: { backgroundColor: C.card, borderRadius: 22, padding: 18, width: '100%', maxWidth: 380, borderWidth: 3, borderColor: '#3a2210', gap: 4, ...shadow },
  kicker: { fontSize: 13, fontWeight: '900', color: C.money, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: C.ink, textAlign: 'center', marginBottom: 4 },
  perk: { fontSize: 15, fontWeight: '800', color: C.ink },
  small: { fontSize: 11.5, fontWeight: '600', color: C.inkSoft, textAlign: 'center', marginTop: 8 },
  err: { color: C.red, fontWeight: '800', fontSize: 12.5, textAlign: 'center', marginTop: 4 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
