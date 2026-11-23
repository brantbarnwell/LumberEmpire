import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getState, update, useGame } from '../game/store';
import {
  craftTimeMs, finishBuildWithGold, finishCraftWithGold, goldToSkip, itemPrice, plankCutRate, sellItems,
  startBuild, startCraft, workshopUnlocked, upgradeSawmill, setSawmillOn, sawmillNextCost, systemUnlocked,
} from '../game/logic';
import { SawmillArt, WorkshopArt } from './art/Buildings';
import { FurnitureArt } from './art/Furniture';
import { LockedRow } from './Locked';
import { Icon } from './art/Icons';
import { feel } from '../services/feel';
import { Switch } from 'react-native';
import { EMPIRE_PACK_ID } from '../game/meta';
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
  const cur = w.level >= 0 ? WORKSHOPS[w.level] : null;
  const next = WORKSHOPS[w.level + 1];
  const unlocked = workshopUnlocked(s);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Buildings</Text>
      {systemUnlocked(s, 'sawmill') || s.sawmill.level > 0 ? <SawmillCard /> : <LockedRow id="sawmill" />}
      <Text style={styles.section}>Workshop</Text>

      {/* building */}
      <Card style={[!unlocked && w.level < 0 && { opacity: 0.55 }] as any}>
        <View style={styles.row}>
          <View style={styles.art}><WorkshopArt level={Math.max(0, w.buildingTo ?? w.level)} size={100} /></View>
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
            <View style={styles.lockRow}><Icon name="lock" size={22} /><Text style={styles.locked}>Buy your first land first</Text></View>
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
                  <View style={styles.iconBox}><FurnitureArt id={it.id} size={34} /></View>
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
                <View style={styles.iconBox}><FurnitureArt id={it.id} size={34} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{it.name}</Text>
                  <Text style={styles.sub}>{whole(it.wood)} wood · {duration(craftTimeMs(s, it.id))} · worth about {money(it.value)}</Text>
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
                <View style={styles.iconBox}><FurnitureArt id={it.id} size={34} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{it.name} x{w.inventory[it.id]}</Text>
                  <Text style={styles.sub}>{money(itemPrice(s, it.id, now))} each today</Text>
                </View>
                <Button small variant="gold" label={`Sell for ${money(itemPrice(s, it.id, now) * w.inventory[it.id])}`} onPress={() => {
                  const r = sellItems(getState(), it.id, Date.now());
                  if (r.sold) { update(() => r.state); feel.sell(); }
                }} />
              </View>
            </Card>
          ))}
        </>
      )}

      {w.history.length > 0 && (
        <>
          <Text style={styles.section}>Sales history</Text>
          <Card>
            {w.history.slice(0, 10).map((h, i) => {
              const it = ITEMS.find((x) => x.id === h.itemId)!;
              return (
                <View key={i} style={styles.histRow}>
                  <FurnitureArt id={it.id} size={20} />
                  <Text style={styles.hist}>{it.name} sold for {money(h.price)}</Text>
                </View>
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
        <SawmillArt level={lvl} running={lvl > 0 && s.sawmill.on && plankCutRate(s) > 0 && s.wood >= PLANK_WOOD} width={110} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Sawmill{cur ? ` · Level ${lvl}/${SAWMILL_LEVELS.length}` : ''}</Text>
          <Text style={styles.sub}>
            {cur
              ? `Cuts ${cur.planksPerSec} planks a second (${cur.planksPerSec * PLANK_WOOD} wood a second). Cut planks by hand is only ${PLANK_CUT_PER_SEC}.`
              : `Turns wood into planks much faster than Cut planks (${PLANK_CUT_PER_SEC} a second). Build it with Money. The Empire Pack is no longer sold, so a Sawmill kept through prestige can't be bought now; old buyers keep theirs.`}
          </Text>
        </View>
        {cur && <Switch value={s.sawmill.on} onValueChange={(v) => { update((st) => setSawmillOn(st, v)); }} trackColor={{ true: C.leafLight, false: '#bbb' }} accessibilityLabel="Sawmill on or off" />}
      </View>
      {cur && <Text style={[styles.small, { marginTop: 6 }]}>{s.sawmill.on ? (s.wood >= PLANK_WOOD ? 'Running. Sell planks in the Market.' : 'Waiting for wood.') : 'Switched off.'}</Text>}
      <Text style={styles.keep}>
        {s.owned.products.includes(EMPIRE_PACK_ID)
          ? 'From the Empire Pack: level 1 is kept forever, even after prestige. Upgrades bought with Money go back to level 1 when you prestige.'
          : 'Built with Money: lost when you prestige, like other buildings.'}
      </Text>
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

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  content: { padding: 14, gap: 10, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '900', color: C.forest },
  keep: { fontSize: 11.5, fontWeight: '800', color: C.goldDark, marginTop: 6 },
  section: { fontSize: 18, fontWeight: '900', color: C.forest, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  art: { width: 100, alignItems: 'center' },
  lockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  icon: { fontSize: 26, width: 36, textAlign: 'center' },
  iconBox: { width: 40, alignItems: 'center' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
  small: { fontSize: 11, fontWeight: '700', color: C.inkSoft },
  locked: { fontSize: 14, fontWeight: '900', color: C.bark, textAlign: 'center' },
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
