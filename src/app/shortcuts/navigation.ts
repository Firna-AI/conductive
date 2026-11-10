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

export type DividerKey =
  'left' | 'right' | 'large-left' | 'large-right' | 'first' | 'last'

export function dividerKey(press: ShortcutPress): DividerKey | null {
  const keys = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    'Shift+ArrowLeft': 'large-left',
    'Shift+ArrowRight': 'large-right',
    Home: 'first',
    End: 'last',
  } as const
  return (
    Object.entries(keys).find(([key]) => matchesControlKey(key, press))?.[1] ??
    null
  )
}
