import { serializeScene, parseScene } from '@/lib/engine/serialize'
import type { DuckElement } from '@/lib/engine/types'

const STORAGE_KEY = 'duck-whiteboard:scene'

/** Reads the persisted scene (our `.duck` format, or legacy Excalidraw JSON). */
export function loadScene(): DuckElement[] | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return parseScene(raw)
}

/** Serializes and persists the current scene. */
export function saveScene(elements: DuckElement[]) {
  localStorage.setItem(STORAGE_KEY, serializeScene(elements))
}

/** Removes the persisted scene. */
export function clearScene() {
  localStorage.removeItem(STORAGE_KEY)
}

/** Returns a debounced version of `fn` that fires `delay` ms after the last call. */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
