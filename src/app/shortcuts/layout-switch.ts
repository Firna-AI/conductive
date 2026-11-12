import type { ShortcutChord } from '../../shared/shortcut-key'

/** Null means no switch is held. An empty list means a switch took no modifier. */
export type LayoutModifiers =
  readonly Exclude<keyof ShortcutChord, 'key'>[] | null

type Modifier = Exclude<keyof ShortcutChord, 'key'>

const physicalModifiers: Readonly<Record<string, Modifier>> = {
  ShiftLeft: 'shiftKey',
  ShiftRight: 'shiftKey',
  AltLeft: 'altKey',
  AltRight: 'altKey',
  ControlLeft: 'ctrlKey',
  ControlRight: 'ctrlKey',
  MetaLeft: 'metaKey',
  MetaRight: 'metaKey',
}

export function isLayoutSwitchKey(key: string): boolean {
  return ['GroupNext', 'GroupPrevious', 'GroupFirst', 'GroupLast'].includes(key)
}

/** The physical layout switch keys held in one window. */
export class LayoutSwitchKeys {
  private readonly held = new Map<string, Modifier | null>()

  down(press: { readonly key: string; readonly code: string }): void {
    if (isLayoutSwitchKey(press.key)) {
      this.held.set(press.code, physicalModifiers[press.code] ?? null)
    }
  }

  up(code: string): void {
    this.held.delete(code)
  }

  clear(): void {
    this.held.clear()
  }

  modifiers(): LayoutModifiers {
    if (this.held.size === 0) return null
    return [
      ...new Set(
        [...this.held.values()].filter((modifier) => modifier !== null),
      ),
    ]
  }
}
