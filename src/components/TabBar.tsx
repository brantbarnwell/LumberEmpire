import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from './theme';

export type Tab = 'chop' | 'upgrades' | 'shop';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'chop', icon: '🪓', label: 'Chop' },
  { id: 'upgrades', icon: '⚒️', label: 'Upgrades' },
  { id: 'shop', icon: '🛒', label: 'Shop' },
];

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Pressable key={t.id} style={styles.tab} onPress={() => onTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <View style={[styles.iconWrap, on && styles.iconOn]}>
              <Text style={styles.icon}>{t.icon}</Text>
            </View>
            <Text style={[styles.label, on && styles.labelOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: C.forest, paddingTop: 8, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  iconWrap: { width: 52, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: 'rgba(245,197,66,0.22)' },
  icon: { fontSize: 22 },
  label: { color: 'rgba(246,236,214,0.6)', fontWeight: '800', fontSize: 11.5 },
  labelOn: { color: C.gold },
});
