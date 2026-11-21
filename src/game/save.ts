import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, newGame } from './logic';

const KEY = 'lumber-empire-save-v1';

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<GameState>;
    const base = newGame();
    // Merge so new fields added in later versions get defaults.
    return { ...base, ...saved, owned: { ...base.owned, ...(saved.owned ?? {}) } } as GameState;
  } catch {
    return null;
  }
}

export async function saveGame(s: GameState) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...s, lastSaved: Date.now() }));
  } catch {
    // Saving failed (storage full). The game keeps running and tries again in 10 seconds.
  }
}
