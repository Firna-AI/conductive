import { act } from 'react'
import { expect } from 'vitest'
import {
  FIRST_TERMINAL_ID,
  terminalPaths,
  type CreateTerminalResponse,
  type TerminalEntry,
} from '../../../shared/terminal'
import { accessibleName, byLabel } from '../../../test-support/dom-queries'
import type { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'

// The helpers of the tests of the terminal tabs over the fake API.

const { org, workspace } = FAKE_IDS

/** Terminal 1, which each new workspace has. */
export const firstTerminal: TerminalEntry = {
  id: FIRST_TERMINAL_ID,
  number: 1,
  socketPath: terminalPaths.terminalSocket(org, workspace, FIRST_TERMINAL_ID),
}

/** The message of a failed write, as the server sends it. */
export const failure = {
  error: {
    code: 'sandbox_unavailable',
    message: 'The cloud computer did not answer. Try again.',
  },
}

function write(method: 'POST' | 'DELETE'): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }
}

/**
 * Opens terminals in the fake API before the app shows them, and gives them
 * in their order.
 */
export async function openTerminals(
  server: FakeApiServer,
  count: number,
): Promise<TerminalEntry[]> {
  const opened: TerminalEntry[] = []
  for (let made = 0; made < count; made += 1) {
    const path = terminalPaths.terminals(org, workspace)
    const response = await server.fetch(path, write('POST'))
    const body: CreateTerminalResponse = await response.json()
    opened.push(body.terminal)
  }
  return opened
}

/** Closes a terminal in the fake API, as another member does. */
export async function closeElsewhere(
  server: FakeApiServer,
  terminal: TerminalEntry,
): Promise<void> {
  await act(async () => {
    const path = terminalPaths.terminal(org, workspace, terminal.id)
    const response = await server.fetch(path, write('DELETE'))
    expect(response.status).toBe(200)
  })
}

/** The name of each terminal tab, and the name of the shown one. */
export function terminalTabs(view: HTMLElement) {
  const row = byLabel('Terminals', view)
  const links = Array.from(row.querySelectorAll('a'))
  return {
    names: links.map(accessibleName),
    shown: links
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map(accessibleName),
  }
}
