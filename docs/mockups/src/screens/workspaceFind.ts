import type { FindState } from '../components/find/findMarks'
import { replacesLists } from '../components/workspace/sandboxNoticeState'
import { foundViews, unmatchedQuery, type FindTab } from '../fixtures/findViews'
import { panelState } from './workspaceSandbox'
import type { WorkspaceState } from './workspaceState'

/**
 * The tab of the state whose text the find bar searches: the first
 * session, or a code file, a Markdown preview, or a diff whose text the
 * page shows. A new session, a picture, a file that did not open, and a
 * file whose place the sandbox state takes offer no Find. The diff of the
 * masked paths has no find view.
 */
function findTabOf(state: WorkspaceState): FindTab | undefined {
  switch (state.tab) {
    case 'session':
      return 'chat'
    case 'code':
    case 'markdown':
    case 'diff': {
      const panel = panelState(state)
      if (panel && replacesLists(panel)) return undefined
      return state.paths === 'masked' ? undefined : state.tab
    }
    default:
      return undefined
  }
}

/**
 * The find bar over the shown tab, when the state opens it there: over the
 * chat of the session, or over a file page. A tab without text offers no
 * Find, so it has no bar.
 */
export function findFor(
  state: WorkspaceState,
  place: 'chat' | 'file',
): FindState | undefined {
  const tab = findTabOf(state)
  if (tab === undefined || (tab === 'chat') !== (place === 'chat')) {
    return undefined
  }
  switch (state.find) {
    case 'closed':
      return undefined
    case 'found':
      return foundViews[tab]
    case 'empty':
      return { query: '' }
    case 'no-match':
      return { query: unmatchedQuery, count: { place: 0, total: 0 } }
  }
}
