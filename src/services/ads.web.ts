// Web preview only: AdMob is iPhone-only. In development the preview plays a pretend 2-second "video"
// so the buttons and the reward path can be tested in a browser. In a real web build there are no videos.
import type { AdResult } from '../game/adflow';
export type { AdResult };
const MSG = 'Videos work in the iPhone app.';
const FAKE = typeof __DEV__ !== 'undefined' && __DEV__;
export function adsBlocker(): string | null { return FAKE ? null : MSG; }
export async function initAds() {}
export function adReady() { return FAKE; }
export function showRewardedVideo(onEarned?: () => void): Promise<AdResult> {
  if (!FAKE) return Promise.resolve({ ok: false, message: MSG });
  return new Promise((resolve) => setTimeout(() => { onEarned?.(); resolve({ ok: true }); }, 2000));
}
export async function earnReward(adFree: boolean): Promise<AdResult> { return adFree ? { ok: true } : showRewardedVideo(); }
