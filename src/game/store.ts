// Tiny global game store. Components read it with useGame().
import { useSyncExternalStore } from 'react';
import { GameState, newGame } from './logic';

let state: GameState = newGame();
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(next: GameState) {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
}

/** Runs fn on the current state. If fn returns null nothing changes. */
export function update(fn: (s: GameState) => GameState | null) {
  const next = fn(state);
  if (next) setState(next);
  return next !== null;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useGame() {
  return useSyncExternalStore(subscribe, getState, getState);
}
