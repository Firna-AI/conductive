import {
  shortcutDigits,
  type ShortcutCommandId,
} from '../../shared/shortcut-commands'
import { matchesControlKey, type ShortcutPress } from './keys'

/** Returns no item when the current item is absent from the shown list. */
export function stepShortcutItem<T>(
  shown: readonly T[],
  current: T,
  direction: -1 | 1,
): T | undefined {
  const at = shown.indexOf(current)
  return at < 0
    ? undefined
    : shown[(at + direction + shown.length) % shown.length]
}

export interface ShortcutWorkspace {
  readonly id: string
  readonly needsInput: boolean
}

/**
 * The caller supplies visible rows, after collapsed sections and groups hide.
 * Next workspace that needs input starts from the top of the list when no
 * shown row is open, such as on the list page.
 */
export function workspaceForShortcut(
  command: ShortcutCommandId,
  shown: readonly ShortcutWorkspace[],
  currentId: string,
): string | undefined {
  const numbered = shortcutDigits.findIndex(
    (digit) => command === `workspace-${digit}`,
  )
  if (numbered >= 0) return shown[numbered]?.id
  const current = shown.find((workspace) => workspace.id === currentId)
  if (!current) {
    return command === 'next-needs-input'
      ? shown.find((workspace) => workspace.needsInput)?.id
      : undefined
  }
  if (command === 'previous-workspace' || command === 'next-workspace') {
    return stepShortcutItem(
      shown,
      current,
      command === 'previous-workspace' ? -1 : 1,
    )?.id
  }
  if (command === 'next-needs-input') {
    let next = current
    for (let count = 0; count < shown.length; count += 1) {
      next = stepShortcutItem(shown, next, 1) ?? current
      if (next.needsInput) return next.id
    }
  }
  return undefined
}

export function orgForShortcut(
  command: ShortcutCommandId,
  shown: readonly string[],
): string | undefined {
  const index = shortcutDigits.findIndex((digit) => command === `org-${digit}`)
  return shown[index]
}

export function workspaceRowMove(press: ShortcutPress): 'up' | 'down' | null {
  if (matchesControlKey('Alt+ArrowUp', press)) return 'up'
  if (matchesControlKey('Alt+ArrowDown', press)) return 'down'
  return null
}

/**
 * The keys of a focused divider. `back` moves it left, or up for a divider
 * that lies across, and `forward` moves it right, or down. `first` and
 * `last` move it to the ends of the range of its panel.
 */
export type DividerKey =
  'back' | 'forward' | 'large-back' | 'large-forward' | 'first' | 'last'

/**
 * The key of a divider that stands up, between columns, with Left and
 * Right, or of a divider that lies across, between parts of a column, with
 * Up and Down.
 */
export function dividerKey(
  press: ShortcutPress,
  orientation: 'vertical' | 'horizontal' = 'vertical',
): DividerKey | null {
  const [back, forward] =
    orientation === 'vertical'
      ? ['ArrowLeft', 'ArrowRight']
      : ['ArrowUp', 'ArrowDown']
  const keys: readonly (readonly [string, DividerKey])[] = [
    [back, 'back'],
    [forward, 'forward'],
    [`Shift+${back}`, 'large-back'],
    [`Shift+${forward}`, 'large-forward'],
    ['Home', 'first'],
    ['End', 'last'],
  ]
  return keys.find(([key]) => matchesControlKey(key, press))?.[1] ?? null
}
