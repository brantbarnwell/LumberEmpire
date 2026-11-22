import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { update, useGame } from '../game/store';
import { canClaimVip, claimVip, grantProduct } from '../game/logic';
import { PRODUCTS, ShopProduct, VIP_DAILY_GOLD, productById, GOLD_SHOP, GOLD_REPAIR_ALL, AD_GOLD_PER_VIDEO, AD_GOLD_VIDEOS_PER_DAY } from '../game/data';
import { adFree, buyGoldItem, goldRepair, goldVideosLeft, rewardGoldVideo } from '../game/meta';
import { runReward } from './reward';
import { whole } from '../game/format';
import { buy, restore, useStore } from '../services/purchases';
import { haptic } from '../services/haptics';
import { Button, Card, GoldCoin } from './ui';
import { C } from './theme';

type Msg = { kind: 'ok' | 'err' | 'info'; text: string } | null;

export function ShopScreen() {
  const s = useGame();
  const store = useStore();
  const [busy, setBusy] = useState<string | null>(null); // product id, or 'restore'
  const [msg, setMsg] = useState<Msg>(null);
  const now = Date.now();

  const onBuy = async (p: ShopProduct) => {
    setMsg(null);
    setBusy(p.id);
    const r = await buy(p.id);
    setBusy(null);
    if (!r.ok) {
      setMsg({ kind: r.cancelled ? 'info' : 'err', text: r.message });
      if (!r.cancelled) haptic.error();
      return;
    }
    if (p.kind === 'vip') {
      update((st) => ({ ...st, vipActive: true }));
      setMsg({ kind: 'ok', text: 'Welcome to VIP Tycoon! 2x earnings are on. Claim your 100 daily Gold below.' });
    } else {
      update((st) => grantProduct(st, r.productId, r.transactionId, Date.now()));
      setMsg({ kind: 'ok', text: `Thanks! ${p.title} added to your account.` });
    }
    haptic.success();
  };

  const onRestore = async () => {
    setMsg(null);
    setBusy('restore');
    const r = await restore();
    setBusy(null);
    if (!r.ok) {
      setMsg({ kind: 'err', text: r.message });
      haptic.error();
      return;
    }
    const restored: string[] = [];
    for (const t of r.oneTime) {
      if (update((st) => grantProduct(st, t.productId, t.transactionId, Date.now()))) {
        restored.push(productById(t.productId)?.title ?? t.productId);
      }
    }
    update((st) => (st.vipActive === r.vip ? null : { ...st, vipActive: r.vip }));
    if (r.vip) restored.push('VIP Tycoon');
    setMsg(
      restored.length
        ? { kind: 'ok', text: `Restored: ${restored.join(', ')}.` }
        : { kind: 'info', text: 'Everything is already restored. Gold packs are used when bought, so they do not restore.' },
    );
  };

  const price = (p: ShopProduct) => store.prices[p.id] ?? p.usd;
  const vip = PRODUCTS.filter((p) => p.kind === 'vip');
  const packs = PRODUCTS.filter((p) => p.kind === 'pack');
  const gold = PRODUCTS.filter((p) => p.kind === 'gold');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.cream }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
        <View style={styles.balance}>
          <GoldCoin size={20} />
          <Text style={styles.balanceText}>{whole(s.gold)}</Text>
        </View>
      </View>
      <Text style={styles.note}>
        Real-money purchases go through Apple. Gold is for speed-ups and cosmetics. Land and helpers are always bought with in-game Money.
      </Text>

      {store.status !== 'ready' && store.status !== 'loading' && store.message && msg?.text !== store.message && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>ℹ️ {store.message}</Text>
        </View>
      )}
      {store.status === 'loading' && <Text style={styles.note}>Loading App Store prices…</Text>}
      {msg && (
        <View style={[styles.msg, msg.kind === 'ok' ? styles.ok : msg.kind === 'err' ? styles.err : styles.info]}>
          <Text style={styles.msgText}>{msg.text}</Text>
        </View>
      )}

      {/* VIP */}
      <LinearGradient colors={['#3b1d63', '#6a35a8']} style={styles.vip}>
        <Text style={styles.vipTitle}>👑 VIP Tycoon</Text>
        <Text style={styles.vipPerks}>2x earnings · {VIP_DAILY_GOLD} free Gold every day · Exclusive VIP cosmetics · No ads (video rewards are instant)</Text>
        {s.vipActive ? (
          <View style={{ gap: 8, marginTop: 8 }}>
            <Text style={styles.vipActive}>You are VIP! Thanks for the support.</Text>
            <Button
              variant="gold"
              label={canClaimVip(s, now) ? `Claim ${VIP_DAILY_GOLD} Gold` : 'Daily Gold claimed. Come back tomorrow'}
              disabled={!canClaimVip(s, now)}
              onPress={() => update((st) => claimVip(st, Date.now())) && haptic.success()}
            />
          </View>
        ) : (
          <View style={styles.vipBtns}>
            {vip.map((p) => (
              <View key={p.id} style={{ flex: 1 }}>
                {p.badge && <Text style={styles.vipBadge}>{p.badge}</Text>}
                <Button
                  variant="gold"
                  label={p.id.endsWith('yearly') ? 'Yearly' : 'Monthly'}
                  sub={price(p)}
                  loading={busy === p.id}
                  disabled={!!busy}
                  onPress={() => onBuy(p)}
                />
              </View>
            ))}
          </View>
        )}
        {!s.vipActive && <Text style={styles.vipFine}>Renews automatically. Cancel any time in your iPhone Settings › Apple ID › Subscriptions.</Text>}
      </LinearGradient>

      <Text style={styles.section}>Spend Gold</Text>
      <Text style={styles.note}>Gold buys time, never power you can't earn by playing.</Text>
      <Card style={styles.packCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.packTitle}>Free Gold</Text>
          <Text style={styles.perk}>+{AD_GOLD_PER_VIDEO} Gold {adFree(s) ? '(instant for you)' : 'for an optional video'} · {goldVideosLeft(s, now)}/{AD_GOLD_VIDEOS_PER_DAY} left today</Text>
        </View>
        <Button
          small
          label={adFree(s) ? 'Claim' : '▶ Watch'}
          loading={busy === 'adgold'}
          disabled={!!busy || goldVideosLeft(s, now) === 0}
          onPress={async () => {
            setMsg(null);
            setBusy('adgold');
            const err = await runReward((st) => rewardGoldVideo(st, Date.now()));
            setBusy(null);
            setMsg(err ? { kind: 'info', text: err } : { kind: 'ok', text: `+${AD_GOLD_PER_VIDEO} Gold!` });
          }}
        />
      </Card>
      {GOLD_SHOP.map((g) => (
        <Card key={g.id} style={styles.packCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.packTitle}>{g.title}</Text>
            <Text style={styles.perk}>Adds to your other boosts.</Text>
          </View>
          <Button small variant="gold" label={`${g.gold} Gold`} disabled={s.gold < g.gold} onPress={() => {
            if (update((st) => buyGoldItem(st, g.id, Date.now()))) { haptic.success(); setMsg({ kind: 'ok', text: `${g.title} started!` }); }
          }} />
        </Card>
      ))}
      <Card style={styles.packCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.packTitle}>Instant repair: axe + all tools</Text>
          <Text style={styles.perk}>Everything back to 100% with no Money cost. You can always repair with Money too.</Text>
        </View>
        <Button small variant="gold" label={`${GOLD_REPAIR_ALL} Gold`} disabled={s.gold < GOLD_REPAIR_ALL || goldRepair(s) === null}
          onPress={() => { if (update((st) => goldRepair(st))) { haptic.success(); setMsg({ kind: 'ok', text: 'Axe repaired!' }); } }} />
      </Card>

      <Text style={styles.section}>Special Packs</Text>
      {packs.map((p) => {
        const owned = s.owned.products.includes(p.id);
        return (
          <Card key={p.id} style={styles.packCard}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.packTitle}>{p.title}</Text>
                {p.badge && <Text style={styles.badge}>{p.badge}</Text>}
              </View>
              {p.perks.map((k) => (
                <Text key={k} style={styles.perk}>• {k}</Text>
              ))}
              {p.grant.buildings && (
                <Text style={styles.small}>The Sawmill is saved to your account and added when Buildings open.</Text>
              )}
            </View>
            {owned ? (
              <Text style={styles.owned}>Owned ✓</Text>
            ) : (
              <Button
                label={price(p)}
                loading={busy === p.id}
                disabled={!!busy}
                onPress={() => onBuy(p)}
                style={{ minWidth: 92 }}
              />
            )}
          </Card>
        );
      })}

      <Text style={styles.section}>Gold</Text>
      <View style={styles.goldGrid}>
        {gold.map((p) => (
          <Card key={p.id} style={styles.goldCard}>
            {p.badge && <Text style={[styles.badge, { alignSelf: 'center' }]}>{p.badge}</Text>}
            <View style={styles.coins}>
              <GoldCoin size={30} />
              {(p.grant.gold ?? 0) >= 1200 && <View style={{ marginLeft: -12 }}><GoldCoin size={30} /></View>}
              {(p.grant.gold ?? 0) >= 7000 && <View style={{ marginLeft: -12 }}><GoldCoin size={30} /></View>}
            </View>
            <Text style={styles.goldAmt}>{p.title}</Text>
            <Button
              small
              label={price(p)}
              loading={busy === p.id}
              disabled={!!busy}
              onPress={() => onBuy(p)}
            />
          </Card>
        ))}
      </View>

      <Button
        variant="ghost"
        label="Restore Purchases"
        loading={busy === 'restore'}
        disabled={!!busy}
        onPress={onRestore}
        style={{ marginTop: 8 }}
      />
      <Text style={styles.small}>Payment is charged to your Apple ID. Purchases are final unless Apple approves a refund.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '900', color: C.forest },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.forest, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  balanceText: { color: C.gold, fontWeight: '900', fontSize: 18 },
  note: { fontSize: 12, color: C.inkSoft, fontWeight: '600' },
  banner: { backgroundColor: '#fff2c9', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#ecd27a' },
  bannerText: { fontSize: 12.5, color: '#6a4b00', fontWeight: '700' },
  msg: { borderRadius: 12, padding: 10 },
  ok: { backgroundColor: '#d8f5d8' },
  err: { backgroundColor: '#fde0dc' },
  info: { backgroundColor: '#e8e3d6' },
  msgText: { fontWeight: '800', color: C.ink, fontSize: 13 },
  vip: { borderRadius: 18, padding: 14 },
  vipTitle: { color: '#fff', fontSize: 21, fontWeight: '900' },
  vipPerks: { color: '#e9dcff', fontSize: 13, fontWeight: '700', marginTop: 4 },
  vipBtns: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'flex-end' },
  vipBadge: { color: C.gold, fontWeight: '900', fontSize: 11, textAlign: 'center', marginBottom: 3 },
  vipActive: { color: '#fff', fontWeight: '800' },
  vipFine: { color: '#cdb8f0', fontSize: 10.5, marginTop: 8, fontWeight: '600' },
  section: { fontSize: 18, fontWeight: '900', color: C.forest, marginTop: 6 },
  packCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  packTitle: { fontSize: 16, fontWeight: '900', color: C.ink },
  badge: { backgroundColor: C.gold, color: C.ink, fontSize: 10, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  perk: { fontSize: 13, color: C.inkSoft, fontWeight: '700', marginTop: 2 },
  owned: { color: C.leaf, fontWeight: '900', fontSize: 15 },
  small: { fontSize: 10.5, color: C.inkSoft, fontWeight: '600', marginTop: 4, textAlign: 'left' },
  goldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goldCard: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  coins: { flexDirection: 'row', height: 34, alignItems: 'center' },
  goldAmt: { fontSize: 14, fontWeight: '900', color: C.ink },
});
