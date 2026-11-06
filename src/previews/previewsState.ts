import type { Preview } from '../shared/previews'
import type { ToolError } from '../terminal/tool-parts/request'

export interface PreviewsState {
  load: { state: 'loading' } | { state: 'failed'; error: ToolError } | null
  previews: readonly Preview[]
  /** Revoked previews stay hidden, also when a later list still has them. */
  revoked: ReadonlySet<string>
  opening: boolean
  openError: ToolError | null
  closing: ReadonlySet<string>
  closeError: { previewId: string; error: ToolError } | null
  /** Each reload of the frame increases it, so the frame loads again. */
  reloads: number
}

export type PreviewsAction =
  | { type: 'load' }
  | { type: 'loaded'; previews: readonly Preview[] }
  | { type: 'load-failed'; error: ToolError }
  | { type: 'open' }
  | { type: 'opened'; preview: Preview }
  | { type: 'open-failed'; error: ToolError }
  | { type: 'close'; previewId: string }
  | { type: 'closed'; previewId: string }
  | { type: 'close-failed'; previewId: string; error: ToolError }
  | { type: 'revoked'; previewId: string }
  | { type: 'reload' }

export const initialPreviews: PreviewsState = {
  load: { state: 'loading' },
  previews: [],
  revoked: new Set(),
  opening: false,
  openError: null,
  closing: new Set(),
  closeError: null,
  reloads: 0,
}

/** The previews that the tool shows, in the order of their tabs. */
export function visiblePreviews(state: PreviewsState): readonly Preview[] {
  return state.previews.filter((preview) => !state.revoked.has(preview.id))
}

/**
 * The preview in the frame: the one that the address names, or the first
 * tab when the address names none, or a preview that is gone.
 */
export function selectedPreview(
  visible: readonly Preview[],
  routeId: string | null,
): Preview | null {
  return visible.find((preview) => preview.id === routeId) ?? visible[0] ?? null
}

function without<T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> {
  const next = new Set(set)
  next.delete(value)
  return next
}

function remove(state: PreviewsState, previewId: string): PreviewsState {
  return {
    ...state,
    previews: state.previews.filter((preview) => preview.id !== previewId),
    closing: without(state.closing, previewId),
    closeError:
      state.closeError?.previewId === previewId ? null : state.closeError,
  }
}

export function previewsReducer(
  state: PreviewsState,
  action: PreviewsAction,
): PreviewsState {
  switch (action.type) {
    case 'load':
      return { ...state, load: { state: 'loading' } }
    case 'loaded':
      return { ...state, load: null, previews: action.previews }
    case 'load-failed':
      return { ...state, load: { state: 'failed', error: action.error } }
    case 'open':
      return { ...state, opening: true, openError: null }
    case 'opened': {
      const others = state.previews.filter(
        (preview) => preview.id !== action.preview.id,
      )
      return { ...state, previews: [...others, action.preview], opening: false }
    }
    case 'open-failed':
      return { ...state, opening: false, openError: action.error }
    case 'close': {
      const closing = new Set(state.closing).add(action.previewId)
      return { ...state, closing, closeError: null }
    }
    case 'closed':
      return remove(state, action.previewId)
    case 'close-failed':
      return {
        ...state,
        closing: without(state.closing, action.previewId),
        closeError: { previewId: action.previewId, error: action.error },
      }
    case 'revoked':
      return {
        ...remove(state, action.previewId),
        revoked: new Set(state.revoked).add(action.previewId),
      }
    case 'reload':
      return { ...state, reloads: state.reloads + 1 }
  }
}
