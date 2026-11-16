import { FIRST_TERMINAL_ID, type TerminalEntry } from '../shared/terminal'
import { byNumber, type ReadyTerminal } from './terminalApi'

/**
 * A shown terminal that closed, and the terminal that takes its place: the
 * one before it in the order of the tabs, or the first. It lasts while the
 * address or the saved view still names the closed terminal.
 */
export interface ReplacedTerminal {
  from: string
  to: string
}

/**
 * The terminals of a workspace whose terminal is ready, and what the tool
 * keeps for each of them.
 */
export interface ReadyTerminals {
  state: 'ready'
  /** The terminals, in the order of their numbers. Never empty. */
  terminals: readonly TerminalEntry[]
  /** The software of the sandbox opens more terminals: the tabs show. */
  several: boolean
  /** The terminal that showed last, as the view reports it. */
  shown: TerminalEntry | null
  /** The shown terminal that closed, while the route still names it. */
  replaced: ReplacedTerminal | null
  /** The terminals that the user showed. They stay mounted and connected. */
  opened: ReadonlySet<string>
  /** The terminals whose connection ended. Each one offers Reconnect. */
  ended: ReadonlySet<string>
  /** The connection of each terminal. Each Reconnect gives it a new one. */
  connections: ReadonlyMap<string, number>
  /** A new terminal opens. */
  opening: boolean
  /** The terminals whose close runs. */
  closing: ReadonlySet<string>
}

/** The actions of the tool on its ready terminals. */
export type ReadyTerminalsAction =
  /** The view shows a terminal for `requested`, the terminal of the route. */
  | { type: 'shown'; terminalId: string; requested: string | null }
  | { type: 'ended'; terminalId: string }
  | { type: 'reconnect'; terminalId: string }
  | { type: 'open' }
  | { type: 'opened'; terminal: TerminalEntry }
  | { type: 'open-failed' }
  | { type: 'close'; terminalId: string }
  | { type: 'closed'; terminalId: string }
  | { type: 'close-failed'; terminalId: string }

/**
 * The terminals of a ready answer. An answer of an older server has no list,
 * so its one terminal opens the socket of the answer, with no tabs.
 */
export function readyTerminals(answer: ReadyTerminal): ReadyTerminals {
  const listed = answer.terminals !== undefined
  return {
    state: 'ready',
    terminals: answer.terminals ?? [
      { id: FIRST_TERMINAL_ID, number: 1, socketPath: answer.socketPath },
    ],
    several: listed && answer.several === true,
    shown: null,
    replaced: null,
    opened: new Set(),
    ended: new Set(),
    connections: new Map(),
    opening: false,
    closing: new Set(),
  }
}

/** The terminal before a closed one in the order of the tabs, or the first. */
function terminalBefore(
  terminals: readonly TerminalEntry[],
  closed: TerminalEntry,
): TerminalEntry {
  return (
    terminals.findLast((each) => each.number < closed.number) ?? terminals[0]
  )
}

function added(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  return set.has(id) ? set : new Set(set).add(id)
}

function removed(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!set.has(id)) return set
  const next = new Set(set)
  next.delete(id)
  return next
}

/**
 * The tool with a new list, from an event or a write. It forgets each
 * terminal that left the list. When the shown terminal left, the terminal
 * before it takes its place.
 */
export function withTerminals(
  ready: ReadyTerminals,
  terminals: readonly TerminalEntry[],
): ReadyTerminals {
  const ids = new Set(terminals.map((terminal) => terminal.id))
  const listed = (set: ReadonlySet<string>) =>
    new Set([...set].filter((id) => ids.has(id)))
  const next: ReadyTerminals = {
    ...ready,
    terminals,
    opened: listed(ready.opened),
    ended: listed(ready.ended),
    connections: new Map([...ready.connections].filter(([id]) => ids.has(id))),
    closing: listed(ready.closing),
  }
  const { shown } = ready
  if (shown === null || ids.has(shown.id)) return next
  const to = terminalBefore(terminals, shown)
  // A second close keeps the closed terminal that the route still names.
  const from = ready.replaced?.from ?? shown.id
  return { ...next, shown: to, replaced: { from, to: to.id } }
}

/**
 * The actions of the tool on its terminals. An open adds the new terminal
 * at once, and a close removes its terminal at once, so the tool shows the
 * result before the event of the change. The event then gives the list.
 */
export function readyReducer(
  ready: ReadyTerminals,
  action: ReadyTerminalsAction,
): ReadyTerminals {
  switch (action.type) {
    case 'shown': {
      const shown = ready.terminals.find(
        (each) => each.id === action.terminalId,
      )
      if (!shown) return ready
      const opened = added(ready.opened, shown.id)
      const replaced =
        ready.replaced?.from === action.requested ? ready.replaced : null
      const same =
        shown.id === ready.shown?.id &&
        opened === ready.opened &&
        replaced === ready.replaced
      return same ? ready : { ...ready, shown, opened, replaced }
    }
    case 'ended': {
      // The socket of a closed terminal can end after it left the list.
      // That end changes nothing.
      const { terminalId } = action
      if (!ready.terminals.some((each) => each.id === terminalId)) return ready
      const ended = added(ready.ended, terminalId)
      return ended === ready.ended ? ready : { ...ready, ended }
    }
    case 'reconnect': {
      const { terminalId } = action
      const connections = new Map(ready.connections)
      connections.set(terminalId, (connections.get(terminalId) ?? 0) + 1)
      return { ...ready, ended: removed(ready.ended, terminalId), connections }
    }
    case 'open':
      return ready.opening ? ready : { ...ready, opening: true }
    case 'opened': {
      const { terminal } = action
      const known = ready.terminals.some((each) => each.id === terminal.id)
      const next = { ...ready, opening: false }
      return known
        ? next
        : withTerminals(next, [...ready.terminals, terminal].sort(byNumber))
    }
    case 'open-failed':
      return { ...ready, opening: false }
    case 'close': {
      const closing = added(ready.closing, action.terminalId)
      return closing === ready.closing ? ready : { ...ready, closing }
    }
    case 'closed': {
      const rest = ready.terminals.filter(
        (each) => each.id !== action.terminalId,
      )
      const next = {
        ...ready,
        closing: removed(ready.closing, action.terminalId),
      }
      // The last terminal never closes, so an empty list waits for the event.
      return rest.length === 0 ? next : withTerminals(next, rest)
    }
    case 'close-failed':
      return { ...ready, closing: removed(ready.closing, action.terminalId) }
  }
}
