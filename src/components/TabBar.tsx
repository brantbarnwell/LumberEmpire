import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';
import { Icon, IconName } from './art/Icons';

export type Tab = 'chop' | 'upgrades' | 'helpers' | 'land' | 'workshop' | 'market' | 'goals' | 'shop';

// Update 2: Goals and Settings live inside Upgrades, so the bar stays short.
const TABS: { id: Tab; icon: IconName; label: string }[] = [
  { id: 'chop', icon: 'home', label: 'Home' },
  { id: 'upgrades', icon: 'tools', label: 'Upgrades' },
  { id: 'helpers', icon: 'helpers', label: 'Helpers' },
  { id: 'land', icon: 'land', label: 'Land' },
  { id: 'workshop', icon: 'buildings', label: 'Buildings' },
  { id: 'market', icon: 'market', label: 'Market' },
  { id: 'shop', icon: 'shop', label: 'Shop' },
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
              <Icon name={t.icon} size={on ? 28 : 24} />
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
  iconWrap: { width: 44, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: 'rgba(245,197,66,0.22)' },
  icon: { fontSize: 19 },
  label: { color: 'rgba(246,236,214,0.6)', fontWeight: '800', fontSize: 10, paddingHorizontal: 1 },
  labelOn: { color: C.gold },
});
