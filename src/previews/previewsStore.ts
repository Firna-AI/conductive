import type { WorkspaceIdentity } from '../app/workspace-store'
import {
  ToolStore,
  type ToolDefinition,
} from '../terminal/tool-parts/toolStore'
import { listPreviews } from './previewsApi'
import {
  initialPreviews,
  previewsReducer,
  type PreviewsAction,
  type PreviewsState,
} from './previewsState'

/** The store of the Preview tool of one workspace. */
export type PreviewsStore = ToolStore<PreviewsState, PreviewsAction>

/**
 * The previews, their revoke events, the reports of the listening ports, and
 * the list read. The `load` action of Try again gives the state a new read
 * number, so the list loads again. The marker of a failed repair of the
 * ports becomes an action with its time, for the age of its notice.
 */
const previewsTool: ToolDefinition<PreviewsState, PreviewsAction> = {
  reducer: previewsReducer,
  initialState: initialPreviews,
  fromEnvelope: ({ event, occurredAt }) =>
    event.type === 'runner.event-refused' &&
    event.repairFailed === true &&
    event.runnerEventType === 'ports.updated'
      ? { type: 'ports-repair-failed', at: occurredAt }
      : event,
  read: {
    key: (state) => state.read,
    run: async ({ requests, signal }) => {
      const result = await listPreviews(requests, signal)
      return result.ok
        ? { type: 'loaded', previews: result.value }
        : { type: 'load-failed', error: result.error }
    },
  },
}

/** Makes the store of the Preview tool of one workspace. It starts nothing. */
export function createPreviewsStore(
  workspace: WorkspaceIdentity,
): PreviewsStore {
  return new ToolStore(previewsTool, workspace)
}
