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
import { ServicesContext } from '../../app/services'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import type { ShortcutKeyText } from '../../shared/shortcut-key'
import type { LayerOwner } from '../ui/layers'
import type { ShortcutOffers } from './shortcut-offers'

/** The shortcut layer of the tab, as `ShortcutProvider` gives it. */
export interface ShortcutLayer {
  readonly offers: ShortcutOffers
  /** The elements of the terminals, which keep the keys that a shell reads. */
  readonly terminals: Set<HTMLElement>
  /** The recorders of the Keyboard shortcuts tab that wait for a key. */
  readonly recorders: Set<HTMLElement>
  /** The keys of each command for the keyboard of the person, with their changes. */
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

/** A command that a part of the page offers, with what its key does. */
export interface CommandOffer {
  readonly command: ShortcutCommandId
  readonly run: () => void
}

/**
 * Offers each command of the list to the keys while the part of the page
 * shows, such as one command for each row of a list. A key runs the `run`
 * of the latest render, so a new render offers again only when the list of
 * commands changes.
 */
export function useShortcutOffers(list: readonly CommandOffer[]): void {
  const offers = useContext(ShortcutContext)?.offers
  const latest = useRef(list)
  useEffect(() => {
    latest.current = list
  })
  const commands = list.map((item) => item.command).join(' ')
  useEffect(() => {
    if (!offers) return undefined
    const runOf = (command: ShortcutCommandId) => () =>
      latest.current.find((item) => item.command === command)?.run()
    const taken = latest.current.map(({ command }) =>
      offers.offer({ command, run: runOf(command) }),
    )
    return () => taken.forEach((takeBack) => takeBack())
  }, [offers, commands])
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

/**
 * The ref of the recorder of the Keyboard shortcuts tab, which waits for a
 * key while it shows. No key runs a command meanwhile, so the recorder
 * hears each key that the page gets.
 */
export function useShortcutRecorder(): RefCallback<HTMLElement> {
  const recorders = useContext(ShortcutContext)?.recorders
  return useCallback(
    (element: HTMLElement | null) => {
      if (!element || !recorders) return undefined
      recorders.add(element)
      return () => {
        recorders.delete(element)
      }
    },
    [recorders],
  )
}

/**
 * The keys of each command for the keyboard of the person, with the
 * changes of the account, as the keys and the hints use them.
 */
export function useShortcutKeymap(): ShortcutKeymap {
  const layer = useContext(ShortcutContext)
  if (!layer) throw new Error('The app has no shortcut layer.')
  return layer.keymap
}

/**
 * The first key of the command that works where the page runs, or none. A
 * part outside the app, such as the chat on its development page, has no
 * keymap, so it gets no key.
 */
export function useShortcutKey(
  command: ShortcutCommandId | undefined,
): ShortcutKeyText | undefined {
  const shortcuts = useContext(ShortcutContext)
  const services = useContext(ServicesContext)
  if (!shortcuts || !services || command === undefined) return undefined
  return firstShortcutKey(
    command,
    shortcuts.keymap,
    services.platform,
    services.host,
  )
}
