// Runs a video reward (or instant for VIP / Remove Ads) and applies it to the game.
import { getState, update } from '../game/store';
import { GameState } from '../game/logic';
import { adFree } from '../game/meta';
import { earnReward } from '../services/ads';
import { haptic } from '../services/haptics';

export async function runReward(apply: (s: GameState) => GameState | null): Promise<string | null> {
  if (!apply(getState())) return 'Not available right now.';
  const r = await earnReward(adFree(getState()));
  if (!r.ok) return r.message;
  if (!update(apply)) return 'Not available right now.';
  haptic.success();
  return null;
}
