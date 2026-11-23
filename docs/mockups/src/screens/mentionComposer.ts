import type { MentionTree } from '../components/chat/FileMentionList'
import { mentionDrafts } from '../fixtures/fileMentions'
import type { WorkspaceState } from './workspaceState'

type ComposerKey = WorkspaceState['composer']

/**
 * The tree that a state of the list of `@` reads: the tree of the
 * workspace, which is ready, a tree that still loads, or no tree.
 */
type MentionSource = 'ready' | 'loading' | 'unavailable'

/**
 * The draft and the tree of each state that opens the list of `@`: with a
 * query, without one, with no match, while the tree loads, with no tree,
 * and with a query for tsconfig.json.
 */
const mentionLists: Partial<
  Record<ComposerKey, { draft: string; source: MentionSource }>
> = {
  'mention-query': { draft: mentionDrafts.query, source: 'ready' },
  'mention-start': { draft: mentionDrafts.start, source: 'ready' },
  'mention-none': { draft: mentionDrafts.none, source: 'ready' },
  'mention-loading': { draft: mentionDrafts.query, source: 'loading' },
  'mention-unavailable': { draft: mentionDrafts.query, source: 'unavailable' },
  'mention-omitted': { draft: mentionDrafts.omitted, source: 'ready' },
}

/**
 * The list of `@` of a workspace state, if its composer opens it. A ready
 * tree is the tree of All files: the limited tree while the lists of the
 * workspace are limited, or else the latest tree.
 */
export function mentionListFor(
  state: WorkspaceState,
): { draft: string; tree: MentionTree } | undefined {
  const list = mentionLists[state.composer]
  if (!list) return undefined
  if (list.source !== 'ready') return { draft: list.draft, tree: list.source }
  const tree = state.lists === 'limited' ? 'limited' : 'latest'
  return { draft: list.draft, tree }
}
