import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getState, setState, update, useGame } from './game/store';
import { GameState, OfflineResult, computeOffline, dayKeyOf, ensureListings, migrate, tick } from './game/logic';
import { canClaimLogin, ensureQuests, questProgress } from './game/meta';
import { loadGame, saveGame } from './game/save';
import { initStore } from './services/purchases';
import { initAds } from './services/ads';
import { cancelAll, scheduleFor } from './services/notify';
import { TopBar } from './components/TopBar';
import { TabBar, Tab } from './components/TabBar';
import { ChopScreen } from './components/ChopScreen';
import { UpgradesScreen } from './components/UpgradesScreen';
import { HelpersScreen } from './components/HelpersScreen';
import { LandScreen } from './components/LandScreen';
import { WorkshopScreen } from './components/WorkshopScreen';
import { GoalsScreen } from './components/GoalsScreen';
import { ShopScreen } from './components/ShopScreen';
import { PopupView } from './components/PopupView';
import { WelcomeBack } from './components/WelcomeBack';
import { NotifPrompt } from './components/NotifPrompt';
import { C } from './components/theme';

const TICK_MS = 250;
const AUTOSAVE_MS = 10_000; // spec: autosave every 10 seconds

function mergeOffline(a: OfflineResult | null, b: OfflineResult | null): OfflineResult | null {
  if (!a) return b;
  if (!b) return a;
  return { away: a.away + b.away, earned: a.earned + b.earned, sold: a.sold + b.sold, produced: a.produced + b.produced };
}

/** Runs the time away and holds the Money for the Welcome Back screen. */
function catchUp(s: GameState, now: number): GameState {
  const off = computeOffline(s, now);
  return { ...off.state, pendingOffline: mergeOffline(s.pendingOffline, off.result) };
}

function daily(s: GameState, now: number) {
  return ensureQuests(ensureListings(s, now), now);
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('chop');

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await loadGame();
      if (!alive) return;
      const now = Date.now();
      setState(daily(saved ? catchUp(migrate(saved), now) : getState(), now));
      setReady(true);
      initStore((vip) => update((s) => (s.vipActive === vip ? null : { ...s, vipActive: vip })));
      initAds();
      cancelAll();
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
      update((s) => ({ ...daily(tick(s, dt, now), now), lastSaved: now }));
    }, TICK_MS);
    const autosave = setInterval(() => saveGame(getState()), AUTOSAVE_MS);
    const sub = AppState.addEventListener('change', async (st) => {
      const now = Date.now();
      if (st === 'background' || st === 'inactive') {
        const s = getState();
        await saveGame(s);
        const at = await scheduleFor(s, now);
        update((x) => ({ ...x, notif: { ...x.notif, scheduledAt: at } }));
        saveGame(getState());
      } else if (st === 'active') {
        cancelAll();
        update((s) => {
          let x = s;
          // if the scheduled notification already went off, remember the day (max 1 a day)
          if (x.notif.scheduledAt && x.notif.scheduledAt <= now) {
            x = { ...x, notif: { ...x.notif, lastFireDay: dayKeyOf(x.notif.scheduledAt), scheduledAt: null } };
          }
          return daily(catchUp(x, now), now);
        });
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
        {ready ? <Game tab={tab} setTab={setTab} /> : (
          <View style={styles.loading}>
            <Text style={styles.logo}>🌲 Lumber Empire</Text>
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

function Game({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const s = useGame();
  const now = Date.now();
  const goalsDot =
    canClaimLogin(s, now) ||
    s.daily.quests.some((q) => !q.claimed && questProgress(s, q) >= q.target) ||
    (!!s.weekly.quest && !s.weekly.quest.claimed && questProgress(s, s.weekly.quest) >= s.weekly.quest.target);
  return (
    <>
      <TopBar onShop={() => setTab('shop')} />
      <View style={{ flex: 1 }}>
        {tab === 'chop' && <ChopScreen onOpenUpgrades={() => setTab('upgrades')} />}
        {tab === 'upgrades' && <UpgradesScreen />}
        {tab === 'helpers' && <HelpersScreen />}
        {tab === 'land' && <LandScreen />}
        {tab === 'workshop' && <WorkshopScreen />}
        {tab === 'goals' && <GoalsScreen />}
        {tab === 'shop' && <ShopScreen />}
      </View>
      <TabBar tab={tab} onTab={setTab} dots={{ goals: goalsDot }} />
      {tab === 'chop' && <NotifPrompt />}
      <WelcomeBack />
      <PopupView />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.cream },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.forest },
  logo: { color: C.gold, fontSize: 30, fontWeight: '900' },
});
