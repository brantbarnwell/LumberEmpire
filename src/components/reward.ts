// Runs a video reward (or instant for Remove Ads) and applies it to the game.
// Playbook 3: paid when the video finishes, not when it opens (see game/adflow.ts).
import { getState, update } from '../game/store';
import { GameState } from '../game/logic';
import { adFree } from '../game/meta';
import { runAdReward } from '../game/adflow';
import { showRewardedVideo } from '../services/ads';
import { haptic } from '../services/haptics';
import { saveGame } from '../game/save';

export async function runReward(apply: (s: GameState) => GameState | null): Promise<string | null> {
  const err = await runAdReward({
    adFree: adFree(getState()),
    show: showRewardedVideo,
    canGrant: () => !!apply(getState()),
    grant: () => {
      const ok = !!update(apply);
      if (ok) saveGame(getState()); // saved at once, so closing the app right after the video keeps the reward
      return ok;
    },
  });
  if (!err) haptic.success();
  return err;
}
