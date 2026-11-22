// Update 2: unlocks ("NEW AXE!", "NEW TOOL!", "NEW LAND!") and small news show as a short banner
// under the top bar. It never covers the tree, never blocks a tap, and goes away by itself.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useGame, update } from '../game/store';
import { AXES, AXE_SKINS, HELPERS, LAND, TOOLS, SYSTEMS, HELPER_MILESTONE_EVERY, HELPER_MILESTONE_GOLD, COSMETICS } from '../game/data';
import { systemUnlocked } from '../game/logic';
import { AxeArt, axeLookOf, AxeLook } from './art/Axe';
import { LandArt } from './art/Buildings';
import { Icon, IconName } from './art/Icons';
import { feel, lessMotion } from '../services/feel';
import { exactMoney } from '../game/format';
import { C, shadow } from './theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ND = Platform.OS !== 'web';
export type Toast = { kind?: string; title: string; sub?: string; axe?: AxeLook; land?: string; icon?: IconName; emoji?: string; unlock?: boolean };

let queue: Toast[] = [];
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());
/** Show a short banner under the top bar. */
export function showToast(t: Toast) {
  queue = [...queue, t].slice(-6);
  emit();
}
function useToast() {
  return useSyncExternalStore((l) => (ls.add(l), () => ls.delete(l)), () => queue[0] ?? null, () => queue[0] ?? null);
}

export function Celebrate() {
  const s = useGame();
  const prev = useRef<{ axe: number; skin: string | null; tools: string[]; helpers: string[]; lands: string[]; systems: string[]; miles: Record<string, number>; cos: string[] } | null>(null);
  const t = useToast();
  const a = useRef(new Animated.Value(0)).current;
  const [, force] = useState(0);
  const insets = useSafeAreaInsets();

  // watch for new gear, crew and land
  useEffect(() => {
    const cur = {
      axe: s.axeIndex,
      skin: s.equippedSkin,
      tools: Object.keys(s.tools),
      helpers: HELPERS.filter((h) => (s.helpers[h.id]?.count ?? 0) > 0).map((h) => h.id),
      lands: Object.keys(s.lands),
      systems: SYSTEMS.filter((x) => systemUnlocked(s, x.id)).map((x) => x.id as string),
      miles: { ...(s.helperMilestones ?? {}) },
      cos: [...s.cosmetics.owned],
    };
    const p = prev.current;
    prev.current = cur;
    if (!p) return;
    for (const id of cur.systems) if (!p.systems.includes(id)) {
      const d = SYSTEMS.find((x) => x.id === id)!;
      showToast({ kind: 'NEW SYSTEM!', title: d.name, sub: d.why, icon: id === 'land' || id === 'auctions' ? 'land' : id === 'market' ? 'market' : id === 'manager' ? 'helpers' : 'buildings', unlock: true });
    }
    for (const [hid, m] of Object.entries(cur.miles)) if (m > (p.miles[hid] ?? 0)) {
      const d = HELPERS.find((x) => x.id === hid)!;
      showToast({ kind: `+${HELPER_MILESTONE_GOLD} GOLD`, title: `${m * HELPER_MILESTONE_EVERY} ${d.name}s!`, sub: 'Helper milestone', icon: 'gold', unlock: true });
    }
    for (const id of cur.cos) if (!p.cos.includes(id)) {
      const d = COSMETICS.find((x) => x.id === id);
      if (d?.rare) showToast({ kind: 'RARE COSMETIC!', title: d.name, sub: 'Equip it in Shop → Cosmetics', icon: 'gold', unlock: true });
    }
    if (cur.axe > p.axe) showToast({ kind: 'NEW AXE!', title: AXES[cur.axe].name, sub: `${AXES[cur.axe].power} wood per chop`, axe: axeLookOf({ axeIndex: cur.axe, equippedSkin: null }), unlock: true });
    if (cur.skin && cur.skin !== p.skin) showToast({ kind: 'NEW LOOK!', title: `${AXE_SKINS[cur.skin]?.name ?? 'New'} axe skin`, axe: axeLookOf({ axeIndex: cur.axe, equippedSkin: cur.skin }), unlock: true });
    for (const id of cur.tools) if (!p.tools.includes(id)) {
      const d = TOOLS.find((x) => x.id === id);
      if (d) showToast({ kind: 'NEW TOOL!', title: d.name, sub: d.effect, icon: 'tools', unlock: true });
    }
    for (const id of cur.helpers) if (!p.helpers.includes(id)) {
      const d = HELPERS.find((x) => x.id === id)!;
      showToast({ kind: 'NEW CREW!', title: d.name, icon: 'helpers', unlock: true });
    }
    for (const id of cur.lands) if (!p.lands.includes(id)) {
      const d = LAND.find((x) => x.id === id)!;
      showToast({ kind: 'NEW LAND!', title: d.name, sub: `+${d.woodPerSec.toLocaleString('en-US')} wood/sec`, land: d.id, unlock: true });
    }
  }, [s.axeIndex, s.equippedSkin, Object.keys(s.tools).length, JSON.stringify(s.helpers), Object.keys(s.lands).length, SYSTEMS.filter((x) => systemUnlocked(s, x.id)).length, s.cosmetics.owned.length]);

  // lost an auction you bid in
  useEffect(() => {
    const L = s.lastAuctionLoss;
    if (!L) return;
    const d = LAND.find((x) => x.id === L.landId);
    showToast({ kind: 'AUCTION LOST', title: `${L.winner} won ${d?.name ?? 'the land'}`, sub: `You paid ${exactMoney(L.lost)} (5%)`, icon: 'land' });
    update((st) => ({ ...st, lastAuctionLoss: null }));
  }, [s.lastAuctionLoss?.at]);

  // play the current banner, then the next one
  useEffect(() => {
    if (!t) return;
    if (t.unlock) feel.unlock();
    a.setValue(0);
    const quiet = lessMotion();
    Animated.sequence([
      Animated.spring(a, { toValue: 1, friction: 6, tension: 90, useNativeDriver: ND }),
      Animated.delay(2200),
      Animated.timing(a, { toValue: 0, duration: quiet ? 1 : 220, easing: Easing.in(Easing.quad), useNativeDriver: ND }),
    ]).start(() => { queue = queue.slice(1); emit(); force((n) => n + 1); });
  }, [t]);
  if (!t) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 112 }]}>
      <Animated.View style={[styles.card, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
        <View style={styles.art}>
          {t.axe ? <AxeArt look={t.axe} size={52} /> : t.land ? <LandArt id={t.land} width={60} owned /> : t.icon ? <Icon name={t.icon} size={40} /> : <Text style={{ fontSize: 34 }}>{t.emoji ?? '✨'}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          {t.kind ? <Text style={styles.kind}>{t.kind}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>{t.title}</Text>
          {t.sub ? <Text style={styles.sub} numberOfLines={1}>{t.sub}</Text> : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 104, alignItems: 'center', zIndex: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 18, borderWidth: 2.5, borderColor: '#3a2210', paddingVertical: 8, paddingHorizontal: 12, width: '92%', maxWidth: 380, ...shadow },
  art: { width: 60, height: 52, alignItems: 'center', justifyContent: 'center' },
  kind: { fontSize: 12, fontWeight: '900', color: C.goldDark, letterSpacing: 1 },
  title: { fontSize: 17, fontWeight: '900', color: C.ink },
  sub: { fontSize: 12.5, fontWeight: '800', color: C.inkSoft },
});
