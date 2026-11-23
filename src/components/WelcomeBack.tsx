// Update 3 (Playbook 2): Welcome back. Time away, a lump sum that ticks up, and what it can buy right now.
// Collect is always free. The video only adds a 2x bonus on top, it is never needed to collect.
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getState, update, useGame } from '../game/store';
import { addMoney, collectOffline, collectOfflineBonus, offlineCapHours, sellAll, unitPrice } from '../game/logic';
import { adFree, buyIdeas } from '../game/meta';
import { AD_OFFLINE_MULT } from '../game/data';
import { runAdReward } from '../game/adflow';
import { saveGame } from '../game/save';
import { duration, money, whole } from '../game/format';
import { adReady, showRewardedVideo } from '../services/ads';
import { feel } from '../services/feel';
import { Icon } from './art/Icons';
import { Button } from './ui';
import { C, shadow } from './theme';

/** A number that counts up from 0 when it first shows. */
function useTicker(target: number, ms = 1300) {
  const [v, setV] = useState(0);
  const start = useRef(Date.now());
  useEffect(() => {
    start.current = Date.now();
    const t = setInterval(() => {
      const k = Math.min(1, (Date.now() - start.current) / ms);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k >= 1) clearInterval(t);
    }, 33);
    return () => clearInterval(t);
  }, [target]);
  return v;
}

export function WelcomeBack() {
  const s = useGame();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const r = s.pendingOffline;
  const now = Date.now();
  const managed = r?.collectedBy === 'manager';
  // wood your crew chopped while you were away and that is still in the yard: Collect sells it for you
  const waiting = r ? Math.floor(Math.min(s.wood, Math.max(0, r.produced - r.sold))) : 0;
  const woodValue = waiting * (r ? unitPrice(s, 'wood', now) : 0);
  const total = r ? (managed ? r.earned : r.earned + woodValue) : 0;
  const shown = useTicker(total);
  if (!r) return null;
  const free = adFree(s);
  const ideas = buyIdeas(s, s.money + total, now, 3);

  const collect = (mult: number) => {
    const ok = update((st) => {
      const p = st.pendingOffline;
      if (!p) return null;
      let x = managed ? collectOfflineBonus(st, p) : collectOffline(st, p, mult);
      if (!managed && waiting > 0) {
        const sold = sellAll(x, 'wood', Date.now(), waiting);
        x = addMoney(sold.state, sold.earned * (mult - 1));
      }
      return { ...x, pendingOffline: null };
    });
    if (ok) feel.reward();
    return !!ok;
  };
  // Playbook 3: once per return. Paid when the video finishes; if it fails, plain Collect still works.
  const watch = async () => {
    setErr(null);
    setBusy(true);
    const e = await runAdReward({
      adFree: adFree(getState()),
      show: showRewardedVideo,
      canGrant: () => !!getState().pendingOffline,
      grant: () => {
        const ok = collect(AD_OFFLINE_MULT);
        if (ok) saveGame(getState());
        return ok;
      },
    });
    setBusy(false);
    if (e) setErr(e);
  };
  const cap = offlineCapHours(s);
  const showAd = !managed && (free || adReady()); // never offer a video that can't play

  return (
    <View style={styles.back}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back!</Text>
        <Text style={styles.away}>Away {duration(r.away * 1000)}{r.away >= cap * 3600 - 60 ? ` (${cap} hour max)` : ''}</Text>
        <View style={styles.lump}>
          <Icon name="money" size={34} />
          <Text style={styles.amount}>{money(shown)}</Text>
        </View>
        <View style={styles.facts}>
          <View style={styles.fact}><Icon name="wood" size={18} /><Text style={styles.factText}>{whole(r.produced)} wood chopped</Text></View>
          {managed && <View style={styles.fact}><Icon name="helpers" size={18} /><Text style={styles.factText}>Manager already collected it</Text></View>}
          {!managed && waiting > 0 && <View style={styles.fact}><Icon name="seller" size={18} /><Text style={styles.factText}>Collect sells {whole(waiting)} wood for you</Text></View>}
        </View>
        {ideas.length > 0 && (
          <View style={styles.ideas}>
            <Text style={styles.ideasTitle}>This can buy right now:</Text>
            {ideas.map((i) => (
              <View key={i.label} style={styles.idea}>
                <Text style={styles.ideaName} numberOfLines={1}>{i.label}</Text>
                <Text style={styles.ideaCost}>{money(i.cost)}</Text>
              </View>
            ))}
          </View>
        )}
        {err && <Text style={styles.err}>{err}</Text>}
        <View style={styles.buttons}>
          <Button style={{ flex: 1 }} label={managed ? 'OK' : 'Collect'} sub={managed ? undefined : money(total)} disabled={busy} onPress={() => (managed ? update((st) => ({ ...st, pendingOffline: null })) : collect(1))} />
          {showAd && (
            <Button style={{ flex: 1.3 }} variant="gold" loading={busy} label={free ? `${AD_OFFLINE_MULT}x offline earnings` : `▶ Watch ad for ${AD_OFFLINE_MULT}x offline earnings`} sub={money(total * AD_OFFLINE_MULT)} onPress={watch} />
          )}
        </View>
        <Text style={styles.small}>While you are away, your crew works at half speed for up to {cap} hours. Collect is always free.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,20,12,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 60 },
  card: { backgroundColor: C.card, borderRadius: 22, padding: 18, alignItems: 'center', width: '100%', maxWidth: 400, borderWidth: 3, borderColor: '#3a2210', ...shadow },
  title: { fontSize: 24, fontWeight: '900', color: C.ink },
  away: { fontSize: 14, fontWeight: '800', color: C.inkSoft, marginTop: 2 },
  lump: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  amount: { fontSize: 38, fontWeight: '900', color: C.money, fontVariant: ['tabular-nums'] },
  facts: { gap: 4, marginTop: 6, alignSelf: 'stretch' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  factText: { fontSize: 13, fontWeight: '800', color: C.ink },
  ideas: { alignSelf: 'stretch', backgroundColor: 'rgba(107,68,35,0.08)', borderRadius: 12, padding: 10, marginTop: 10, gap: 4 },
  ideasTitle: { fontSize: 12.5, fontWeight: '900', color: C.bark },
  idea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ideaName: { fontSize: 14, fontWeight: '900', color: C.ink, flex: 1 },
  ideaCost: { fontSize: 14, fontWeight: '900', color: C.money },
  buttons: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 12 },
  err: { color: C.red, fontWeight: '800', fontSize: 12.5, textAlign: 'center', marginTop: 6 },
  small: { fontSize: 11, color: C.inkSoft, fontWeight: '600', textAlign: 'center', marginTop: 10 },
});
