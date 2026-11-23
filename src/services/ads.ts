// Opt-in rewarded videos with Google AdMob. Never forced, never while tapping.
// VIP and Remove Ads players get the reward instantly without a video.
// Videos only work in a real build (development build, TestFlight, App Store), not Expo Go or web.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const IOS_UNIT = process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID ?? '';

import type { AdResult } from '../game/adflow';
export type { AdResult };

let mod: typeof import('react-native-google-mobile-ads') | null = null;
let ready = false;
let loaded = false;
let ad: import('react-native-google-mobile-ads').RewardedAd | null = null;

export function adsBlocker(): string | null {
  if (Platform.OS !== 'ios') return 'Videos work in the iPhone app.';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'Videos work in the TestFlight / development build, not Expo Go.';
  return null;
}

function unitId() {
  if (__DEV__ || !IOS_UNIT) return mod!.TestIds.REWARDED; // Google's test ad, never pays out
  return IOS_UNIT;
}

function loadNext() {
  if (!mod) return;
  loaded = false;
  ad = mod.RewardedAd.createForAdRequest(unitId(), { requestNonPersonalizedAdsOnly: true });
  ad.addAdEventListener(mod.RewardedAdEventType.LOADED, () => { loaded = true; });
  const mine = ad;
  ad.addAdEventListener(mod.AdEventType.ERROR, () => {
    // no video to show (no fill / no network): the buttons stay hidden; try again in 30 seconds
    if (ad === mine && !loaded) setTimeout(() => { if (ad === mine) loadNext(); }, 30_000);
  });
  ad.load();
}

export async function initAds() {
  if (adsBlocker() || ready) return;
  try {
    mod = require('react-native-google-mobile-ads');
    await mod!.default().initialize();
    ready = true;
    loadNext();
  } catch {
    ready = false;
  }
}

export function adReady() {
  return ready && loaded;
}

/** Shows a video. onEarned runs the moment the video is finished. Resolves when it closes. */
export function showRewardedVideo(onEarned?: () => void): Promise<AdResult> {
  const b = adsBlocker();
  if (b) return Promise.resolve({ ok: false, message: b });
  if (!ready || !ad || !mod) return Promise.resolve({ ok: false, message: 'Videos are still loading. Try again in a moment.' });
  if (!loaded) return Promise.resolve({ ok: false, message: 'No video available right now. Try again in a minute.' });
  const m = mod;
  const current = ad;
  return new Promise((resolve) => {
    let earned = false;
    const subs = [
      current.addAdEventListener(m.RewardedAdEventType.EARNED_REWARD, () => { earned = true; onEarned?.(); }),
      current.addAdEventListener(m.AdEventType.CLOSED, () => {
        subs.forEach((u) => u());
        loadNext();
        resolve(earned ? { ok: true } : { ok: false, message: 'Watch the whole video to get the reward.' });
      }),
      current.addAdEventListener(m.AdEventType.ERROR, () => {
        subs.forEach((u) => u());
        loadNext();
        resolve({ ok: false, message: 'The video failed to play. Try again in a minute.' });
      }),
    ];
    current.show().catch(() => {
      subs.forEach((u) => u());
      loadNext();
      resolve({ ok: false, message: 'The video failed to play. Try again in a minute.' });
    });
  });
}

/** Old helper: instantly for ad-free players, otherwise after a full video. */
export async function earnReward(adFree: boolean): Promise<AdResult> {
  if (adFree) return { ok: true };
  return showRewardedVideo();
}
