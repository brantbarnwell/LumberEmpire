// Web preview only: AdMob is iPhone-only, so videos explain that instead.
export type AdResult = { ok: true } | { ok: false; message: string };
const MSG = 'Videos work in the iPhone app.';
export function adsBlocker(): string | null { return MSG; }
export async function initAds() {}
export function adReady() { return false; }
export async function showRewardedVideo(): Promise<AdResult> { return { ok: false, message: MSG }; }
export async function earnReward(adFree: boolean): Promise<AdResult> { return adFree ? { ok: true } : { ok: false, message: MSG }; }
