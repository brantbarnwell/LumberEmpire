// Update 3: Cosmetics shop. Gold only, looks only (never stats), kept forever through prestige.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getState, update, useGame } from '../game/store';
import { COSMETICS, CosmeticDef, CosmeticKind } from '../game/data';
import { buyCosmetic, equipCosmetic, unequipCosmetic } from '../game/meta';
import { feel } from '../services/feel';
import { TREE_H, TREE_W, TreeArt } from './art/TreeArt';
import { AxeArt, axeLookOf, COSMETIC_AXE_LOOK } from './art/Axe';
import { Backdrop } from './art/Backdrop';
import { Icon } from './art/Icons';
import { Button, Card } from './ui';
import { C } from './theme';

const KINDS: { kind: CosmeticKind; title: string }[] = [
  { kind: 'tree', title: 'Tree skins' },
  { kind: 'axe', title: 'Axe skins' },
  { kind: 'bg', title: 'Backgrounds' },
];

function TreeThumb({ skin, scale }: { skin: string; scale: number }) {
  return (
    <View style={{ width: TREE_W * scale, height: TREE_H * scale, overflow: 'hidden' }}>
      <View style={{ width: TREE_W, height: TREE_H, transform: [{ translateX: (-TREE_W * (1 - scale)) / 2 }, { translateY: (-TREE_H * (1 - scale)) / 2 }, { scale }] }}>
        <TreeArt cut={0} skin={skin} />
      </View>
    </View>
  );
}

function Thumb({ c }: { c: CosmeticDef }) {
  if (c.kind === 'tree') return <TreeThumb skin={c.id} scale={0.22} />;
  if (c.kind === 'axe') return <AxeArt look={COSMETIC_AXE_LOOK[c.id]} size={56} />;
  return (
    <View style={{ width: 84, height: 60, borderRadius: 8, overflow: 'hidden' }}>
      <Backdrop bg={c.id} h={60} />
    </View>
  );
}

export function CosmeticsScreen() {
  const s = useGame();
  const eq = s.cosmetics;
  const [sel, setSel] = useState<string | null>(null);
  const pick = sel ? COSMETICS.find((x) => x.id === sel)! : null;
  // the preview shows what you picked on top of what you are wearing
  const pv = {
    tree: pick?.kind === 'tree' ? pick.id : eq.tree,
    axe: pick?.kind === 'axe' ? COSMETIC_AXE_LOOK[pick.id] : axeLookOf(s),
    bg: pick?.kind === 'bg' ? pick.id : eq.bg,
  };
  const owned = pick ? eq.owned.includes(pick.id) : false;
  const equipped = pick ? (pick.kind === 'tree' ? eq.tree === pick.id : pick.kind === 'bg' ? eq.bg === pick.id : eq.axe === pick.id) : false;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={styles.preview}>
          <Backdrop bg={pv.bg} h={210} />
          <View style={styles.pvTree}><TreeThumb skin={pv.tree} scale={0.6} /></View>
          <View style={styles.pvAxe}><View style={{ transform: [{ scaleX: -1 }, { rotate: '-20deg' }] }}><AxeArt look={pv.axe} size={70} /></View></View>
          <View style={styles.pvLabel}><Text style={styles.pvText}>{pick ? 'PREVIEW' : 'YOUR LOOK'}</Text></View>
        </View>
        <View style={{ padding: 12, gap: 6 }}>
          {pick ? (
            <>
              <View style={styles.row}>
                <Text style={[styles.name, { flex: 1 }]}>{pick.name}</Text>
                {!owned && !pick.rare && <View style={styles.price}><Icon name="gold" size={18} /><Text style={styles.priceText}>{pick.gold}</Text></View>}
              </View>
              <Text style={styles.note}>Looks only: no stats, no extra wood. Yours forever, kept through prestige. Equip or take off any time for free.</Text>
              {owned ? (
                <Button
                  variant={equipped ? 'ghost' : 'green'}
                  label={equipped ? (pick.gold === 0 && pick.kind !== 'axe' ? 'Equipped (default)' : 'Take off') : 'Equip'}
                  disabled={equipped && pick.gold === 0 && pick.kind !== 'axe'}
                  onPress={() => {
                    update((st) => (equipped ? unequipCosmetic(st, pick.kind) : equipCosmetic(st, pick.id)));
                    feel.purchase();
                  }}
                />
              ) : pick.rare ? (
                <Text style={styles.rare}>Rare: only from the Day 7 daily reward.</Text>
              ) : (
                <Button
                  variant={s.gold >= pick.gold ? 'gold' : 'ghost'}
                  label={s.gold >= pick.gold ? `Buy for ${pick.gold} Gold` : `Need ${pick.gold - s.gold} more Gold`}
                  disabled={s.gold < pick.gold}
                  onPress={() => {
                    const st = buyCosmetic(getState(), pick.id);
                    if (st) { update(() => st); feel.unlock(); }
                  }}
                />
              )}
            </>
          ) : (
            <Text style={styles.note}>Tap any item to preview it. Cosmetics cost Gold only and change looks only. Earn Gold from Golden Trees, daily quests, the Day 7 reward, prestige and helper milestones.</Text>
          )}
        </View>
      </Card>

      {KINDS.map((k) => (
        <View key={k.kind} style={{ gap: 8 }}>
          <Text style={styles.section}>{k.title}</Text>
          <View style={styles.grid}>
            {COSMETICS.filter((c) => c.kind === k.kind).map((c) => {
              const has = eq.owned.includes(c.id);
              const on = c.kind === 'tree' ? eq.tree === c.id : c.kind === 'bg' ? eq.bg === c.id : eq.axe === c.id;
              return (
                <Pressable key={c.id} onPress={() => setSel(c.id)} style={[styles.tile, sel === c.id && styles.tileSel]} accessibilityRole="button" accessibilityLabel={`${c.name} ${has ? 'owned' : `${c.gold} Gold`}`}>
                  <View style={styles.thumb}><Thumb c={c} /></View>
                  <Text style={styles.tileName} numberOfLines={1}>{c.name}</Text>
                  {on ? <Text style={styles.on}>Equipped</Text> : has ? <Text style={styles.own}>Owned</Text> : c.rare ? <Text style={styles.rareTag}>Day 7</Text> : (
                    <View style={styles.price}><Icon name="gold" size={14} /><Text style={styles.tilePrice}>{c.gold}</Text></View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10, paddingBottom: 40 },
  preview: { height: 210, overflow: 'hidden' },
  pvTree: { position: 'absolute', left: '50%', marginLeft: -78, bottom: 4 },
  pvAxe: { position: 'absolute', left: '50%', marginLeft: 40, bottom: 18 },
  pvLabel: { position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(43,29,16,0.75)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  pvText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 18, fontWeight: '900', color: C.ink },
  note: { fontSize: 12.5, fontWeight: '700', color: C.inkSoft },
  rare: { fontSize: 13, fontWeight: '900', color: '#7a3fb0' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceText: { fontSize: 17, fontWeight: '900', color: C.goldDark },
  section: { fontSize: 18, fontWeight: '900', color: C.forest },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%', backgroundColor: C.card, borderRadius: 14, borderWidth: 2, borderColor: '#d9c39a', padding: 6, alignItems: 'center', gap: 2 },
  tileSel: { borderColor: '#3a2210', backgroundColor: '#fff3d1' },
  thumb: { height: 70, alignItems: 'center', justifyContent: 'center' },
  tileName: { fontSize: 12, fontWeight: '900', color: C.ink },
  tilePrice: { fontSize: 12.5, fontWeight: '900', color: C.goldDark },
  on: { fontSize: 11, fontWeight: '900', color: C.leaf },
  own: { fontSize: 11, fontWeight: '900', color: C.inkSoft },
  rareTag: { fontSize: 11, fontWeight: '900', color: '#7a3fb0' },
});
