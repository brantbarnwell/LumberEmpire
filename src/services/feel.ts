// Update 2: game feel in one place. Every tap, purchase, unlock, prestige and reward goes through here,
// so sound, haptics and the visual "pop" fire together and all respect the Settings switches.
import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

type Flags = { sound: boolean; haptics: boolean; reduceMotion: boolean };
let flags: Flags = { sound: true, haptics: true, reduceMotion: false };
let systemReduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { systemReduceMotion = !!v; }).catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => { systemReduceMotion = !!v; });

export function setFeelFlags(f: Flags) {
  flags = f;
}
/** True when the player (or iPhone setting) asked for less motion. */
export function lessMotion() {
  return flags.reduceMotion || systemReduceMotion;
}

// ---------- sound ----------
const SOURCES = {
  chop0: require('../../assets/sounds/chop0.wav'),
  chop1: require('../../assets/sounds/chop1.wav'),
  chop2: require('../../assets/sounds/chop2.wav'),
  chop3: require('../../assets/sounds/chop3.wav'),
  chop4: require('../../assets/sounds/chop4.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  sell: require('../../assets/sounds/sell.wav'),
  unlock: require('../../assets/sounds/unlock.wav'),
  prestige: require('../../assets/sounds/prestige.wav'),
  golden: require('../../assets/sounds/golden.wav'),
};
type SoundId = keyof typeof SOURCES;
const players: Partial<Record<SoundId, AudioPlayer>> = {};
let audioReady = false;

function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  // respect the iPhone silent switch and never stop the player's music
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

function play(id: SoundId, volume = 0.8) {
  if (!flags.sound) return;
  try {
    ensureAudio();
    let p = players[id];
    if (!p) {
      p = createAudioPlayer(SOURCES[id]);
      players[id] = p;
    }
    p.volume = volume;
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // sound is a nice-to-have; never crash the game over it
  }
}

// chop pitch climbs over 5 fast taps, then starts again
let lastChop = 0;
let chopStep = 0;

// ---------- haptics ----------
const canBuzz = Platform.OS === 'ios' || Platform.OS === 'android';
function buzz(kind: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
  if (!flags.haptics || !canBuzz) return;
  const p = kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : kind === 'error' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      : Haptics.impactAsync(kind === 'light' ? Haptics.ImpactFeedbackStyle.Light : kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy);
  p.catch(() => {});
}

// ---------- visual pops (the top bar listens) ----------
export type PopTarget = 'money' | 'gold' | 'wood' | 'wps';
type Fly = { icon: 'coin' | 'log'; from: { x: number; y: number }; to: PopTarget; n: number; wood?: string };
const popLs = new Set<(t: PopTarget) => void>();
const flyLs = new Set<(f: Fly) => void>();
export function onPop(l: (t: PopTarget) => void) { popLs.add(l); return () => { popLs.delete(l); }; }
export function onFly(l: (f: Fly) => void) { flyLs.add(l); return () => { flyLs.delete(l); }; }
export function pop(t: PopTarget) { popLs.forEach((l) => l(t)); }
/** Coins or logs fly from a screen point into a top-bar counter. */
export function fly(icon: Fly['icon'], from: { x: number; y: number }, to: PopTarget, n = 4, wood?: string) {
  if (lessMotion()) { pop(to); return; }
  flyLs.forEach((l) => l({ icon, from, to, n, wood }));
}

// ---------- the moments ----------
export const feel = {
  chop(crit: boolean) {
    const now = Date.now();
    chopStep = now - lastChop < 400 ? (chopStep + 1) % 5 : 0;
    lastChop = now;
    play(`chop${chopStep}` as SoundId, crit ? 1 : 0.75);
    buzz(crit ? 'medium' : 'light');
  },
  sell() { play('sell', 0.7); buzz('medium'); pop('money'); },
  purchase() { play('coin', 0.7); buzz('medium'); pop('money'); pop('wps'); },
  unlock() { play('unlock', 0.8); buzz('success'); },
  milestone() { play('unlock', 0.8); buzz('heavy'); },
  reward() { play('coin', 0.8); buzz('success'); pop('money'); pop('gold'); },
  golden() { play('golden', 0.8); buzz('heavy'); },
  prestige() { play('prestige', 0.9); buzz('heavy'); },
  error() { buzz('error'); },
};
