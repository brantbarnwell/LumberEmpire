// Update 2: no price slider. Everything sells at the market price with one tap.
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { getState, update, useGame } from '../game/store';
import { mixOf, logPrice, ownedWoodTypes, acceptOrder, counterOrder, itemPrice, rejectOrder, rushInfo, sellItems, unitPrice } from '../game/logic';
import { itemPriceOf, marketEvent, marketPriceOf, priceTrend, weatherOf } from '../game/market';
import { WOOD, WOODS, ITEMS, PLANK_CUT_PER_SEC, PLANK_WOOD } from '../game/data';
import { duration, money, whole } from '../game/format';
import { haptic } from '../services/haptics';
import { feel } from '../services/feel';
import { showPopup } from './popup';
import { SellButton, unitText } from './SellButton';
import { Icon, IconName, LogIcon } from './art/Icons';
import { FurnitureArt } from './art/Furniture';
import { Button, Card } from './ui';
import { C } from './theme';

function Trend({ t }: { t: number }) {
  return <Icon name={t > 0 ? 'up' : t < 0 ? 'down' : 'flat'} size={16} />;
}

export function MarketScreen() {
  const s = useGame();
  const now = Date.now();
  const ev = marketEvent(s.dayKey);
  const wx = weatherOf(s.dayKey);
  const w = s.workshop;
  const items = ITEMS.filter((it) => (w.inventory[it.id] ?? 0) > 0);
  const mix = mixOf(s);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Market</Text>

      <Card style={{ gap: 8 }}>
        <View style={styles.headRow}>
          <Text style={styles.h}>Prices today</Text>
          <View style={styles.today}>
            <Icon name={wx.id as IconName} size={22} />
            {ev && <Text style={styles.news} numberOfLines={1}>{ev.name}</Text>}
          </View>
        </View>
        {ownedWoodTypes(s).map((t) => (
          <View key={t} style={styles.priceRow}>
            <LogIcon type={t} size={26} />
            <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{WOOD[t].name}</Text>
            <Text style={styles.price}>{unitText(logPrice(s, t, now))} per log</Text>
            <Trend t={priceTrend(s.dayKey, 'wood')} />
          </View>
        ))}
        <PriceRow icon="planks" name="Planks" text={`${unitText(unitPrice(s, 'planks', now))} per plank`} t={priceTrend(s.dayKey, 'planks')} />
        <PriceRow icon="buildings" name="Furniture" text={`${Math.round(itemPriceOf(s.dayKey, 100))}% of value`} t={priceTrend(s.dayKey, 'furniture')} />
      </Card>

      <Card style={{ gap: 8 }}>
        <View style={styles.headRow}>
          <Text style={styles.h}>Wood · {whole(s.wood)}</Text>
          {s.yardSeller && (
            <View style={styles.auto}>
              <Icon name="seller" size={20} />
              <Switch value={s.selling} trackColor={{ true: C.leafLight, false: '#bbb' }} onValueChange={(v) => { update((x) => ({ ...x, selling: v })); }} accessibilityLabel="Yard Seller sells wood" />
            </View>
          )}
        </View>
        {/* update 4: what is in your yard, by tree type */}
        {WOODS.filter((w) => (mix[w.id] ?? 0) >= 1).map((w) => (
          <View key={w.id} style={styles.typeRow}>
            <LogIcon type={w.id} size={22} />
            <Text style={[styles.name, { flex: 1 }]}>{WOOD[w.id].name}</Text>
            <Text style={styles.sub}>{whole(mix[w.id] ?? 0)} × {unitText(logPrice(s, w.id, now))}</Text>
          </View>
        ))}
        <SellButton p="wood" compact />
      </Card>

      <Card style={{ gap: 8 }}>
        <View style={styles.headRow}>
          <Text style={styles.h}>Planks · {whole(s.planks)}</Text>
          {s.yardSeller && (
            <View style={styles.auto}>
              <Icon name="seller" size={20} />
              <Switch value={s.plankSelling} trackColor={{ true: C.leafLight, false: '#bbb' }} onValueChange={(v) => { update((x) => ({ ...x, plankSelling: v })); }} accessibilityLabel="Yard Seller sells planks" />
            </View>
          )}
        </View>
        <View style={styles.cutRow}>
          <Icon name="planks" size={24} />
          <Text style={[styles.name, { flex: 1 }]}>Cut planks ({PLANK_WOOD} wood → 1, {PLANK_CUT_PER_SEC}/s)</Text>
          <Switch value={s.cutting} trackColor={{ true: C.gold, false: '#bbb' }} onValueChange={(v) => { update((x) => ({ ...x, cutting: v })); }} accessibilityLabel="Cut planks" />
        </View>
        <SellButton p="planks" compact />
      </Card>

      <Card style={{ gap: 6 }}>
        <Text style={styles.h}>Furniture</Text>
        {w.level < 0 && <Text style={styles.sub}>Build a workshop in Buildings.</Text>}
        {w.level >= 0 && !items.length && <Text style={styles.sub}>Craft something in Buildings.</Text>}
        {items.map((it) => {
          const n = w.inventory[it.id];
          const each = itemPrice(s, it.id, now);
          return (
            <View key={it.id} style={styles.item}>
              <View style={styles.itemIcon}><FurnitureArt id={it.id} size={34} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{it.name} ×{n}</Text>
                <Text style={styles.sub}>{money(each)} each</Text>
              </View>
              <Button small variant="gold" label={`Sell ${n} for ${money(each * n)}`} onPress={() => {
                const r = sellItems(getState(), it.id, Date.now());
                if (r.sold) { update(() => r.state); feel.sell(); }
              }} />
            </View>
          );
        })}
      </Card>

      <Orders rush />
      <Orders />
      <History />
    </ScrollView>
  );
}

function PriceRow({ icon, name, text, t }: { icon: IconName; name: string; text: string; t: number }) {
  return (
    <View style={styles.priceRow}>
      <Icon name={icon} size={26} />
      <Text style={[styles.name, { width: 80 }]}>{name}</Text>
      <Text style={[styles.price, { flex: 1 }]}>{text}</Text>
      <Trend t={t} />
    </View>
  );
}

function Orders({ rush }: { rush?: boolean }) {
  const s = useGame();
  const open = s.market.orders.filter((o) => o.id.startsWith('rush-') === !!rush);
  if (!open.length) return null;
  const r = rushInfo(s, Date.now());
  return (
    <Card style={rush ? { borderColor: '#d9661f', borderWidth: 2.5 } : undefined}>
      <Text style={styles.h}>{rush ? `Timber Rush order board · ${duration(r.endsAt - Date.now())} left` : 'Bulk orders'}</Text>
      <Text style={styles.sub}>{rush ? 'Weekend only: better prices, a different mix every week.' : 'Buyers want a big batch at a fixed price, today only. Accept, say no, or ask for 10% more (they may walk).'}</Text>
      {open.map((o) => {
        const have = o.product === 'wood' ? s.wood : s.planks;
        const fair = o.price / marketPriceOf(s.dayKey, o.product);
        return (
          <View key={o.id} style={styles.order}>
            <Text style={styles.name}>{o.buyer.replace('Timber Rush: ', '')}</Text>
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
      <Text style={styles.h}>Last 7 days</Text>
      {days.length === 0 ? <Text style={styles.sub}>Sell something to start your sales graph.</Text> : (
        <View style={styles.graph}>
          {days.map((d) => (
            <View key={d.day} style={styles.barCol}>
              <Text style={styles.barMoney} numberOfLines={1} adjustsFontSizeToFit>{money(d.money)}</Text>
              <View style={styles.barTrack}><View style={[styles.bar, { height: `${Math.max(3, (d.money / max) * 100)}%` }]} /></View>
              <Text style={styles.tiny}>{d.day.split('-').slice(1).join('/')}</Text>
              <Text style={styles.tiny} numberOfLines={1}>{whole(d.wood)} wood</Text>
              <Text style={styles.tiny} numberOfLines={1}>{d.wood ? money(d.woodMoney / d.wood) : '-'}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={[styles.h, { marginTop: 10 }]}>Sales history</Text>
      {s.market.log.length === 0 && <Text style={styles.sub}>Bulk orders and furniture sales show up here.</Text>}
      {s.market.log.slice(0, 12).map((l, i) => (
        <Text key={i} style={styles.hist}>
          {l.what}{l.units > 1 && !l.what.includes('x ') ? ` x${whole(l.units)}` : ''} for {money(l.price)}{l.minutes ? `, took ${duration(l.minutes * 60000)}` : ''}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  today: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  news: { fontSize: 12, fontWeight: '900', color: C.bark, flexShrink: 1 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  price: { fontSize: 16, fontWeight: '900', color: C.ink },
  auto: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemIcon: { width: 38, alignItems: 'center' },
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
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: C.cardEdge, paddingTop: 8 },
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
