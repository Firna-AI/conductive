import type { WorkspaceIdentity } from '../app/workspace-store'
import type { WorkspaceEvent, WorkspaceEventEnvelope } from '../shared/events'
import { byNumber, loadTerminal } from './terminalApi'
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
 * The action of one event of the workspace. A list of the terminals keeps
 * the number of its event, so the tool orders it against its read and the
 * replies of its writes. So does `several`, which a Restart can change.
 */
function fromEnvelope(
  envelope: WorkspaceEventEnvelope,
): TerminalReadinessAction | WorkspaceEvent {
  const { event } = envelope
  if (event.type !== 'terminals.updated') return event
  const terminals = [...event.terminals].sort(byNumber)
  const { eventNumber } = envelope
  return event.several === undefined
    ? { type: 'listed', terminals, eventNumber }
    : { type: 'listed', terminals, eventNumber, several: event.several }
}

/**
 * The readiness of the terminals, their events, and their read. Each read
 * number of the state reads the terminal state once, so Try again, a running
 * sandbox, and a change of the list during a read start a new read.
 */
const terminalTool: ToolDefinition<TerminalReadiness, TerminalReadinessAction> =
  {
    reducer: readinessReducer,
    initialState: initialReadiness,
    fromEnvelope,
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
