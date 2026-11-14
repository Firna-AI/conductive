/**
 * The terminals of the open workspace, from decisions 1 and 2 of the
 * terminal tabs change: a row of terminal tabs in the Terminal tool, with
 * up to 10 terminals that the members of the workspace share.
 */

import {
  testSession,
  workspacePrompt,
  workspaceSession,
  type TerminalLine,
} from './terminal'

/**
 * The terminals of the Terminal tool:
 * - `one`: the one terminal that a workspace starts with, Terminal 1, with
 *   the dev server.
 * - `several`: three terminals, with the test run of Terminal 2 shown.
 * - `limit`: ten terminals, the limit, with a new Terminal 10 shown.
 * - `disconnected`: the three terminals, and the connection of the shown
 *   terminal ended.
 * - `older`: a workspace whose cloud computer software opens one terminal
 *   only, so the tool shows no row of tabs.
 * - `shared-larger`: another viewer with a larger panel set the shared size
 *   of the shown terminal, so the text is smaller.
 * - `shared-smaller`: another viewer with a smaller panel set the shared
 *   size, so empty space follows the screen.
 */
export const terminalStates = [
  'one',
  'several',
  'limit',
  'disconnected',
  'older',
  'shared-larger',
  'shared-smaller',
] as const

export type TerminalState = (typeof terminalStates)[number]

/**
 * The terminals of a state: the number of each, in the order of the row,
 * the number of the shown terminal, and what the shown terminal shows. A
 * prompt draws the cursor after it.
 */
export type TerminalSet = {
  numbers: readonly number[]
  shown: number
  lines: readonly TerminalLine[]
  prompt?: string
  shared?: SharedSize
}

/**
 * How the shared size of a terminal compares with the panel of this viewer.
 * All viewers of a terminal share one size, which the viewer where the user
 * last typed or resized sets.
 */
export type SharedSize = 'larger' | 'smaller'

const three = [1, 2, 3] as const

/** The terminals at the limit: Terminal 1 to Terminal 10. */
const terminalLimit = 10

export const terminalSets: Readonly<Record<TerminalState, TerminalSet>> = {
  one: { numbers: [1], shown: 1, lines: workspaceSession },
  several: {
    numbers: three,
    shown: 2,
    lines: testSession,
    prompt: workspacePrompt,
  },
  limit: {
    numbers: Array.from({ length: terminalLimit }, (_, index) => index + 1),
    shown: terminalLimit,
    lines: [],
    prompt: workspacePrompt,
  },
  disconnected: { numbers: three, shown: 2, lines: testSession },
  older: { numbers: [1], shown: 1, lines: workspaceSession },
  'shared-larger': {
    numbers: three,
    shown: 1,
    lines: workspaceSession,
    shared: 'larger',
  },
  'shared-smaller': {
    numbers: three,
    shown: 1,
    lines: workspaceSession,
    shared: 'smaller',
  },
}

/** The words of a close of the shown terminal of `several`. */
export const closedTerminal = 'Terminal 2'

/**
 * The message of the server when the cloud computer does not answer, as a
 * failed open or close of a terminal shows it.
 */
export const cloudComputerSilent =
  'The cloud computer did not answer. Try again.'
