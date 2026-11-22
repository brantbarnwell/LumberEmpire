import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { update, useGame } from '../game/store';
import {
  GameState, acceptOrder, counterOrder, moneyMult, plankSalesPerSec, rejectOrder, salesPerSec, storageCap, storageUsed, toolFx,
} from '../game/logic';
import {
  bestCommodityPrice, demandLabel, demandOf, marketEvent, marketPriceOf, shownChance, timeToSell,
} from '../game/market';
import {
  BUYERS_PER_WOOD_IN_STOCK, ITEMS, PLANK_CUT_PER_SEC, PLANK_WOOD, PRICE_MAX_FACTOR, PRICE_MIN_FACTOR, Product,
} from '../game/data';
import { duration, money, whole } from '../game/format';
import { haptic } from '../services/haptics';
import { showPopup } from './popup';
import { SellPanel } from './WorkshopScreen';
import { SellButton } from './SellButton';
import { Button, Card, ProgressBar } from './ui';
import { C } from './theme';

const NAMES: Record<Product, string> = { wood: 'Wood', planks: 'Planks', furniture: 'Furniture' };
const ICONS: Record<Product, string> = { wood: '🪵', planks: '🟫', furniture: '🪑' };

export function MarketScreen() {
  const s = useGame();
  const ev = marketEvent(s.dayKey);
  const [selling, setSelling] = useState<{ itemId: string; saleId?: number } | null>(null);
  const w = s.workshop;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Market</Text>
      {ev ? (
        <View style={[styles.event, ev.id === 'crash' && { backgroundColor: '#8a2b22' }]}>
          <Text style={styles.eventTitle}>📰 {ev.name}</Text>
          <Text style={styles.eventText}>{ev.text}</Text>
        </View>
      ) : (
        <Text style={styles.sub}>No big news today. Demand changes every day with the season and the news.</Text>
      )}

      <Card>
        <Text style={styles.h}>Demand today</Text>
        {(['wood', 'planks', 'furniture'] as Product[]).map((p) => <DemandRow key={p} p={p} day={s.dayKey} />)}
        <Text style={styles.small}>Yard: {whole(storageUsed(s))} / {whole(storageCap(s))} (a plank takes {PLANK_WOOD} spaces)</Text>
      </Card>

      <Commodity p="wood" />
      <Commodity p="planks" />

      {/* Furniture */}
      <Card>
        <View style={styles.headRow}>
          <Text style={styles.h}>🪑 Furniture</Text>
          <Text style={styles.small}>Price each item when you put it up</Text>
        </View>
        {w.level < 0 && <Text style={styles.sub}>Build a workshop (Workshop tab) to craft furniture.</Text>}
        {ITEMS.filter((it) => (w.inventory[it.id] ?? 0) > 0).map((it) => (
          <View key={it.id} style={styles.item}>
            <View style={styles.headRow}>
              <Text style={styles.name}>{it.icon} {it.name} x{w.inventory[it.id]}</Text>
              <Button small variant="gold" label="Sell" onPress={() => setSelling({ itemId: it.id })} />
            </View>
            {selling?.itemId === it.id && selling.saleId === undefined && <SellPanel itemId={it.id} onDone={() => setSelling(null)} />}
          </View>
        ))}
        {w.forSale.map((x) => {
          const it = ITEMS.find((i) => i.id === x.itemId)!;
          return (
            <View key={x.id} style={styles.item}>
              <View style={styles.headRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{it.icon} {it.name} · {money(x.price)}</Text>
                  <Text style={[styles.small, x.sellAt === null && { color: C.red }]}>
                    {x.sellAt === null ? 'No buyer at this price. Lower it to sell.' : 'In your shop, waiting for a buyer'}
                  </Text>
                </View>
                <Button small variant="ghost" label="Price" onPress={() => setSelling({ itemId: x.itemId, saleId: x.id })} />
              </View>
              {selling?.saleId === x.id && <SellPanel itemId={x.itemId} saleId={x.id} start={x.price} onDone={() => setSelling(null)} />}
            </View>
          );
        })}
        {w.level >= 0 && !w.forSale.length && !Object.values(w.inventory).some((n) => n > 0) && (
          <Text style={styles.sub}>Nothing to sell yet. Craft something in the Workshop.</Text>
        )}
      </Card>

      <Orders />
      <History />
    </ScrollView>
  );
}

function DemandRow({ p, day }: { p: Product; day: string }) {
  const d = demandOf(day, p);
  return (
    <View style={styles.demandRow}>
      <Text style={[styles.sub, { width: 86 }]}>{ICONS[p]} {NAMES[p]}</Text>
      <View style={{ flex: 1 }}><ProgressBar value={d / 2} color={d < 0.85 ? '#e5a33b' : d < 1.25 ? C.leafLight : C.money} height={8} /></View>
      <Text style={[styles.sub, { width: 70, textAlign: 'right', color: C.ink }]}>{demandLabel(d)}</Text>
    </View>
  );
}

function Commodity({ p }: { p: 'wood' | 'planks' }) {
  const s = useGame();
  const now = Date.now();
  const isWood = p === 'wood';
  const stock = isWood ? s.wood : s.planks;
  const price = isWood ? s.sellPrice : s.plankPrice;
  const on = isWood ? s.selling : s.plankSelling;
  const market = marketPriceOf(s.dayKey, p);
  const minP = Math.round(market * PRICE_MIN_FACTOR * 100) / 100;
  const maxP = Math.round(market * PRICE_MAX_FACTOR * 100) / 100;
  const [text, setText] = useState(price.toFixed(2));
  useEffect(() => setText(price.toFixed(2)), [price]);

  const setPrice = (v: number) => {
    const x = Math.round(Math.min(maxP, Math.max(minP, v)) * 100) / 100;
    update((st) => ((isWood ? st.sellPrice : st.plankPrice) === x ? null : isWood ? { ...st, sellPrice: x } : { ...st, plankPrice: x }));
  };
  const ratio = price / market;
  const chance = shownChance(s.dayKey, p, ratio);
  const fx = toolFx(s);
  const mult = moneyMult(s, now) * (1 + (isWood ? fx.woodSalePct : fx.plankSalePct));
  const forecastStock = Math.max(stock, 5000);
  const st: GameState = isWood ? { ...s, selling: true, yardSeller: true } : { ...s, plankSelling: true, yardSeller: true };
  const perSec = isWood ? salesPerSec(st, price, forecastStock) : plankSalesPerSec(st, price, forecastStock);
  const tts = timeToSell(s.dayKey, p, price, stock, BUYERS_PER_WOOD_IN_STOCK, isWood ? s.buyers.wood : s.buyers.planks);
  const made = isWood ? s.buyers.wood / 1.1 : s.buyers.planks / 1.1;
  const growing = on && s.yardSeller && stock > 50 && made > 2.01 && perSec < made * 0.98;
  const best = bestCommodityPrice(s.dayKey, p);
  const today = s.market.days.find((d) => d.day === s.dayKey);
  const pct = Math.round(chance * 100);

  return (
    <Card style={{ gap: 6 }}>
      <View style={styles.headRow}>
        <Text style={styles.h}>{ICONS[p]} {NAMES[p]} · {whole(stock)} in stock</Text>
        {s.yardSeller ? (
          <Switch value={on} trackColor={{ true: C.leafLight, false: '#bbb' }}
            onValueChange={(v) => { update((x) => (isWood ? { ...x, selling: v } : { ...x, plankSelling: v })); }} />
        ) : <Text style={styles.tiny}>tap SELL</Text>}
      </View>
      {!isWood && (
        <View style={styles.cutRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Cut planks</Text>
            <Text style={styles.small}>{PLANK_WOOD} wood → 1 plank, {PLANK_CUT_PER_SEC} planks a second. Planks sell for more than wood.{fx.plankSalePct > 0 ? ' Log Splitter: 2x plank Money!' : ''}{s.sawmill.level > 0 ? ` Your Sawmill adds more (see Buildings).` : ''}</Text>
          </View>
          <Switch value={s.cutting} trackColor={{ true: C.gold, false: '#bbb' }} onValueChange={(v) => { update((x) => ({ ...x, cutting: v })); }} />
        </View>
      )}
      <View style={styles.headRow}>
        <Text style={styles.sub}>Your price</Text>
        <View style={styles.input}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            onEndEditing={() => { const v = parseFloat(text); if (isFinite(v)) setPrice(v); else setText(price.toFixed(2)); }}
            onBlur={() => { const v = parseFloat(text); if (isFinite(v)) setPrice(v); }}
            keyboardType="decimal-pad"
            returnKeyType="done"
            style={styles.inputText}
            maxLength={6}
            accessibilityLabel={`${NAMES[p]} price`}
          />
        </View>
        <Text style={styles.sub}>each · market {money(market)}</Text>
      </View>
      <Slider style={{ width: '100%', height: 34 }} minimumValue={minP} maximumValue={maxP} step={0.01} value={price}
        onValueChange={setPrice} minimumTrackTintColor={C.leafLight} maximumTrackTintColor="#d6c7a4" thumbTintColor={C.bark} />
      <View style={styles.headRow}>
        <Text style={styles.tiny}>Cheap: sells fast</Text>
        <Text style={styles.tiny}>Expensive: sells slow</Text>
      </View>
      <View style={styles.stats}>
        <Stat label="sell chance" value={`${pct}%`} color={pct > 60 ? C.money : pct > 25 ? C.goldDark : C.red} />
        <Stat label={stock >= 1 ? (s.yardSeller ? 'to sell your stock' : 'auto-sell time') : 'sells per min'} value={stock >= 1 ? (isFinite(tts) && tts < 7 * 86400 ? duration(tts * 1000) : 'Maybe never') : whole(perSec * 60)} />
        <Stat label="est. profit / hour" value={money(perSec * 3600 * price * mult)} color={C.money} />
      </View>
      {isWood && s.manager.hired && (
        <Text style={styles.small}>👔 Manager {s.manager.on ? `is on: sells extra wood and planks at your prices when the yard is 80% full (sold ${whole(s.manager.soldToday)} wood today)` : 'is off'}</Text>
      )}
      <SellButton p={p} />
      {growing && <Text style={styles.warnText}>⚠️ At this price you make more than buyers take. Your pile will grow until the yard is full. Lower the price to sell it all.</Text>}
      <Text style={styles.small}>
        Sold today: {whole(today?.[p] ?? 0)}. Best profit around {money(best)} each.{!s.yardSeller ? ' Hire a Yard Seller in Helpers to sell automatically.' : !on ? ' Auto-selling is paused.' : ''}

      </Text>
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statNum, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.tiny}>{label}</Text>
    </View>
  );
}

function Orders() {
  const s = useGame();
  const open = s.market.orders;
  if (!open.length) return null;
  return (
    <Card>
      <Text style={styles.h}>📦 Bulk orders</Text>
      <Text style={styles.sub}>Buyers want a big batch at a fixed price, today only. Accept, say no, or ask for 10% more (they may walk).</Text>
      {open.map((o) => {
        const have = o.product === 'wood' ? s.wood : s.planks;
        const fair = o.price / marketPriceOf(s.dayKey, o.product);
        return (
          <View key={o.id} style={styles.order}>
            <Text style={styles.name}>{o.buyer}</Text>
            <Text style={styles.sub}>
              Wants {whole(o.amount)} {o.product} at {money(o.price)} each = {money(o.amount * o.price)}
              {' '}({fair >= 1.1 ? 'great price' : fair >= 0.97 ? 'fair price' : 'below market'})
            </Text>
            {o.status === 'done' && <Text style={styles.done}>Delivered ✓</Text>}
            {o.status === 'gone' && <Text style={[styles.small, { color: C.red }]}>Order is gone.</Text>}
            {o.status === 'open' && (
              <View style={[styles.headRow, { marginTop: 6, gap: 6 }]}>
                <Button small style={{ flex: 1 }} label="Accept" disabled={have < o.amount}
                  onPress={() => update((x) => acceptOrder(x, o.id, Date.now())) && haptic.success()} />
                {!o.countered && (
                  <Button small style={{ flex: 1 }} variant="gold" label="Ask +10%" onPress={() => {
                    const r = counterOrder(s, o.id);
                    if (!r) return;
                    update((x) => counterOrder(x, o.id)?.state ?? null);
                    showPopup({ icon: r.agreed ? '🤝' : '🚶', title: r.agreed ? `${o.buyer} agreed!` : `${o.buyer} walked away`, body: r.agreed ? 'New price is 10% higher.' : 'Maybe next time take the first offer.' });
                  }} />
                )}
                <Button small style={{ flex: 1 }} variant="ghost" label="No" onPress={() => update((x) => rejectOrder(x, o.id))} />
              </View>
            )}
            {o.status === 'open' && have < o.amount && <Text style={styles.small}>You have {whole(have)}. Keep chopping{o.product === 'planks' ? ' and cutting' : ''}.</Text>}
          </View>
        );
      })}
    </Card>
  );
}

function History() {
  const s = useGame();
  const days = s.market.days;
  const max = Math.max(1, ...days.map((d) => d.money));
  return (
    <Card>
      <Text style={styles.h}>📈 Last 7 days</Text>
      {days.length === 0 ? <Text style={styles.sub}>Sell something to start your sales graph.</Text> : (
        <View style={styles.graph}>
          {days.map((d) => (
            <View key={d.day} style={styles.barCol}>
              <Text style={styles.barMoney} numberOfLines={1} adjustsFontSizeToFit>{money(d.money)}</Text>
              <View style={styles.barTrack}><View style={[styles.bar, { height: `${Math.max(3, (d.money / max) * 100)}%` }]} /></View>
              <Text style={styles.tiny}>{d.day.split('-').slice(1).join('/')}</Text>
              <Text style={styles.tiny} numberOfLines={1}>{whole(d.wood)}🪵</Text>
              <Text style={styles.tiny} numberOfLines={1}>{d.wood ? money(d.woodMoney / d.wood) : '-'}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={[styles.h, { marginTop: 10 }]}>Sales history</Text>
      {s.market.log.length === 0 && <Text style={styles.sub}>Bulk orders and furniture sales show up here.</Text>}
      {s.market.log.slice(0, 12).map((l, i) => (
        <Text key={i} style={styles.hist}>
          {l.what}{l.units > 1 ? ` x${whole(l.units)}` : ''} for {money(l.price)}{l.minutes !== null ? `, took ${duration(l.minutes * 60000)}` : ''}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  content: { padding: 14, gap: 10, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: C.forest },
  h: { fontSize: 16, fontWeight: '900', color: C.ink },
  name: { fontSize: 14, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
  small: { fontSize: 11, fontWeight: '700', color: C.inkSoft },
  tiny: { fontSize: 10, fontWeight: '700', color: C.inkSoft },
  event: { backgroundColor: '#2e6b3a', borderRadius: 14, padding: 12 },
  eventTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  eventText: { color: '#eafbe9', fontWeight: '700', fontSize: 12.5, marginTop: 2 },
  demandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cutRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,197,66,0.15)', borderRadius: 10, padding: 8 },
  input: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: C.cardEdge, paddingHorizontal: 8, height: 36 },
  dollar: { fontWeight: '900', fontSize: 16, color: C.money },
  inputText: { fontWeight: '900', fontSize: 16, color: C.money, width: 64, paddingVertical: 0 },
  stats: { flexDirection: 'row', gap: 6 },
  stat: { flex: 1, backgroundColor: 'rgba(107,68,35,0.08)', borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
  statNum: { fontSize: 15, fontWeight: '900', color: C.ink },
  item: { borderTopWidth: 1, borderTopColor: C.cardEdge, paddingTop: 8, marginTop: 8 },
  order: { borderTopWidth: 1, borderTopColor: C.cardEdge, paddingTop: 8, marginTop: 8 },
  done: { color: C.leaf, fontWeight: '900', marginTop: 4 },
  graph: { flexDirection: 'row', gap: 4, marginTop: 8, height: 150, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barMoney: { fontSize: 9.5, fontWeight: '800', color: C.money },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: C.leafLight, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  warnText: { fontSize: 12, fontWeight: '800', color: C.red },
  hist: { fontSize: 12, fontWeight: '700', color: C.ink, paddingVertical: 2 },
});
