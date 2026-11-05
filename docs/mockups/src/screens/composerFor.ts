import type { ComposerState } from '../components/chat/Composer'
import { attachmentDraft, draftAttachments } from '../fixtures/attachments'
import { steerDraft } from '../fixtures/conversations'
import type { Workspace } from '../fixtures/workspaces'
import type { WorkspaceState } from './workspaceState'

const runningConversations = new Set(['running', 'steer', 'first-turn'])

/** An agent turn runs on a ready sandbox. */
export function isRunning(state: WorkspaceState): boolean {
  return (
    state.sandbox === 'ready' && runningConversations.has(state.conversation)
  )
}

/**
 * The composer of a workspace state: a steer message while a turn runs, or
 * a message with attached files, with the model picker open when the state
 * asks for it. A new session starts empty.
 */
export function composerFor(
  state: WorkspaceState,
  workspace: Workspace,
): ComposerState {
  const fresh = state.tab === 'new-session'
  const withFiles = !fresh && state.composer !== 'empty'
  let draft = ''
  if (!fresh && state.conversation === 'steer') draft = steerDraft
  else if (withFiles) draft = attachmentDraft
  return {
    choice: workspace.choice,
    running: !fresh && isRunning(state),
    draft,
    attachments: withFiles ? draftAttachments : [],
    picker: state.composer === 'picker',
  }
}
