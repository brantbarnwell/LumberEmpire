import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { update, useGame } from '../game/store';
import {
  buyAxe, buyStorage, buyTool, buyToolWithGold, durabilityPower, equipSkin, repair, repairAll, repairAllCost, repairCost, repairTool, storageCap,
  storageUpgradeCost, toolPower, toolRepairCost, reequipGoldChainsaw,
} from '../game/logic';
import { AXES, AXE_SKINS, CRIT_CHANCE, CRIT_MULT, STORAGE_LEVELS, TOOLS } from '../game/data';
import { money, small, whole } from '../game/format';
import { haptic } from '../services/haptics';
import { Button, Card, DurabilityBar } from './ui';
import { C } from './theme';
import { AxeArt, axeLookOf, AxeLook } from './art/Axe';
import { ToolArt } from './art/ToolArt';
import { Icon, IconName } from './art/Icons';
import { GoalsScreen } from './GoalsScreen';

type Seg = 'tools' | 'goals' | 'settings';

/** Update 2: Upgrades holds Tools, Goals (quests, daily, prestige) and Settings, so the tab bar stays short. */
export function UpgradesScreen() {
  const [seg, setSeg] = useState<Seg>('tools');
  const tabs: { id: Seg; icon: IconName; label: string }[] = [
    { id: 'tools', icon: 'tools', label: 'Tools' },
    { id: 'goals', icon: 'goals', label: 'Goals' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <View style={styles.segs}>
        {tabs.map((t) => (
          <Pressable key={t.id} onPress={() => setSeg(t.id)} style={[styles.seg, seg === t.id && styles.segOn]} accessibilityRole="tab" accessibilityState={{ selected: seg === t.id }}>
            <Icon name={t.icon} size={20} />
            <Text style={[styles.segText, seg === t.id && { color: C.ink }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {seg === 'tools' && <ToolsList />}
      {seg === 'goals' && <GoalsScreen />}
      {seg === 'settings' && <SettingsPanel />}
    </View>
  );
}

function SettingsPanel() {
  const s = useGame();
  const set = (k: 'sound' | 'haptics' | 'reduceMotion', v: boolean) => update((st) => ({ ...st, settings: { ...st.settings, [k]: v } }));
  const row = (k: 'sound' | 'haptics' | 'reduceMotion', label: string, sub: string) => (
    <Card key={k}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{label}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>
        <Switch value={s.settings[k]} onValueChange={(v) => { set(k, v); }} trackColor={{ true: C.leafLight, false: '#bbb' }} accessibilityLabel={label} />
      </View>
    </Card>
  );
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      {row('sound', 'Sound', 'Chops, coins and unlocks. The iPhone silent switch mutes it too.')}
      {row('haptics', 'Vibration', 'Small taps you feel when you chop and buy.')}
      {row('reduceMotion', 'Reduce motion', 'Fewer shakes, chips and flying coins. Also on if your iPhone has Reduce Motion turned on.')}
    </ScrollView>
  );
}

function ToolsList() {
  const s = useGame();
  const cur = AXES[s.axeIndex];
  const full = repairCost(s, 100);
  const half = repairCost(s, 50);
  const dur = s.axeDurability;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.cream }} contentContainerStyle={styles.content}>
      {repairAllCost(s) > 0 && (
        <Button
          variant="brown"
          label="Repair All (axe + tools)"
          sub={money(repairAllCost(s))}
          disabled={s.money < repairAllCost(s)}
          onPress={() => update((st) => repairAll(st)) && haptic.success()}
        />
      )}

      <Card>
        <Text style={styles.label}>YOUR AXE</Text>
        <View style={styles.row}>
          <View style={styles.icon}><AxeArt look={axeLookOf(s)} size={50} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{cur.name}{s.equippedSkin ? ` (${AXE_SKINS[s.equippedSkin]?.name} skin)` : ''}</Text>
            <Text style={styles.sub}>
              {small(cur.power)} wood per chop · {Math.round(CRIT_CHANCE * 100)}% crit for {CRIT_MULT}x
            </Text>
            <View style={styles.durRow}>
              <DurabilityBar value={dur} width={140} />
              <Text style={[styles.durText, dur < 25 && { color: C.red }]}>{dur}%</Text>
            </View>
            <Text style={[styles.sub, { marginTop: 4 }, dur < 25 && { color: C.red }]}>
              {dur === 0
                ? 'At 0%: the starter axe never breaks, but repair it for full power.'
                : durabilityPower(dur) < 1
                  ? `Worn: working at ${durabilityPower(dur) * 100}% power.`
                  : `Loses 1% every ${cur.wearEvery} chops.${s.axeIndex > 0 ? ` At 0% it breaks: you drop to the ${AXES[s.axeIndex - 1].name} and buy it again. Repair first!` : ''}`}
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
              <View style={[styles.icon, { opacity: !owned && !afford ? 0.5 : 1 }]}><AxeArt look={a.id as AxeLook} size={50} /></View>
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

      <Text style={styles.section}>Tools</Text>
      <Text style={styles.sub}>Tools wear out as they work. Worn tools are weaker (75% at half, 50% under 25%) and broken tools do nothing until you repair them.</Text>
      {TOOLS.map((t) => {
        const owned = s.tools[t.id];
        const p = toolPower(s, t.id);
        const full = owned ? toolRepairCost(s, t.id, 100) : 0;
        const half = owned ? toolRepairCost(s, t.id, 50) : 0;
        return (
          <Card key={t.id} style={[styles.axeCard, owned && owned.durability === 0 && styles.broken] as any}>
            <View style={styles.row}>
              <View style={[styles.icon, owned?.durability === 0 && { opacity: 0.4 }]}><ToolArt id={t.id} size={44} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{t.name}{owned?.durability === 0 ? '  🔧' : ''}</Text>
                <Text style={styles.sub}>{t.effect}</Text>
                {t.goldCost && !owned && s.owned.goldChainsawBroken ? (
                  <Text style={styles.keepNote}>It broke at 0%. You bought it with Gold, so re-equip it for free at 100%.</Text>
                ) : t.goldCost && !owned ? (
                  <Text style={styles.keepNote}>Gold purchase: kept forever, even after prestige, and free to re-equip if it breaks. Money purchase: lost on prestige or when it breaks.</Text>
                ) : null}
                {owned && t.goldCost ? (
                  <Text style={[styles.keepNote, { color: owned.keep ? C.leaf : C.bark }]}>{owned.keep ? 'Bought with Gold: kept forever, even after prestige.' : 'Bought with Money: lost when you prestige.'}</Text>
                ) : null}
                {owned && (
                  <View style={styles.durRow}>
                    <DurabilityBar value={owned.durability} width={110} />
                    <Text style={[styles.durText, owned.durability < 25 && { color: C.red }]}>
                      {owned.durability}%{owned.durability === 0 ? ' BROKEN' : p < 1 ? ` · ${p * 100}% power` : ''}
                    </Text>
                  </View>
                )}
              </View>
              {!owned && t.id === 'goldchainsaw' && s.owned.goldChainsawBroken ? (
                <Button small variant="gold" label="Re-equip free" onPress={() => update((st) => reequipGoldChainsaw(st)) && haptic.success()} />
              ) : !owned && (
                <View style={{ gap: 4 }}>
                  <Button small variant={s.money >= t.cost ? 'green' : 'ghost'} label={money(t.cost)} disabled={s.money < t.cost}
                    onPress={() => update((st) => buyTool(st, t.id)) && haptic.success()} />
                  {t.goldCost ? (
                    <Button small variant="gold" label={`or ${whole(t.goldCost)} Gold`} disabled={s.gold < t.goldCost}
                      onPress={() => update((st) => buyToolWithGold(st, t.id)) && haptic.success()} />
                  ) : null}
                </View>
              )}
            </View>
            {owned && full > 0 && (
              <View style={[styles.row, { marginTop: 8 }]}>
                <Button style={{ flex: 1 }} small variant={owned.durability < 25 ? 'red' : 'brown'} label="Repair to 100%" sub={money(full)}
                  disabled={s.money < full} onPress={() => update((st) => repairTool(st, t.id, 100)) && haptic.success()} />
                {half > 0 && (
                  <Button style={{ flex: 1 }} small variant="ghost" label="Repair to 50%" sub={money(half)}
                    disabled={s.money < half} onPress={() => update((st) => repairTool(st, t.id, 50)) && haptic.success()} />
                )}
              </View>
            )}
          </Card>
        );
      })}

      <Text style={styles.section}>Wood storage</Text>
      <Card>
        <View style={styles.row}><Icon name="wood" size={26} /><Text style={styles.name}>Holds {whole(storageCap(s))} wood</Text></View>
        <Text style={styles.sub}>When it is full, new wood is lost until you sell. The Yard Seller sells straight from the forest.</Text>
        {storageUpgradeCost(s) !== null ? (
          <Button style={{ marginTop: 8 }} variant={s.money >= storageUpgradeCost(s)! ? 'green' : 'ghost'}
            label={`Upgrade to ${whole(STORAGE_LEVELS[s.storageLevel + 1].cap)} wood`} sub={money(storageUpgradeCost(s)!)}
            disabled={s.money < storageUpgradeCost(s)!} onPress={() => update((st) => buyStorage(st)) && haptic.success()} />
        ) : <Text style={[styles.sub, { marginTop: 6 }]}>Biggest yard reached!</Text>}
      </Card>

      <Text style={styles.sub}>Axe, tree and background skins are in Shop → Cosmetics (Gold only, looks only).</Text>
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
  segs: { flexDirection: 'row', gap: 6, padding: 10, paddingBottom: 0 },
  seg: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: C.cardEdge, backgroundColor: '#f1e4c6' },
  segOn: { backgroundColor: C.card, borderColor: '#3a2210' },
  segText: { fontSize: 13, fontWeight: '900', color: C.inkSoft },
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
  broken: { borderColor: C.red, borderWidth: 2 },
  keepNote: { fontSize: 11.5, fontWeight: '800', color: C.goldDark, marginTop: 3 },
  equipped: { color: C.leaf, fontWeight: '900' },
  ownedText: { color: C.inkSoft, fontWeight: '800' },
  need: { fontSize: 11, color: C.inkSoft, fontWeight: '700', textAlign: 'right', marginTop: 4 },
  item: { fontSize: 14, fontWeight: '800', color: C.ink, paddingVertical: 3 },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#efe2c4', alignItems: 'center', justifyContent: 'center' },
  handle: { position: 'absolute', width: 6, height: 34, borderRadius: 3, backgroundColor: C.bark, transform: [{ rotate: '35deg' }] },
  head: { position: 'absolute', top: 6, right: 7, width: 18, height: 14, borderTopRightRadius: 10, borderBottomRightRadius: 10, borderTopLeftRadius: 3, transform: [{ rotate: '35deg' }] },
});
