// Pure notification timing rules (no phone code), so they can be tested.
import { NOTIF_QUIET_END, NOTIF_QUIET_START, OFFLINE_MAX_HOURS, OFFLINE_RATE } from '../game/data';
import { GameState, dayKeyOf, passiveWoodPerSec } from '../game/logic';
import { canClaimLogin } from '../game/meta';
import { whole } from '../game/format';

/** Moves a time out of quiet hours (9pm-9am) to the next 9am. */
export function outOfQuietHours(t: number) {
  const d = new Date(t);
  const h = d.getHours();
  if (h >= NOTIF_QUIET_START) return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, NOTIF_QUIET_END, 0).getTime();
  if (h < NOTIF_QUIET_END) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), NOTIF_QUIET_END, 0).getTime();
  return t;
}

/** Picks the one notification to send next time the app is closed. Pure, so it can be tested. */
export function planNotification(s: GameState, now: number): { at: number; title: string; body: string } | null {
  const wps = passiveWoodPerSec(s, now) * OFFLINE_RATE;
  let plan: { at: number; title: string; body: string } | null = null;
  if (wps > 0) {
    const at = now + OFFLINE_MAX_HOURS * 3600_000;
    const logs = Math.round(wps * OFFLINE_MAX_HOURS * 3600 + s.wood);
    plan = { at, title: 'Your yard is full', body: `Your helpers stacked up ${whole(logs)} logs. Come sell them before they stop chopping.` };
  } else {
    const tomorrow = new Date(now);
    const at = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1, 10, 0).getTime();
    const day = canClaimLogin(s, now) ? s.login.index + 1 : ((s.login.index % 7) + 1);
    plan = { at, title: 'Daily reward ready', body: `Your Day ${day} reward is waiting at the lumber yard.` };
  }
  let at = outOfQuietHours(plan.at);
  // max 1 a day: never on a day we already sent one
  if (s.notif.lastFireDay && dayKeyOf(at) === s.notif.lastFireDay) {
    const d = new Date(at);
    at = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, NOTIF_QUIET_END, 0).getTime();
  }
  return { ...plan, at };
}

