import type { Readable } from '../app/store'
import type { WorkspaceIdentity } from '../app/workspace-store'
import {
  ToolStore,
  type ToolDefinition,
  type ToolSource,
} from '../terminal/tool-parts/toolStore'
import { listPreviews } from './previewsApi'
import {
  initialPreviews,
  previewsReducer,
  type PreviewsAction,
  type PreviewsState,
} from './previewsState'

interface PreviewSource extends ToolSource {
  seeded?: Readable<boolean>
}

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

/** The store of the Preview tool of one workspace. */
export class PreviewsStore extends ToolStore<PreviewsState, PreviewsAction> {
  private sawSeed = false

  constructor(workspace: WorkspaceIdentity) {
    super(previewsTool, workspace)
  }

  override connect(source: PreviewSource): () => void {
    const afterSeed = () => {
      if (this.sawSeed || !source.seeded?.get()) return
      this.sawSeed = true
      // A pre-seed list may contain revokes that the seed lets us skip.
      this.dispatch({ type: 'workspace-seeded' })
    }
    const unwatch = source.seeded?.subscribe(afterSeed)
    afterSeed()
    const stop = super.connect(source)
    return () => {
      unwatch?.()
      stop()
    }
  }
}

/** Makes the store of the Preview tool of one workspace. It starts nothing. */
export function createPreviewsStore(
  workspace: WorkspaceIdentity,
): PreviewsStore {
  return new PreviewsStore(workspace)
}
