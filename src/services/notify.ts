// One friendly local notification at most per day, never between 9pm and 9am.
// We only ask after the first win or the first offline return, with our own pre-prompt first. Never on first launch.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { GameState } from '../game/logic';
import { planNotification } from './notify-plan';

export { planNotification };

const on = Platform.OS === 'ios' || Platform.OS === 'android';

if (on) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function askPermission(): Promise<boolean> {
  if (!on) return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const r = await Notifications.requestPermissionsAsync();
    return r.granted;
  } catch {
    return false;
  }
}

export async function scheduleFor(s: GameState, now: number): Promise<number | null> {
  if (!on || !s.notif.granted) return null;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const p = planNotification(s, now);
    if (!p) return null;
    await Notifications.scheduleNotificationAsync({
      content: { title: p.title, body: p.body, data: { tab: p.tab } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(p.at) },
    });
    return p.at;
  } catch {
    return null;
  }
}

/** Opens the screen a notification points to (when the player taps it). */
export function onNotificationTap(go: (tab: string) => void): () => void {
  if (!on) return () => {};
  Notifications.getLastNotificationResponseAsync().then((r) => {
    const tab = r?.notification.request.content.data?.tab;
    if (typeof tab === 'string') go(tab);
  }).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const tab = r.notification.request.content.data?.tab;
    if (typeof tab === 'string') go(tab);
  });
  return () => sub.remove();
}

export async function cancelAll() {
  if (!on) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
