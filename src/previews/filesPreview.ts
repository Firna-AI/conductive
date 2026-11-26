import type { Preview } from '../shared/generated/Preview'
import type { WorkspaceEvent } from '../shared/events'
import type { WorkspaceIdentity } from '../app/workspace-store'
import {
  ToolStore,
  type ToolDefinition,
} from '../terminal/tool-parts/toolStore'

/**
 * The files preview of one workspace, as the app keeps it: the preview of
 * the file server of the runner, which the tabs of HTML files show. It is
 * no port preview, so no list of the Preview tool holds it.
 */
export interface FilesPreviewState {
  /**
   * The files preview that lives, or null before an open, after its end,
   * after a failed open, and after the end of the connection of the screen.
   */
  preview: Preview | null
  /**
   * The previews that ended, by a revoke event or by an end that the app
   * saw. An open that answers later does not bring one back.
   */
  ended: ReadonlySet<string>
  /** An open runs, so no second open starts. */
  opening: boolean
  /**
   * The cloud computer runs, as the visit of the screen confirmed it: the
   * open of the visit ended, and the workspace is ready. A running period
   * lasts until the workspace leaves Ready or the visit ends. Before the
   * open of a visit ends, the screen can still show a saved state, so no
   * open starts then.
   */
  running: boolean
  /**
   * Grows at each start and each end of a running period, and at each end
   * of the connection of the screen. An open belongs to the period in which
   * it started, and its answer in a later period changes nothing.
   */
  period: number
}

type FilesPreviewAction =
  | { type: 'open' }
  | { type: 'opened'; preview: Preview; period: number }
  | { type: 'open-failed'; period: number }
  /**
   * The files preview ended with no event that names it: at its expiry, or
   * when the cloud computer stopped.
   */
  | { type: 'ended'; previewId: string }
  /**
   * A running period starts or ends, as the screen confirms it. The files
   * preview stays, so a Restart keeps the page that a tab shows, but the
   * open that runs ends.
   */
  | { type: 'running'; running: boolean }
  /**
   * The connection of the screen ended. The files preview can end while no
   * screen watches it, so the app forgets it, and the next show opens again.
   */
  | { type: 'disconnected' }

const initialFilesPreview: FilesPreviewState = {
  preview: null,
  ended: new Set(),
  opening: false,
  running: false,
  period: 0,
}

function withEnded(
  state: FilesPreviewState,
  previewId: string,
): FilesPreviewState {
  if (state.ended.has(previewId)) return state
  return {
    ...state,
    preview: state.preview?.id === previewId ? null : state.preview,
    ended: new Set(state.ended).add(previewId),
  }
}

/**
 * The actions of the opens, and the events of the workspace. A revoke of
 * the files preview, its expiry, and a stop of the cloud computer end it.
 * A revoke names any preview of the workspace, so the state keeps each
 * ended ID: an open that answers with an ended preview changes nothing.
 * A failed open forgets the files preview, as the end of the connection
 * does, but ends no ID, so the next open can answer it again. Each new
 * period ends the open that runs, and the answer of an earlier period
 * changes nothing.
 */
function filesPreviewReducer(
  state: FilesPreviewState,
  action: FilesPreviewAction | WorkspaceEvent,
): FilesPreviewState {
  switch (action.type) {
    case 'open':
      return { ...state, opening: true }
    case 'opened':
      if (action.period !== state.period) return state
      return state.ended.has(action.preview.id)
        ? { ...state, opening: false }
        : { ...state, preview: action.preview, opening: false }
    case 'open-failed':
      if (action.period !== state.period) return state
      return { ...state, preview: null, opening: false }
    case 'ended':
      return withEnded(state, action.previewId)
    case 'running':
      if (action.running === state.running) return state
      return {
        ...state,
        running: action.running,
        opening: false,
        period: state.period + 1,
      }
    case 'disconnected':
      return {
        ...state,
        preview: null,
        opening: false,
        period: state.period + 1,
      }
    case 'preview.revoked':
      return withEnded(state, action.previewId)
    default:
      // The other events of the workspace leave the files preview as it is.
      return state
  }
}

/** The store of the files preview of one workspace. */
export type FilesPreviewStore = ToolStore<FilesPreviewState, FilesPreviewAction>

/** The files preview reads no list: an open gives it, and events end it. */
const filesPreviewTool: ToolDefinition<FilesPreviewState, FilesPreviewAction> =
  {
    reducer: filesPreviewReducer,
    initialState: initialFilesPreview,
  }

/** Makes the store of the files preview of one workspace. It starts nothing. */
export function createFilesPreviewStore(
  workspace: WorkspaceIdentity,
): FilesPreviewStore {
  return new ToolStore(filesPreviewTool, workspace)
}
