import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { update, useGame } from '../game/store';
import {
  bestItemPrice, cancelSale, changeSalePrice, craftTimeMs, finishBuildWithGold, finishCraftWithGold, goldToSkip,
  listForSale, sellOdds, startBuild, startCraft, workshopUnlocked, upgradeSawmill, setSawmillOn, sawmillNextCost,
} from '../game/logic';
import { Switch } from 'react-native';
import { ITEMS, WORKSHOPS, SAWMILL_LEVELS, PLANK_CUT_PER_SEC, PLANK_WOOD } from '../game/data';
import { duration, money, whole } from '../game/format';
import { haptic } from '../services/haptics';
import { Button, Card, GoldCoin, ProgressBar } from './ui';
import { C } from './theme';

function useNow() {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setN(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return n;
}

export function WorkshopScreen() {
  const s = useGame();
  const now = useNow();
  const w = s.workshop;
  const [selling, setSelling] = useState<{ itemId: string; saleId?: number } | null>(null);
  const cur = w.level >= 0 ? WORKSHOPS[w.level] : null;
  const next = WORKSHOPS[w.level + 1];
  const unlocked = workshopUnlocked(s);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Buildings</Text>
      <SawmillCard />
      <Text style={styles.section}>Workshop</Text>

      {/* building */}
      <Card style={[!unlocked && w.level < 0 && { opacity: 0.55 }] as any}>
        <View style={styles.row}>
          <Text style={styles.bigIcon}>{cur ? cur.icon : WORKSHOPS[0].icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{cur ? cur.name : 'No workshop yet'}</Text>
            <Text style={styles.sub}>
              {cur ? `${cur.slots} crafting slot${cur.slots > 1 ? 's' : ''} · ${cur.speed}x speed` : 'Turn wood into furniture that sells for much more.'}
            </Text>
          </View>
        </View>
        {w.buildingTo !== null && w.buildDoneAt !== null ? (
          <View style={{ marginTop: 10, gap: 6 }}>
            <Text style={styles.sub}>Building {WORKSHOPS[w.buildingTo].name}: {duration(w.buildDoneAt - now)} left</Text>
            <ProgressBar
              value={1 - (w.buildDoneAt - now) / (WORKSHOPS[w.buildingTo].buildMinutes * 60000)}
              color={C.leafLight}
              height={10}
            />
            <GoldButton gold={goldToSkip(w.buildDoneAt - now)} have={s.gold} label="Finish now" onPress={() => update((st) => finishBuildWithGold(st, Date.now())) && haptic.success()} />
          </View>
        ) : next ? (
          w.level < 0 && !unlocked ? (
            <Text style={styles.locked}>🔒 Buy your first land to unlock the workshop</Text>
          ) : (
            <Button
              style={{ marginTop: 10 }}
              variant={s.money >= next.cost ? 'green' : 'ghost'}
              label={w.level < 0 ? `Build ${next.name}` : `Upgrade to ${next.name}`}
              sub={`${money(next.cost)} · ${next.slots} slots · ${duration(next.buildMinutes * 60000)} to build`}
              disabled={s.money < next.cost}
              onPress={() => update((st) => startBuild(st, Date.now())) && haptic.success()}
            />
          )
        ) : (
          <Text style={[styles.sub, { marginTop: 8 }]}>Top level reached!</Text>
        )}
      </Card>

      {cur && (
        <>
          <Text style={styles.section}>Crafting {w.queue.length}/{cur.slots}</Text>
          {w.queue.map((c, i) => {
            const it = ITEMS.find((x) => x.id === c.itemId)!;
            const left = Math.max(0, c.doneAt - now);
            return (
              <Card key={i} style={styles.queue}>
                <View style={styles.row}>
                  <Text style={styles.icon}>{it.icon}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.name}>{it.name}</Text>
                    <ProgressBar value={1 - left / (c.doneAt - c.startedAt)} color={C.gold} height={8} />
                    <Text style={styles.small}>{duration(left)} left</Text>
                  </View>
                  <GoldButton gold={goldToSkip(left)} have={s.gold} label="Finish" onPress={() => update((st) => finishCraftWithGold(st, i, Date.now())) && haptic.success()} />
                </View>
              </Card>
            );
          })}

          <Text style={styles.section}>Recipes</Text>
          {ITEMS.filter((it) => it.tier <= w.level).map((it) => (
            <Card key={it.id} style={styles.recipe}>
              <View style={styles.row}>
                <Text style={styles.icon}>{it.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{it.name}</Text>
                  <Text style={styles.sub}>🪵 {whole(it.wood)} wood · ⏱ {duration(craftTimeMs(s, it.id))} · worth about {money(it.value)}</Text>
                </View>
                <Button
                  small
                  label="Craft"
                  disabled={s.wood < it.wood || w.queue.length >= cur.slots}
                  onPress={() => update((st) => startCraft(st, it.id, Date.now())) && haptic.chop()}
                />
              </View>
            </Card>
          ))}
          {WORKSHOPS[w.level + 1] && (
            <Text style={styles.small}>Upgrade to {WORKSHOPS[w.level + 1].name} to unlock {ITEMS.filter((x) => x.tier === w.level + 1).map((x) => x.name).join(', ')}.</Text>
          )}
        </>
      )}

      {Object.values(w.inventory).some((n) => n > 0) && (
        <>
          <Text style={styles.section}>Finished items</Text>
          {ITEMS.filter((it) => (w.inventory[it.id] ?? 0) > 0).map((it) => (
            <Card key={it.id} style={styles.recipe}>
              <View style={styles.row}>
                <Text style={styles.icon}>{it.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{it.name} x{w.inventory[it.id]}</Text>
                  <Text style={styles.sub}>Base value {money(it.value)}</Text>
                </View>
                <Button small variant="gold" label="Sell" onPress={() => setSelling({ itemId: it.id })} />
              </View>
              {selling?.itemId === it.id && selling.saleId === undefined && (
                <SellPanel itemId={it.id} onDone={() => setSelling(null)} />
              )}
            </Card>
          ))}
        </>
      )}

      {w.forSale.length > 0 && (
        <>
          <Text style={styles.section}>In your shop</Text>
          {w.forSale.map((x) => {
            const it = ITEMS.find((i) => i.id === x.itemId)!;
            return (
              <Card key={x.id} style={styles.recipe}>
                <View style={styles.row}>
                  <Text style={styles.icon}>{it.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{it.name} · {money(x.price)}</Text>
                    <Text style={[styles.sub, x.sellAt === null && { color: C.red }]}>
                      {x.sellAt === null ? 'No buyers at this price. Try lowering it.' : 'Waiting for a buyer...'}
                    </Text>
                  </View>
                  <Button small variant="ghost" label="Price" onPress={() => setSelling({ itemId: x.itemId, saleId: x.id })} />
                  <Button small variant="ghost" label="Take back" onPress={() => update((st) => cancelSale(st, x.id))} />
                </View>
                {selling?.saleId === x.id && <SellPanel itemId={x.itemId} saleId={x.id} start={x.price} onDone={() => setSelling(null)} />}
              </Card>
            );
          })}
        </>
      )}

      {w.history.length > 0 && (
        <>
          <Text style={styles.section}>Sales history</Text>
          <Card>
            {w.history.slice(0, 10).map((h, i) => {
              const it = ITEMS.find((x) => x.id === h.itemId)!;
              return (
                <Text key={i} style={styles.hist}>
                  {it.icon} {it.name} sold for {money(h.price)} after {duration(h.minutes * 60000)}
                </Text>
              );
            })}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function SawmillCard() {
  const s = useGame();
  const lvl = s.sawmill.level;
  const cur = lvl > 0 ? SAWMILL_LEVELS[lvl - 1] : null;
  const next = SAWMILL_LEVELS[lvl];
  const cost = sawmillNextCost(s);
  return (
    <Card>
      <View style={styles.row}>
        <Text style={styles.bigIcon}>🪚</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Sawmill{cur ? ` · Level ${lvl}/${SAWMILL_LEVELS.length}` : ''}</Text>
          <Text style={styles.sub}>
            {cur
              ? `Cuts ${cur.planksPerSec} planks a second (${cur.planksPerSec * PLANK_WOOD} wood a second). Cut planks by hand is only ${PLANK_CUT_PER_SEC}.`
              : `Turns wood into planks much faster than Cut planks (${PLANK_CUT_PER_SEC} a second). Comes with the Empire Pack, or build it with Money.`}
          </Text>
        </View>
        {cur && <Switch value={s.sawmill.on} onValueChange={(v) => { update((st) => setSawmillOn(st, v)); }} trackColor={{ true: C.leafLight, false: '#bbb' }} accessibilityLabel="Sawmill on or off" />}
      </View>
      {cur && <Text style={[styles.small, { marginTop: 6 }]}>{s.sawmill.on ? (s.wood >= PLANK_WOOD ? 'Running. Sell planks in the Market.' : 'Waiting for wood.') : 'Switched off.'}</Text>}
      {next && cost !== null ? (
        <Button
          style={{ marginTop: 8 }}
          variant={s.money >= cost ? 'green' : 'ghost'}
          label={lvl === 0 ? 'Build Sawmill' : `Upgrade to level ${lvl + 1}`}
          sub={`${money(cost)} · ${next.planksPerSec} planks a second`}
          disabled={s.money < cost}
          onPress={() => update((st) => upgradeSawmill(st)) && haptic.success()}
        />
      ) : (
        <Text style={[styles.sub, { marginTop: 6 }]}>Top level reached!</Text>
      )}
    </Card>
  );
}

function GoldButton({ gold, have, label, onPress }: { gold: number; have: number; label: string; onPress: () => void }) {
  return (
    <Button small variant="gold" label={`${label} · ${gold} Gold`} disabled={have < gold} onPress={onPress} />
  );
}

export function SellPanel({ itemId, saleId, start, onDone }: { itemId: string; saleId?: number; start?: number; onDone: () => void }) {
  const s = useGame();
  const it = ITEMS.find((x) => x.id === itemId)!;
  const [price, setPrice] = useState(start ?? bestItemPrice(s, itemId));
  const o = sellOdds(s, itemId, price);
  const best = bestItemPrice(s, itemId);
  const chance = Math.round(o.chance * 100);
  return (
    <View style={styles.sell}>
      <View style={styles.row}>
        <Text style={styles.priceBig}>{money(price)}</Text>
        <Text style={styles.small}>base {money(it.value)}</Text>
      </View>
      <Slider
        style={{ width: '100%', height: 36 }}
        minimumValue={Math.max(1, Math.round(it.value * 0.3))}
        maximumValue={Math.round(it.value * 3)}
        step={1}
        value={price}
        onValueChange={(v) => setPrice(Math.round(v))}
        minimumTrackTintColor={C.leafLight}
        maximumTrackTintColor="#d6c7a4"
        thumbTintColor={C.bark}
      />
      <View style={styles.odds}>
        <View style={styles.odd}><Text style={[styles.oddNum, { color: chance > 60 ? C.money : chance > 25 ? C.goldDark : C.red }]}>{chance}%</Text><Text style={styles.small}>sell chance</Text></View>
        <View style={styles.odd}><Text style={styles.oddNum}>{chance < 8 ? 'Maybe never' : `~${duration(o.minutes * 60000)}`}</Text><Text style={styles.small}>time to sell</Text></View>
        <View style={styles.odd}><Text style={styles.oddNum}>{money(price * o.chance)}</Text><Text style={styles.small}>expected</Text></View>
      </View>
      <Text style={styles.small}>Best price hint: about {money(best)}. Demand today changes these numbers.</Text>
      <View style={[styles.row, { marginTop: 6 }]}>
        <Button
          style={{ flex: 1 }}
          label={saleId === undefined ? 'Put in shop' : 'Change price'}
          onPress={() => {
            const ok = saleId === undefined
              ? update((st) => listForSale(st, itemId, price, Date.now()))
              : update((st) => changeSalePrice(st, saleId, price, Date.now()));
            if (ok) haptic.success();
            onDone();
          }}
        />
        <Button style={{ flex: 1 }} variant="ghost" label="Cancel" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  content: { padding: 14, gap: 10, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: C.forest },
  section: { fontSize: 18, fontWeight: '900', color: C.forest, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bigIcon: { fontSize: 40, width: 54, textAlign: 'center' },
  icon: { fontSize: 26, width: 36, textAlign: 'center' },
  name: { fontSize: 15, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
  small: { fontSize: 11, fontWeight: '700', color: C.inkSoft },
  locked: { marginTop: 10, fontSize: 14, fontWeight: '900', color: C.bark, textAlign: 'center' },
  queue: { paddingVertical: 10 },
  recipe: { paddingVertical: 8 },
  hist: { fontSize: 12, fontWeight: '700', color: C.ink, paddingVertical: 2 },
  sell: { marginTop: 10, borderTopWidth: 1, borderTopColor: C.cardEdge, paddingTop: 8 },
  priceBig: { fontSize: 22, fontWeight: '900', color: C.money, flex: 1 },
  odds: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  odd: { flex: 1, backgroundColor: 'rgba(107,68,35,0.08)', borderRadius: 10, paddingVertical: 6, alignItems: 'center' },
  oddNum: { fontSize: 14, fontWeight: '900', color: C.ink },
});

export { GoldCoin };
