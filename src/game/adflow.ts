// Playbook 3: one place that decides when an ad reward is paid. Pure, so it can be tested without a phone.
// Rule: the reward is paid when the video finishes (AdMob's "earned reward"), never when it opens.
// It is paid right then, before the ad closes, so leaving the app or a missing "closed" event can't lose it.
export type AdResult = { ok: true } | { ok: false; message: string };
export type ShowAd = (onEarned: () => void) => Promise<AdResult>;

export async function runAdReward(o: {
  adFree: boolean; // Remove Ads / VIP: no video, the reward is instant
  show: ShowAd;
  canGrant: () => boolean; // still allowed (cap, cooldown) before we start
  grant: () => boolean; // pays once; returns false if it could not
}): Promise<string | null> {
  if (!o.canGrant()) return 'Not available right now.';
  if (o.adFree) return o.grant() ? null : 'Not available right now.';
  let paid = false;
  let tried = false;
  const pay = () => {
    if (tried) return; // one reward per video, even if the SDK fires twice
    tried = true;
    paid = o.grant();
  };
  const r = await o.show(pay);
  if (paid) return null;
  if (tried) return 'Not available right now.';
  if (r.ok) {
    pay(); // finished, but the earned event never came: still pay
    return paid ? null : 'Not available right now.';
  }
  return r.message; // closed early, failed or no video: no reward
}
