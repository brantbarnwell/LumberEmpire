import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { update, useGame } from '../game/store';
import { helperCount, helperOutputBase, helperWageSpeed, hireCost, hireHelper, levelCost, levelHelper, toolFx, wagePerHour, woodMultFor } from '../game/logic';
import { HELPERS, HELPER_LEVEL_BONUS, HELPER_MAX_LEVEL, HELPER_WAGES, HOME_WOOD, WAGE_LEVEL_GROWTH } from '../game/data';
import { money, small, whole } from '../game/format';
import { haptic } from '../services/haptics';
import { Button, Card } from './ui';
import { C } from './theme';

export function HelpersScreen() {
  const s = useGame();
  const now = Date.now();
  const mult = woodMultFor(s, now, HOME_WOOD);
  const total = HELPERS.reduce((a, h) => a + helperOutputBase(h.id, s.helpers[h.id]), 0) * mult * (1 + toolFx(s).helperPct) * helperWageSpeed(s);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Helpers</Text>
      <Card style={styles.summary}>
        <Text style={styles.big}>{whole(helperCount(s))} helpers</Text>
        <Text style={styles.sub}>chopping {small(total)} wood/sec, even when you are not tapping</Text>
        {mult !== 1 && <Text style={[styles.sub, { color: C.leaf }]}>Boosts active: x{small(mult)}</Text>}
        {wagePerHour(s) > 0 && <Text style={styles.sub}>Wages: {money(wagePerHour(s))} per hour, paid from your Money</Text>}
      </Card>
      {s.wagesOwed > 0 && (
        <Card style={styles.owe}>
          <Text style={styles.oweText}>💸 You owe {money(s.wagesOwed)} in wages. Your helpers work at half speed until you can pay. It pays itself as soon as you have the Money.</Text>
        </Card>
      )}
      {HELPERS.map((h, i) => {
        const owned = s.helpers[h.id] ?? { count: 0, level: 0 };
        const hc = hireCost(s, h.id);
        const lc = levelCost(s, h.id);
        const prevOwned = i === 0 || (s.helpers[HELPERS[i - 1].id]?.count ?? 0) > 0 || owned.count > 0;
        const perOne = h.woodPerSec * (1 + HELPER_LEVEL_BONUS * owned.level);
        return (
          <Card key={h.id} style={[styles.card, !prevOwned && { opacity: 0.55 }] as any}>
            <View style={styles.row}>
              <View style={styles.avatar}><Text style={{ fontSize: 30 }}>{h.icon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{h.name}</Text>
                <Text style={styles.sub}>{small(perOne)} wood/sec each · Level {owned.level}/{HELPER_MAX_LEVEL} · wage {money(HELPER_WAGES[h.id] * (1 + WAGE_LEVEL_GROWTH * owned.level))}/hr</Text>
                {owned.count > 0 && <Text style={styles.owned}>You have {owned.count} · {small(helperOutputBase(h.id, owned) * mult)} wood/sec total</Text>}
              </View>
            </View>
            <View style={[styles.row, { marginTop: 10 }]}>
              <Button
                style={{ flex: 1 }}
                label={owned.count ? 'Hire another' : 'Hire'}
                sub={money(hc)}
                variant={s.money >= hc ? 'green' : 'ghost'}
                disabled={s.money < hc}
                onPress={() => update((st) => hireHelper(st, h.id)) && haptic.success()}
              />
              {owned.count > 0 && (
                <Button
                  style={{ flex: 1 }}
                  variant={lc !== null && s.money >= lc ? 'gold' : 'ghost'}
                  label={lc === null ? 'Max level' : `Level up (+25%)`}
                  sub={lc === null ? undefined : money(lc)}
                  disabled={lc === null || s.money < lc}
                  onPress={() => update((st) => levelHelper(st, h.id)) && haptic.success()}
                />
              )}
            </View>
            {s.money < hc && <Text style={styles.need}>Need {money(hc - s.money)} more to hire</Text>}
          </Card>
        );
      })}
      <Text style={styles.foot}>Each extra copy of the same helper costs 15% more. Level-ups boost every copy of that helper.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  content: { padding: 14, gap: 10, paddingBottom: 30 },
  title: { fontSize: 26, fontWeight: '900', color: C.forest },
  summary: { alignItems: 'center' },
  big: { fontSize: 22, fontWeight: '900', color: C.ink },
  card: { paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#efe2c4', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
  owned: { fontSize: 12, fontWeight: '800', color: C.leaf, marginTop: 2 },
  need: { fontSize: 11, fontWeight: '700', color: C.inkSoft, textAlign: 'right', marginTop: 4 },
  owe: { backgroundColor: '#fde0dc', borderColor: '#f1a59a' },
  oweText: { fontWeight: '800', color: C.ink, fontSize: 13 },
  foot: { fontSize: 11, color: C.inkSoft, fontWeight: '600', textAlign: 'center' },
});
