import {
  FIRST_TERMINAL_ID,
  terminalPaths,
  type TerminalResponse,
} from '../../shared/terminal'
import { FAKE_IDS } from './core'

export function fakeTerminalEntry(
  orgId: string,
  workspaceId: string,
  id: string,
  number: number,
) {
  return {
    id,
    number,
    socketPath: terminalPaths.terminalSocket(orgId, workspaceId, id),
  }
}

export function fakeTerminalState(
  orgId: string = FAKE_IDS.org,
  workspaceId: string = FAKE_IDS.workspace,
  several = true,
) {
  return {
    state: 'ready',
    socketPath: terminalPaths.socket(orgId, workspaceId),
    protocol: 'tty',
    terminals: [fakeTerminalEntry(orgId, workspaceId, FIRST_TERMINAL_ID, 1)],
    several,
  } satisfies TerminalResponse
}
