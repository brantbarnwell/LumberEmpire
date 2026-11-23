// Playbook 3: the Watch Ad pill. Mid-right on the home screen (about 58% down), never over the tree.
// Playbook 3 fix: it pays +5 Gold (shown before you tap). 7 minute cooldown, 5 a day, its own counter.
// Remove Ads players: instant, but only 1 ad reward a day in total, then "1 of 1 used today".
// Calm and still, except a short glow pulse when a new offer becomes ready.
// Hidden: in the first 4 minutes of play, while you are tapping, and when no video is loaded.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useGame } from '../game/store';
import { adFree, adPillState, clockText, rewardGoldVideo } from '../game/meta';
import { AD_GOLD_PER_VIDEO, AD_GOLD_VIDEOS_PER_DAY } from '../game/data';
import { adReady } from '../services/ads';
import { lessMotion } from '../services/feel';
import { runReward } from './reward';
import { showToast } from './Celebrate';
import { Icon } from './art/Icons';
import { C } from './theme';

const ND = Platform.OS !== 'web';
export const PILL_W = 166;
export const PILL_H = 52;
const SCREEN_AT = 0.56; // 55-65% down the screen (centre of the pill)
const QUIET_MS = 2500; // hidden while tapping, back 2.5 s after the last chop
const PULSE_MS = 10_000; // glow for 10 s when a new offer becomes ready

const clock = clockText;

export function WatchAdPill({ now, areaTop, areaH, lastChopAt }: { now: number; areaTop: number; areaH: number; lastChopAt: number }) {
  const s = useGame();
  const win = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const st = adPillState(s, now);
  const free = adFree(s);
  const loaded = free || adReady();
  const tapping = now - lastChopAt < QUIET_MS;
  const visible =
    st.status !== 'locked' && !tapping && !s.pendingOffline && (st.status !== 'ready' || loaded || busy); // never offer a video that can't play

  // glow pulse only when the offer turns ready while you are here (not when you open the app)
  const prev = useRef(st.status);
  const [pulseUntil, setPulseUntil] = useState(0);
  useEffect(() => {
    if (prev.current !== 'ready' && st.status === 'ready') setPulseUntil(Date.now() + PULSE_MS);
    prev.current = st.status;
  }, [st.status]);
  const pulsing = st.status === 'ready' && now < pulseUntil && !lessMotion();

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: visible ? 1 : 0, duration: visible ? 400 : 100, useNativeDriver: ND }).start();
  }, [visible]);
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!pulsing) {
      glow.stopAnimation();
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
        Animated.timing(glow, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulsing]);

  if (st.status === 'locked') return null;
  const top = Math.max(8, Math.min(areaH - PILL_H - 8, win.height * SCREEN_AT - areaTop - PILL_H / 2));
  const ready = st.status === 'ready';

  let line1 = '';
  let line2 = '';
  if (ready) {
    line1 = free ? `Claim · +${AD_GOLD_PER_VIDEO} Gold` : `Watch Ad · +${AD_GOLD_PER_VIDEO} Gold`;
    line2 = free ? 'Instant · 1 a day' : `${st.left} of ${AD_GOLD_VIDEOS_PER_DAY} left today`;
  } else if (st.status === 'cooldown') {
    line1 = `Ready in ${clock(st.msLeft)}`;
    line2 = `${st.left} of ${AD_GOLD_VIDEOS_PER_DAY} left today`;
  } else if (st.status === 'capped') {
    line1 = `New ads in ${clock(st.msLeft)}`;
    line2 = `${AD_GOLD_VIDEOS_PER_DAY} of ${AD_GOLD_VIDEOS_PER_DAY} used today`;
  } else if (st.status === 'instantUsed') {
    line1 = '1 of 1 used today';
    line2 = `New in ${clock(st.msLeft)}`;
  }

  const onPress = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setPulseUntil(0);
    const err = await runReward((x) => rewardGoldVideo(x, Date.now()));
    setBusy(false);
    if (err) showToast({ kind: 'NO REWARD', title: err, icon: 'gold' });
    else showToast({ kind: 'AD REWARD', title: `+${AD_GOLD_PER_VIDEO} Gold`, icon: 'gold' });
  };

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[styles.wrap, { top, opacity: fade, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]}
    >
      <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] }) }]} />
      <Pressable
        onPress={onPress}
        disabled={!ready || busy}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={ready ? `${line1}, ${line2}` : line1}
        accessibilityState={{ disabled: !ready || busy }}
        style={({ pressed }) => [styles.pill, !ready && styles.calm, pressed && { transform: [{ scale: 0.96 }] }]}
      >
        <View style={[styles.play, !ready && { backgroundColor: 'rgba(58,34,16,0.25)' }]}>
          {ready && !free ? <Text style={styles.playText}>▶</Text> : <Icon name="gold" size={18} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.l1, !ready && styles.calmText]} numberOfLines={1}>{busy ? 'Playing…' : line1}</Text>
          <Text style={[styles.l2, !ready && styles.calmText2]} numberOfLines={1}>{line2}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 10, width: PILL_W, height: PILL_H, zIndex: 6 },
  glow: { position: 'absolute', left: -8, right: -8, top: -8, bottom: -8, borderRadius: 34, backgroundColor: '#ffe27a' },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6, borderRadius: 26,
    backgroundColor: C.gold, borderWidth: 3, borderColor: '#3a2210',
  },
  calm: { backgroundColor: '#e9d9b6' },
  play: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#3a2210', alignItems: 'center', justifyContent: 'center' },
  playText: { color: C.gold, fontSize: 11, fontWeight: '900', marginLeft: 2 },
  l1: { fontSize: 12, fontWeight: '900', color: '#3a2210', letterSpacing: -0.3 },
  l2: { fontSize: 11.5, fontWeight: '800', color: '#5b3a12', fontVariant: ['tabular-nums'] },
  calmText: { color: '#5b4630', fontVariant: ['tabular-nums'] },
  calmText2: { fontSize: 11.5, color: '#7a6248' },
});
