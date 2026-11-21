// Simple popup queue for "You found a Golden Tree!" style messages.
import { useSyncExternalStore } from 'react';

export interface Popup {
  icon: string;
  title: string;
  body?: string;
}

let queue: Popup[] = [];
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());

export function showPopup(p: Popup) {
  queue = [...queue, p];
  emit();
}

export function dismissPopup() {
  queue = queue.slice(1);
  emit();
}

export function usePopup() {
  return useSyncExternalStore(
    (l) => (ls.add(l), () => ls.delete(l)),
    () => queue[0] ?? null,
    () => queue[0] ?? null,
  );
}
