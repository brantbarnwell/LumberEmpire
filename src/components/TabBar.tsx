import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';

export type Tab = 'chop' | 'upgrades' | 'helpers' | 'land' | 'workshop' | 'goals' | 'shop';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'chop', icon: '🪓', label: 'Chop' },
  { id: 'upgrades', icon: '⚒️', label: 'Axes' },
  { id: 'helpers', icon: '👷', label: 'Helpers' },
  { id: 'land', icon: '🗺️', label: 'Land' },
  { id: 'workshop', icon: '🛖', label: 'Workshop' },
  { id: 'goals', icon: '🎯', label: 'Goals' },
  { id: 'shop', icon: '🛒', label: 'Shop' },
];

export function TabBar({ tab, onTab, dots = {} }: { tab: Tab; onTab: (t: Tab) => void; dots?: Partial<Record<Tab, boolean>> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Pressable key={t.id} style={styles.tab} onPress={() => onTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <View style={[styles.iconWrap, on && styles.iconOn]}>
              <Text style={styles.icon}>{t.icon}</Text>
              {dots[t.id] && <View style={styles.dot} />}
            </View>
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1} adjustsFontSizeToFit>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: C.forest, paddingTop: 8, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  dot: { position: 'absolute', top: 2, right: 4, width: 9, height: 9, borderRadius: 5, backgroundColor: '#ff4d3d', borderWidth: 1.5, borderColor: C.forest },
  iconWrap: { width: 44, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: 'rgba(245,197,66,0.22)' },
  icon: { fontSize: 20 },
  label: { color: 'rgba(246,236,214,0.6)', fontWeight: '800', fontSize: 10, paddingHorizontal: 1 },
  labelOn: { color: C.gold },
});
