import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { update, useGame } from '../game/store';
import { buyAxe, durabilityPower, repair, repairCost } from '../game/logic';
import { AXES, CRIT_CHANCE, CRIT_MULT } from '../game/data';
import { money, small } from '../game/format';
import { haptic } from '../services/haptics';
import { Button, Card, DurabilityBar } from './ui';
import { C } from './theme';

export function UpgradesScreen() {
  const s = useGame();
  const cur = AXES[s.axeIndex];
  const full = repairCost(s, 100);
  const half = repairCost(s, 50);
  const dur = s.axeDurability;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.cream }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Upgrades</Text>

      <Card>
        <Text style={styles.label}>YOUR AXE</Text>
        <View style={styles.row}>
          <AxeIcon color={cur.head} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{cur.name}</Text>
            <Text style={styles.sub}>
              {small(cur.power)} wood per chop · {Math.round(CRIT_CHANCE * 100)}% crit for {CRIT_MULT}x
            </Text>
            <View style={styles.durRow}>
              <DurabilityBar value={dur} width={140} />
              <Text style={[styles.durText, dur < 25 && { color: C.red }]}>{dur}%</Text>
            </View>
            <Text style={[styles.sub, { marginTop: 4 }, dur < 25 && { color: C.red }]}>
              {dur === 0
                ? 'Broken: chops like a rusty axe until repaired.'
                : durabilityPower(dur) < 1
                  ? `Worn: working at ${durabilityPower(dur) * 100}% power.`
                  : `Loses 1% every ${cur.wearEvery} chops.`}
            </Text>
          </View>
        </View>
        <View style={[styles.row, { marginTop: 10 }]}>
          <Button
            style={{ flex: 1 }}
            variant="brown"
            label={full ? `Repair to 100%` : 'Fully repaired'}
            sub={full ? money(full) : undefined}
            disabled={!full || s.money < full}
            onPress={() => update((st) => repair(st, 100)) && haptic.success()}
          />
          {half > 0 && (
            <Button
              style={{ flex: 1 }}
              variant="ghost"
              label="Repair to 50%"
              sub={money(half)}
              disabled={s.money < half}
              onPress={() => update((st) => repair(st, 50)) && haptic.success()}
            />
          )}
        </View>
      </Card>

      <Text style={styles.section}>Axes</Text>
      {AXES.map((a, i) => {
        const owned = i <= s.axeIndex;
        const current = i === s.axeIndex;
        const afford = s.money >= a.cost;
        return (
          <Card key={a.id} style={[styles.axeCard, current && styles.current] as any}>
            <View style={styles.row}>
              <AxeIcon color={a.head} dim={!owned && !afford} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{a.name}</Text>
                <Text style={styles.sub}>{small(a.power)} wood per chop</Text>
              </View>
              {current ? (
                <Text style={styles.equipped}>Equipped</Text>
              ) : owned ? (
                <Text style={styles.ownedText}>Owned</Text>
              ) : (
                <Button
                  small
                  variant={afford ? 'green' : 'ghost'}
                  label={money(a.cost)}
                  disabled={!afford}
                  onPress={() => {
                    if (update((st) => buyAxe(st, i))) haptic.success();
                  }}
                />
              )}
            </View>
            {!owned && !afford && (
              <Text style={styles.need}>Need {money(a.cost - s.money)} more</Text>
            )}
          </Card>
        );
      })}

      {s.owned.exclusiveAxes.length + s.owned.skins.length > 0 && (
        <>
          <Text style={styles.section}>Your special items</Text>
          <Card>
            {s.owned.exclusiveAxes.includes('dragon') && <Text style={styles.item}>🐉 Dragon Axe (Gold exclusive)</Text>}
            {s.owned.skins.includes('steel-axe-skin') && <Text style={styles.item}>✨ Steel Axe skin</Text>}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function AxeIcon({ color, dim }: { color: string; dim?: boolean }) {
  return (
    <View style={[styles.icon, { opacity: dim ? 0.45 : 1 }]}>
      <View style={styles.handle} />
      <View style={[styles.head, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, paddingBottom: 30 },
  title: { fontSize: 26, fontWeight: '900', color: C.forest },
  section: { fontSize: 18, fontWeight: '900', color: C.forest, marginTop: 6 },
  label: { fontSize: 11, fontWeight: '900', color: C.inkSoft, letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 16, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
  durRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  durText: { fontSize: 12, fontWeight: '900', color: C.inkSoft },
  axeCard: { paddingVertical: 10 },
  current: { borderColor: C.leafLight, borderWidth: 2 },
  equipped: { color: C.leaf, fontWeight: '900' },
  ownedText: { color: C.inkSoft, fontWeight: '800' },
  need: { fontSize: 11, color: C.inkSoft, fontWeight: '700', textAlign: 'right', marginTop: 4 },
  item: { fontSize: 14, fontWeight: '800', color: C.ink, paddingVertical: 3 },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#efe2c4', alignItems: 'center', justifyContent: 'center' },
  handle: { position: 'absolute', width: 6, height: 34, borderRadius: 3, backgroundColor: C.bark, transform: [{ rotate: '35deg' }] },
  head: { position: 'absolute', top: 6, right: 7, width: 18, height: 14, borderTopRightRadius: 10, borderBottomRightRadius: 10, borderTopLeftRadius: 3, transform: [{ rotate: '35deg' }] },
});
