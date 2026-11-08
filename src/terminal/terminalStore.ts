import type { WorkspaceIdentity } from '../app/workspace-store'
import { loadTerminal } from './terminalApi'
import {
  initialReadiness,
  readinessReducer,
  type TerminalReadiness,
  type TerminalReadinessAction,
} from './terminalReadiness'
import { ToolStore, type ToolDefinition } from './tool-parts/toolStore'

/** The store of the Terminal tool of one workspace. */
export type TerminalStore = ToolStore<
  TerminalReadiness,
  TerminalReadinessAction
>

/**
 * The readiness of the terminal, its events, and its read. Each read number of
 * the state reads the terminal state once, so Try again, Reconnect, and a
 * running sandbox start a new read.
 */
const terminalTool: ToolDefinition<TerminalReadiness, TerminalReadinessAction> =
  {
    reducer: readinessReducer,
    initialState: initialReadiness,
    read: {
      key: (state) => state.read,
      run: async ({ requests, key, signal }) => ({
        type: 'answer',
        read: key,
        result: await loadTerminal(requests, signal),
      }),
    },
  }

/** Makes the store of the Terminal tool of one workspace. It starts nothing. */
export function createTerminalStore(
  workspace: WorkspaceIdentity,
): TerminalStore {
  return new ToolStore(terminalTool, workspace)
}
