// Pure notification timing rules (no phone code), so they can be tested.
// Update 3 (Playbook 2): local notifications only, max 1 a day, quiet hours 9pm-9am, at the player's usual
// play time when we can choose, each one opens the right screen. Never during play (we only schedule on close).
import { NOTIF_QUIET_END, NOTIF_QUIET_START, OFFLINE_MAX_HOURS } from '../game/data';
import { GameState, dayKeyOf, passiveWoodPerSec, rushInfo } from '../game/logic';
import { canClaimLogin } from '../game/meta';

export type NotifTab = 'chop' | 'upgrades' | 'workshop' | 'market';
export type NotifPlan = { at: number; title: string; body: string; tab: NotifTab; kind: 'upgrade' | 'offline' | 'daily' | 'event' };

/** Moves a time out of quiet hours (9pm-9am) to the next 9am. */
export function outOfQuietHours(t: number) {
  const d = new Date(t);
  const h = d.getHours();
  if (h >= NOTIF_QUIET_START) return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, NOTIF_QUIET_END, 0).getTime();
  if (h < NOTIF_QUIET_END) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), NOTIF_QUIET_END, 0).getTime();
  return t;
}

/** The hour you usually play (9am-9pm only), or 6pm if we do not know yet. */
export function usualHour(s: GameState) {
  const h = s.playHours ?? [];
  let best = 18;
  let n = 0;
  for (let i = NOTIF_QUIET_END; i < NOTIF_QUIET_START; i++) if ((h[i] ?? 0) > n) [best, n] = [i, h[i]];
  return best;
}

/** Picks the one notification to send next time the app is closed. */
export function planNotification(s: GameState, now: number): NotifPlan | null {
  const options: NotifPlan[] = [];
  // 1. an upgrade (workshop build or craft) finishes
  const w = s.workshop;
  const done = [w.buildDoneAt, ...w.queue.map((c) => c.doneAt)].filter((t): t is number => !!t && t > now + 10 * 60_000);
  if (done.length) options.push({ at: Math.min(...done), title: 'Upgrade finished', body: w.buildDoneAt ? 'Your new workshop is built. Come take a look!' : 'Your furniture is ready to sell.', tab: 'workshop', kind: 'upgrade' });
  // 2. offline earnings nearly at the 8 hour cap
  if (passiveWoodPerSec(s, now) > 0) options.push({ at: now + (OFFLINE_MAX_HOURS - 0.5) * 3600_000, title: 'Your sawmill is almost full', body: 'Your crew is about to stop. Come collect what they made.', tab: 'chop', kind: 'offline' });
  // 3. event ending in 3 hours
  const r = rushInfo(s, now);
  const evAt = r.endsAt - 3 * 3600_000;
  if (r.active && evAt > now + 10 * 60_000) options.push({ at: evAt, title: 'Timber Rush ends in 3 hours', body: 'Last chance for the weekend order board.', tab: 'market', kind: 'event' });
  // 4. daily reward ready tomorrow, at your usual time
  const d = new Date(now);
  const tomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (canClaimLogin(s, now) ? 0 : 1), usualHour(s), 0).getTime();
  options.push({ at: Math.max(tomorrow, now + 60 * 60_000), title: 'Daily reward ready', body: 'Your next daily reward is waiting at the lumber yard.', tab: 'upgrades', kind: 'daily' });

  let best: NotifPlan | null = null;
  for (const o of options) {
    let at = outOfQuietHours(o.at);
    if (s.notif.lastFireDay && dayKeyOf(at) === s.notif.lastFireDay) {
      const x = new Date(at);
      at = new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1, usualHour(s), 0).getTime();
    }
    if (!best || at < best.at) best = { ...o, at };
  }
  return best;
}
