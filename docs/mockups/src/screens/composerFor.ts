import type { ComposerState } from '../components/chat/Composer'
import { attachmentDraft, draftAttachments } from '../fixtures/attachments'
import { followUpDraft, steerDraft } from '../fixtures/conversations'
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
 * asks for it. A new session starts empty. A message for an agent that is
 * not connected, or in an org without a key for its cloud computers,
 * waits, and Send is off.
 */
export function composerFor(
  state: WorkspaceState,
  workspace: Workspace,
): ComposerState {
  const fresh = state.tab === 'new-session'
  const waits =
    !fresh && (state.composer === 'no-agent' || state.composer === 'no-key')
  const withFiles =
    !fresh && (state.composer === 'attachments' || state.composer === 'picker')
  let draft = ''
  if (!fresh && state.conversation === 'steer') draft = steerDraft
  else if (withFiles) draft = attachmentDraft
  else if (waits) draft = followUpDraft
  return {
    choice: workspace.choice,
    running: !fresh && isRunning(state),
    draft,
    attachments: withFiles ? draftAttachments : [],
    picker: state.composer === 'picker',
    blocked: waits,
  }
}
