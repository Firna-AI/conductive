import type { TerminalEntry } from '../shared/terminal'
import type { ReplacedTerminal } from './readyTerminals'

/**
 * The shell's part of the shown terminal: the terminal of the address and
 * of the saved view, the address of each tab, and the show of a terminal.
 */
export interface TerminalRoute {
  /** The terminal that the address names, or null for an address without one. */
  terminalId: string | null
  /** The terminal of the saved view, or the one that the user showed last. */
  saved: string | null
  /** The address of the tab of one terminal. */
  href: (terminalId: string) => string
  /**
   * Shows one terminal: the shell saves it in the view, and moves the address
   * where the address follows the terminals. `push` adds an entry to the
   * history of the browser, as a press on a tab does. `replace` takes the
   * place of the current entry, as after a close of the shown terminal.
   */
  show: (terminalId: string, entry: 'push' | 'replace') => void
}

/** The terminal that the tool shows for its route. */
export interface ShownTerminal {
  terminal: TerminalEntry
  /** The terminal that the route asks for: of the address, else of the view. */
  requested: string | null
  /**
   * The route needs this terminal in its place: the shown terminal closed,
   * or the saved view lacks the terminal of the address.
   */
  follow: boolean
}

/**
 * The terminal that shows when the address names a terminal that is not in
 * the list, such as the address of a terminal that closed earlier.
 *
 * TODO(terminal tabs): the user has not yet chosen what this case shows.
 * The options are A, the saved terminal or the first, as for an address
 * without a terminal; B, always the first; C, the first with a notice.
 * Until the answer, this function gives the first terminal, as for any
 * terminal that is not in the list. The tool then saves nothing and moves
 * no address, so the answer can still change both.
 */
export function unlistedAddressTerminal(
  terminals: readonly TerminalEntry[],
): TerminalEntry {
  return terminals[0]
}

/**
 * The terminal of the route: the terminal of the address, else of the saved
 * view. A shown terminal that closed gives its place to the terminal before
 * it. A saved terminal that is not in the list shows the first terminal.
 */
export function shownTerminal(
  terminals: readonly TerminalEntry[],
  replaced: ReplacedTerminal | null,
  route: Pick<TerminalRoute, 'terminalId' | 'saved'>,
): ShownTerminal {
  const listed = (id: string | null) =>
    id === null ? undefined : terminals.find((each) => each.id === id)
  const requested = route.terminalId ?? route.saved
  const named = listed(requested)
  if (named) {
    // The saved view keeps the terminal that the address shows.
    return { terminal: named, requested, follow: named.id !== route.saved }
  }
  if (replaced !== null && replaced.from === requested) {
    const terminal = listed(replaced.to) ?? terminals[0]
    return { terminal, requested, follow: true }
  }
  const terminal =
    route.terminalId === null
      ? terminals[0]
      : unlistedAddressTerminal(terminals)
  return { terminal, requested, follow: false }
}
