import { cloudComputerSilent } from '../../../docs/mockups/src/fixtures/terminals'
import { terminalPaths } from '../../shared/terminal'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { parseTerminalList } from '../terminalApi'

/** The terminals that a terminal state has besides Terminal 1. */
export const openedTerminals: Readonly<Record<string, number>> = {
  several: 2,
  limit: 9,
  failing: 2,
}

/** The answer of each open and close of a terminal in the `failing` state. */
export const failedTerminalWrite = {
  error: { code: 'sandbox_unavailable', message: cloudComputerSilent },
}

const org = FAKE_IDS.org
const workspace = FAKE_IDS.workspace

/** A request of the terminal routes of the fake API, which answer at once. */
function terminalRequest(
  server: FakeApiServer,
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
): Response | null {
  return server.terminals.fetch(
    new Request(new URL(path, FAKE_ORIGIN), { method }),
  )
}

/** Opens a terminal in the fake API, as another member of the workspace. */
export function openDevTerminal(server: FakeApiServer): void {
  terminalRequest(server, terminalPaths.terminals(org, workspace), 'POST')
}

/**
 * Closes a terminal in the fake API, as another member of the workspace:
 * `terminalId` when the list has it, else the first terminal. The fake
 * refuses the close of the last terminal.
 */
export async function closeDevTerminal(
  server: FakeApiServer,
  terminalId: string | null,
): Promise<void> {
  const state = terminalRequest(
    server,
    terminalPaths.connection(org, workspace),
    'GET',
  )
  const body: unknown = await state?.json()
  const terminals =
    typeof body === 'object' && body !== null && 'terminals' in body
      ? parseTerminalList(body.terminals)
      : null
  if (!terminals) return
  const target =
    terminals.find((terminal) => terminal.id === terminalId) ?? terminals[0]
  terminalRequest(
    server,
    terminalPaths.terminal(org, workspace, target.id),
    'DELETE',
  )
}
