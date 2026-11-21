import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getState, setState, update } from './game/store';
import { applyOffline, tick } from './game/logic';
import { loadGame, saveGame } from './game/save';
import { money, whole, duration } from './game/format';
import { initStore } from './services/purchases';
import { TopBar } from './components/TopBar';
import { TabBar, Tab } from './components/TabBar';
import { ChopScreen } from './components/ChopScreen';
import { UpgradesScreen } from './components/UpgradesScreen';
import { ShopScreen } from './components/ShopScreen';
import { PopupView } from './components/PopupView';
import { showPopup } from './components/popup';
import { C } from './components/theme';

const TICK_MS = 250;
const AUTOSAVE_MS = 10_000; // spec: autosave every 10 seconds

function offlinePopup(r: ReturnType<typeof applyOffline>) {
  if (r.sold > 0) {
    showPopup({
      icon: '🌙',
      title: 'Welcome back!',
      body: `While you were away for ${duration(r.away * 1000)}, you sold ${whole(r.sold)} wood for ${money(r.earned)}.`,
    });
  }
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('chop');

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await loadGame();
      if (!alive) return;
      if (saved) {
        const r = applyOffline(saved, Date.now());
        setState(r.state);
        offlinePopup(r);
      }
      setReady(true);
      initStore((vip) => update((s) => (s.vipActive === vip ? null : { ...s, vipActive: vip })));
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let last = Date.now();
    const loop = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(5, (now - last) / 1000);
      last = now;
      update((s) => tick(s, dt, now));
    }, TICK_MS);
    const autosave = setInterval(() => saveGame(getState()), AUTOSAVE_MS);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background' || st === 'inactive') {
        saveGame(getState());
      } else if (st === 'active') {
        const r = applyOffline(getState(), Date.now());
        if (r.away > 0) {
          setState(r.state);
          offlinePopup(r);
        }
        last = Date.now();
      }
    });
    return () => {
      clearInterval(loop);
      clearInterval(autosave);
      sub.remove();
    };
  }, [ready]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        {ready ? (
          <>
            <TopBar onShop={() => setTab('shop')} />
            <View style={{ flex: 1 }}>
              {tab === 'chop' && <ChopScreen onOpenUpgrades={() => setTab('upgrades')} />}
              {tab === 'upgrades' && <UpgradesScreen />}
              {tab === 'shop' && <ShopScreen />}
            </View>
            <TabBar tab={tab} onTab={setTab} />
            <PopupView />
          </>
        ) : (
          <View style={styles.loading}>
            <Text style={styles.logo}>🌲 Lumber Empire</Text>
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.forest },
  logo: { color: C.gold, fontSize: 30, fontWeight: '900' },
});
