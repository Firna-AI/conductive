import { useMemo, useSyncExternalStore } from 'react'
import {
  mergeLatestLabel,
  mergeLatestPrompt,
  mergeLatestRebasePrompt,
} from '../../../ui/components/workspace/mergeLatestCopy'
import { baseBranchLabel } from '../../../github/bannerStatus'
import type { BarActions } from '../../../github/barActions'
import { queuedRebase } from '../../../github/barPrompts'
import { offersAgentActions } from '../../../github/barView'
import type { GitHubFeed } from '../../../github/githubStore'
import type { WorkspaceContext } from '../features'
import { useShowChat } from './bar-controls'

/** Merge latest of the open workspace: the label of its row, and its run. */
export interface MergeLatest {
  /** Names the label of the target branch, such as "Merge latest main". */
  readonly label: string
  readonly run: () => void
}

/**
 * Merge latest of the open workspace, for the palette, or null while the
 * page cannot offer it. It sends its fixed prompt through the store of the
 * bar actions, as an agent action of the bar does, so one prompt sends at
 * a time (merge latest decision 1 A). It needs the target branch from the
 * GitHub state of the branch, and the access that offers the agent
 * actions. A read-only workspace and a merged pull request offer none: a
 * merged branch continues from the target branch. While the workspace is
 * in the merge queue, its prompt asks for a rebase in place of a merge. A
 * prompt that did not go
 * out shows the chat, where the composer names the cause, while the
 * connection of the press stays connected.
 */
export function useMergeLatest(
  context: WorkspaceContext,
  github: GitHubFeed,
  actions: BarActions,
): MergeLatest | null {
  const shown = useSyncExternalStore(actions.subscribe, actions.getSnapshot)
  const showChat = useShowChat(context)
  const { readOnly } = context
  const { state } = github
  return useMemo(() => {
    if (readOnly || state.status !== 'ready') return null
    const { banner, queue } = state.snapshot
    if (banner.state === 'merged') return null
    if (!offersAgentActions(shown.capabilities)) return null
    const rebase = queue ? queuedRebase(queue) : null
    return {
      label: mergeLatestLabel(
        queue
          ? (rebase?.label?.text ?? 'the queue base')
          : baseBranchLabel(banner),
      ),
      run: () => {
        void actions
          .sendPrompt(({ state, queue }) =>
            queue
              ? mergeLatestRebasePrompt(queuedRebase(queue))
              : mergeLatestPrompt(
                  state?.banner.baseBranch ?? banner.baseBranch,
                ),
          )
          .then((result) => {
            if (result !== null && result !== 'sent') showChat()
          })
      },
    }
  }, [readOnly, state, shown.capabilities, actions, showChat])
}
