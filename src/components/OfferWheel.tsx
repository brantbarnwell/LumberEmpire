// Bug fix batch 1: make-an-offer is a spin wheel. Pick an offer with the slider ($1 up to 2x asking, or your Money),
// see the chance in plain words, then spin: green = the land is yours at your offer, red = the seller says no.
import { useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { getState, update, useGame } from '../game/store';
import { offerChance, offerMax, retryHours, spinOffer } from '../game/logic';
import { LAND } from '../game/data';
import { money } from '../game/format';
import { haptic } from '../services/haptics';
import { Button } from './ui';
import { C } from './theme';

const ND = Platform.OS !== 'web';
const R = 70;

function sector(deg: number) {
  if (deg >= 359.99) return `M ${R} ${R} m -${R} 0 a ${R} ${R} 0 1 0 ${2 * R} 0 a ${R} ${R} 0 1 0 -${2 * R} 0`;
  const a = ((deg - 90) * Math.PI) / 180;
  const x = R + R * Math.cos(a);
  const y = R + R * Math.sin(a);
  return `M ${R} ${R} L ${R} 0 A ${R} ${R} 0 ${deg > 180 ? 1 : 0} 1 ${x} ${y} Z`;
}

export function pct(c: number) {
  const p = c * 100;
  return p < 1.5 ? '1%' : `${Math.round(p)}%`;
}

/** Slider position (0..1) to dollars: squared, so the low end is easy to pick. */
const toAmount = (t: number, max: number) => Math.max(1, Math.round(1 + (max - 1) * t * t));
const toT = (a: number, max: number) => (max <= 1 ? 0 : Math.sqrt(Math.max(0, (a - 1) / (max - 1))));

export function OfferWheel({ landId, onClose }: { landId: string; onClose: () => void }) {
  const s = useGame();
  const def = LAND.find((x) => x.id === landId)!;
  const max = offerMax(s, landId);
  const [amount, setAmount] = useState(Math.min(max, def.asking));
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<null | 'won' | 'lost'>(null);
  const rot = useRef(new Animated.Value(0)).current;
  const track = useRef<any>(null);
  const trackBox = useRef({ x: 0, w: 1 });
  const a = Math.min(amount, max);
  const chance = offerChance(a, def.asking);

  const setFromPage = (pageX: number) => {
    const t = Math.max(0, Math.min(1, (pageX - trackBox.current.x) / trackBox.current.w));
    setAmount(toAmount(t, max));
    setResult(null);
  };

  const spin = () => {
    if (spinning || a < 1 || a > getState().money) return;
    const won = Math.random() < chance;
    const g = chance * 360;
    const r = 0.15 + Math.random() * 0.7;
    const land = won ? g * r : g + (360 - g) * r; // where the pointer ends up on the wheel
    setSpinning(true);
    setResult(null);
    rot.setValue(0);
    Animated.timing(rot, { toValue: 360 * 5 + (360 - land), duration: 3200, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(() => {
      // apply the outcome to the game as it is NOW (the game kept running during the spin)
      update((st) => spinOffer(st, landId, a, Date.now(), () => (won ? 0 : 0.99999)).state);
      setSpinning(false);
      setResult(won ? 'won' : 'lost');
      if (won) {
        haptic.success();
        setTimeout(onClose, 1800);
      } else haptic.error();
    });
  };

  const t = toT(a, max);
  return (
    <View style={styles.box}>
      <Text style={styles.big}>Offer {money(a)}, about {pct(chance)} chance</Text>
      <Text style={styles.small}>Asking {money(def.asking)}. Higher offers land on green more often. Never 0%, never 100%.</Text>

      <View
        ref={track}
        style={styles.track}
        onLayout={() => track.current?.measureInWindow?.((x: number, _y: number, w: number) => { trackBox.current = { x, w: Math.max(1, w) }; })}
        onStartShouldSetResponder={() => !spinning}
        onMoveShouldSetResponder={() => !spinning}
        onResponderGrant={(e) => setFromPage(e.nativeEvent.pageX)}
        onResponderMove={(e) => setFromPage(e.nativeEvent.pageX)}
        accessibilityRole="adjustable"
        accessibilityLabel={`Offer ${money(a)}`}
      >
        <View style={[styles.fill, { width: `${t * 100}%` }]} />
        <View style={[styles.thumb, { left: `${t * 100}%` }]} />
      </View>
      <View style={styles.row}>
        {[{ l: '$1', v: 1 }, { l: 'Half', v: def.asking / 2 }, { l: 'Asking', v: def.asking }, { l: '2x', v: def.asking * 2 }].map((q) => (
          <Button key={q.l} small variant="ghost" style={{ flex: 1 }} label={q.l} disabled={spinning || q.v > max + 0.5}
            onPress={() => { setAmount(Math.max(1, Math.round(Math.min(q.v, max)))); setResult(null); }} />
        ))}
      </View>

      <View style={styles.wheelWrap}>
        <Animated.View style={{ transform: [{ rotate: rot.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] }}>
          <Svg width={R * 2} height={R * 2}>
            <Circle cx={R} cy={R} r={R - 1} fill="#d1462f" stroke="#3a2210" strokeWidth={2} />
            <Path d={sector(chance * 360)} fill="#3fa34d" stroke="#3a2210" strokeWidth={2} />
            <Circle cx={R} cy={R} r={10} fill="#f5e6c8" stroke="#3a2210" strokeWidth={2} />
          </Svg>
        </Animated.View>
        <Svg width={26} height={22} style={styles.pointer}>
          <Polygon points="2,2 24,2 13,20" fill="#f5c542" stroke="#3a2210" strokeWidth={2} />
        </Svg>
      </View>

      {result === 'won' && <Text style={[styles.res, { color: C.leaf }]}>Green! The seller accepted. {def.name} is yours for {money(a)}.</Text>}
      {result === 'lost' && <Text style={[styles.res, { color: C.red }]}>Red. The seller said no. Try again in {retryHours(landId) === 1 ? '1 hour' : `${retryHours(landId)} hours`}.</Text>}

      {result !== 'lost' && (
        <Button variant="gold" label={spinning ? 'Spinning…' : `Spin: offer ${money(a)}`} disabled={spinning || a > s.money || result === 'won'} onPress={spin} />
      )}
      <Button small variant="ghost" style={{ marginTop: 6 }} label="Close" disabled={spinning} onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 8, gap: 6 },
  big: { fontSize: 16, fontWeight: '900', color: C.ink },
  small: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
  track: { height: 28, borderRadius: 14, backgroundColor: 'rgba(58,34,16,0.15)', justifyContent: 'center', marginVertical: 6 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 14, backgroundColor: C.gold },
  thumb: { position: 'absolute', width: 28, height: 28, marginLeft: -14, borderRadius: 14, backgroundColor: '#fff', borderWidth: 3, borderColor: '#3a2210' },
  row: { flexDirection: 'row', gap: 6 },
  wheelWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 14, marginVertical: 4 },
  pointer: { position: 'absolute', top: 0 },
  res: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
});
