import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type RefCallback,
} from 'react'
import {
  firstShortcutKey,
  type ShortcutKeymap,
} from '../../app/shortcuts/keymap'
import { useServices } from '../../app/services'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import type { ShortcutKeyText } from '../../shared/shortcut-key'
import type { LayerOwner } from '../ui/layers'
import type { ShortcutOffers } from './shortcut-offers'

/** The shortcut layer of the tab, as `ShortcutProvider` gives it. */
export interface ShortcutLayer {
  readonly offers: ShortcutOffers
  /** The elements of the terminals, which keep the keys that a shell reads. */
  readonly terminals: Set<HTMLElement>
  /** The keys of each command for the keyboard of the person. */
  readonly keymap: ShortcutKeymap
}

export const ShortcutContext = createContext<ShortcutLayer | null>(null)

/**
 * Offers a command to the keys while the part of the page shows. `null`
 * offers nothing. A key runs the `run` of the latest render, so a new
 * render offers again only when the command or its layer changes. `layer`
 * is the owner of the dialog or the sheet that the command opens.
 */
export function useShortcutOffer(
  command: ShortcutCommandId,
  run: (() => void) | null,
  layer?: LayerOwner,
): void {
  const offers = useContext(ShortcutContext)?.offers
  const latest = useRef(run)
  useEffect(() => {
    latest.current = run
  })
  const offered = run !== null
  useEffect(() => {
    if (!offers || !offered) return undefined
    return offers.offer({ command, layer, run: () => latest.current?.() })
  }, [offers, command, layer, offered])
}

/**
 * The ref of the element of a terminal, which its owner gives. A key in
 * that element goes to the terminal when a program in it can read the key,
 * as the shortcut model says for each keyboard.
 */
export function useShortcutTerminal(): RefCallback<HTMLElement> {
  const terminals = useContext(ShortcutContext)?.terminals
  return useCallback(
    (element: HTMLElement | null) => {
      if (!element || !terminals) return undefined
      terminals.add(element)
      return () => {
        terminals.delete(element)
      }
    },
    [terminals],
  )
}

/** The first key of the command that works where the page runs, or none. */
export function useShortcutKey(
  command: ShortcutCommandId,
): ShortcutKeyText | undefined {
  const shortcuts = useContext(ShortcutContext)
  const { platform, host } = useServices()
  if (!shortcuts) return undefined
  return firstShortcutKey(command, shortcuts.keymap, platform, host)
}
