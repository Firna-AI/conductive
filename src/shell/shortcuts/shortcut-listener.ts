import {
  decideShortcut,
  type ShortcutContext,
} from '../../app/shortcuts/decision'
import type { ShortcutHost } from '../../app/shortcuts/host'
import type { ShortcutKeymap } from '../../app/shortcuts/keymap'
import type { ShortcutFocus } from '../../app/shortcuts/text-keys'
import type { KeyPress } from '../../app/services'
import type { ShortcutKeyboard } from '../../shared/shortcut-key'
import type { OpenLayers } from '../ui/layers'
import type { ShortcutOffers } from './shortcut-offers'

/** What the listener reads of the page at each press. */
export interface ShortcutPage {
  readonly keyboard: ShortcutKeyboard
  readonly host: ShortcutHost
  readonly keymap: ShortcutKeymap
  readonly offers: ShortcutOffers
  /** The elements of the terminals, as their owners mark them. */
  readonly terminals: ReadonlySet<HTMLElement>
  readonly layers: OpenLayers
}

/** The types of an input where a person types one line of text. */
const lineTypes: ReadonlySet<string> = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
])

/**
 * Where the press comes from: a terminal, a text field, or the rest of the
 * page. The page never hears a key of a port preview or the live desktop,
 * because their frames come from another origin.
 */
function focusOf(
  target: EventTarget | null,
  terminals: ReadonlySet<HTMLElement>,
): ShortcutFocus {
  if (!(target instanceof Node)) return 'page'
  if ([...terminals].some((terminal) => terminal.contains(target))) {
    return 'terminal'
  }
  if (target instanceof HTMLTextAreaElement) return 'text'
  if (target instanceof HTMLInputElement) {
    return lineTypes.has(target.type) ? 'single-line-text' : 'page'
  }
  return target instanceof HTMLElement && target.isContentEditable
    ? 'text'
    : 'page'
}

/**
 * The offered commands, and the command that owns the open dialog or sheet.
 * While a layer of another owner is open, the page under it takes no input,
 * so it offers nothing, and the layer keeps every key.
 */
function offersOf(
  page: ShortcutPage,
): Pick<ShortcutContext, 'offered' | 'modal'> {
  const offered = page.offers.commands()
  if (!page.layers.modalOpen()) return { offered, modal: null }
  const owner = page.offers.layerCommand(page.layers)
  return owner === null
    ? { offered: new Set(), modal: null }
    : { offered, modal: owner }
}

/**
 * Decides one press with the shortcut model. Before a key runs a command,
 * every open menu closes, and a menu that refuses keeps the key. A key that
 * runs a command goes no further: the browser's own action does not run,
 * and no element of the page hears it. Every other press goes on untouched.
 */
export function handleShortcutPress(press: KeyPress, page: ShortcutPage): void {
  const decision = decideShortcut({
    press,
    keyboard: page.keyboard,
    host: page.host,
    keymap: page.keymap,
    ...offersOf(page),
    focus: focusOf(press.target, page.terminals),
    // The app has no recorder of keys yet.
    recording: false,
    menu: page.layers.menuOpen() ? 'closable' : 'closed',
  })
  if (decision.kind === 'pass') return
  if (decision.closeMenu && !page.layers.closeMenus()) return
  press.preventDefault()
  press.stopPropagation()
  page.offers.run(decision.command)
}
