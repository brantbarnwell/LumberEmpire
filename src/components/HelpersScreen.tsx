import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { update, useGame } from '../game/store';
import { helperCount, helperOutputBase, helperWageSpeed, hireCost, hireHelper, levelCost, levelHelper, toolFx, wagePerHour, woodMultFor, hireManager, setManagerOn, managerActive, storageCap, storageUsed, hireYardSeller, systemUnlocked } from '../game/logic';
import { Switch } from 'react-native';
import { HELPERS, HELPER_LEVEL_BONUS, HELPER_MAX_LEVEL, HELPER_WAGES, HOME_WOOD, WAGE_LEVEL_GROWTH, MANAGER_COST, MANAGER_WAGE, YARD_SELLER_COST } from '../game/data';
import { money, small, whole } from '../game/format';
import { haptic } from '../services/haptics';
import { Button, Card } from './ui';
import { C } from './theme';
import { Person, WHO, WorkYard } from './art/Crew';
import { Icon } from './art/Icons';
import { ToolArt } from './art/ToolArt';
import { LockedRow } from './Locked';

/** Section 24: the cash helper that sells wood and planks for you at the market price. */
function YardSellerCard() {
  const s = useGame();
  return (
    <Card style={[styles.card, { borderColor: C.gold, borderWidth: 2 }] as any}>
      <View style={styles.row}>
        <View style={styles.avatar}><Icon name="seller" size={40} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Yard Seller</Text>
          <Text style={styles.sub}>Every 5 seconds he sells 80% of your wood at the market price, all day and while you are away. 20% always stays for planks and crafting. Wood only. No wage.</Text>
          {s.yardSeller && <Text style={styles.owned}>{s.selling ? 'Selling now' : 'Paused'}</Text>}
        </View>
        {s.yardSeller && <Switch value={s.selling} onValueChange={(v) => { update((st) => ({ ...st, selling: v, plankSelling: v })); }} trackColor={{ true: C.leafLight, false: '#bbb' }} accessibilityLabel="Yard Seller on or off" />}
      </View>
      {!s.yardSeller && (
        <Button style={{ marginTop: 10 }} label="Hire Yard Seller" sub={money(YARD_SELLER_COST)} variant={s.money >= YARD_SELLER_COST ? 'gold' : 'ghost'}
          disabled={s.money < YARD_SELLER_COST} onPress={() => update((st) => hireYardSeller(st)) && haptic.success()} />
      )}
    </Card>
  );
}

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
      <WorkYard s={s} />
      {systemUnlocked(s, 'market') || s.yardSeller ? <YardSellerCard /> : <LockedRow id="market" />}
      {systemUnlocked(s, 'manager') || s.manager.hired ? <ManagerCard /> : <LockedRow id="manager" />}
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
              <View style={styles.avatar}>{WHO[h.id] ? <View style={{ transform: [{ scale: 0.8 }] }}><Person w={WHO[h.id]} /></View> : <ToolArt id="truck" size={44} />}</View>
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

function ManagerCard() {
  const s = useGame();
  const m = s.manager;
  const pct = Math.round((storageUsed(s) / storageCap(s)) * 100);
  return (
    <Card style={styles.mgr}>
      <View style={styles.row}>
        <View style={styles.avatar}><View style={{ transform: [{ scale: 0.8 }] }}><Person w={{ shirt: '#2b3a5a', pants: '#2b2b3a', hat: 'cap', hatColor: '#2b3a5a', belt: '#f5c542' }} /></View></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Manager</Text>
          <Text style={styles.sub}>One manager runs sales for your whole empire.</Text>
        </View>
        {m.hired && (
          <Switch value={m.on} onValueChange={(v) => { update((st) => setManagerOn(st, v)); }} trackColor={{ true: C.leafLight, false: '#bbb' }} accessibilityLabel="Manager on or off" />
        )}
      </View>
      <View style={styles.mgrList}>
        <Text style={styles.mgrLine}>✅ Every 5 seconds sells 80% of your wood at the market price. 20% always stays for planks and crafting. Wood only.</Text>
        <Text style={styles.mgrLine}>✅ Collects your Money when you come back, so you don't have to tap Collect.</Text>
        <Text style={styles.mgrLine}>❌ Does not chop, buy land, repair tools, sell furniture, or take bulk orders.</Text>
        <Text style={styles.mgrLine}>💵 Wage: {money(MANAGER_WAGE)} per hour while switched on, paid automatically.</Text>
      </View>
      {!m.hired ? (
        <Button style={{ marginTop: 8 }} label="Hire manager" sub={money(MANAGER_COST)} variant={s.money >= MANAGER_COST ? 'green' : 'ghost'}
          disabled={s.money < MANAGER_COST} onPress={() => update((st) => hireManager(st)) && haptic.success()} />
      ) : (
        <View style={{ gap: 4, marginTop: 8 }}>
          {(m.owed ?? 0) > 0 ? (
            <Text style={styles.oweText}>💸 You owe your manager {money(m.owed!)}. He is paused (no selling, no collecting) until you can pay. It pays itself as soon as you have the Money.</Text>
          ) : (
            <Text style={[styles.owned, !m.on && { color: C.inkSoft }]}>
              {!m.on ? 'Manager is OFF (no wage while off)' : `Selling now: yard is ${pct}% full`}
            </Text>
          )}
          <View style={styles.mgrStats}>
            <View style={styles.mgrStat}><Text style={styles.mgrNum}>{whole(m.soldToday)}</Text><Text style={styles.sub}>wood sold today</Text></View>
            <View style={styles.mgrStat}><Text style={styles.mgrNum}>{money(m.moneyToday)}</Text><Text style={styles.sub}>from his sales today</Text></View>
            <View style={styles.mgrStat}><Text style={styles.mgrNum}>{money(m.collectedToday)}</Text><Text style={styles.sub}>collected for you today</Text></View>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  mgr: { borderColor: C.gold, borderWidth: 2 },
  mgrList: { marginTop: 8, gap: 3 },
  mgrLine: { fontSize: 12.5, fontWeight: '700', color: C.ink },
  mgrStats: { flexDirection: 'row', gap: 6 },
  mgrStat: { flex: 1, backgroundColor: 'rgba(107,68,35,0.08)', borderRadius: 10, padding: 6, alignItems: 'center' },
  mgrNum: { fontSize: 15, fontWeight: '900', color: C.ink },
  page: { flex: 1, backgroundColor: C.cream },
  content: { padding: 14, gap: 10, paddingBottom: 30 },
  title: { fontSize: 26, fontWeight: '900', color: C.forest },
  summary: { alignItems: 'center' },
  big: { fontSize: 22, fontWeight: '900', color: C.ink },
  card: { paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#cdeef5', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', borderWidth: 2, borderColor: '#3a2210' },
  name: { fontSize: 16, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
  owned: { fontSize: 12, fontWeight: '800', color: C.leaf, marginTop: 2 },
  need: { fontSize: 11, fontWeight: '700', color: C.inkSoft, textAlign: 'right', marginTop: 4 },
  owe: { backgroundColor: '#fde0dc', borderColor: '#f1a59a' },
  oweText: { fontWeight: '800', color: C.ink, fontSize: 13 },
  foot: { fontSize: 11, color: C.inkSoft, fontWeight: '600', textAlign: 'center' },
});
