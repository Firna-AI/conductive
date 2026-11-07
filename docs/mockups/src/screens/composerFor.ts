import type { ComposerState } from '../components/chat/Composer'
import { attachmentDraft, draftAttachments } from '../fixtures/attachments'
import { followUpDraft, steerDraft } from '../fixtures/conversations'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { otherStarter, sessionLoginFor } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'

const runningConversations = new Set([
  'running',
  'steer',
  'first-turn',
  'output-left-out-running',
  'linked',
])

/** An agent turn runs on a ready sandbox. */
export function isRunning(state: WorkspaceState): boolean {
  return (
    state.sandbox === 'ready' && runningConversations.has(state.conversation)
  )
}

/**
 * The composer of a workspace state: a steer message while a turn runs, or
 * a message with attached files, with the model picker open when the state
 * asks for it. A new session starts empty. In a session with messages,
 * the picker marks the models of the other agent as opening a new session.
 * A message for an agent that is not connected, or in an org without a key
 * for its cloud computers, waits, and Send is off.
 *
 * A session runs on the login of its starter, and a line under the box
 * names that login. When the starter is another member, the own login of
 * the viewer does not matter. When the login of that starter is not
 * available, Send opens a new linked session on the own login of the
 * viewer.
 */
export function composerFor(
  state: WorkspaceState,
  workspace: Workspace,
): ComposerState {
  const fresh = state.tab === 'new-session'
  const starter = otherStarter(state, workspace)
  const noLogin =
    state.composer === 'no-agent' || state.composer === 'no-starter-login'
  const waits =
    !fresh &&
    (state.composer === 'no-key' || (noLogin && starter === undefined))
  const opensLinked =
    !fresh && state.composer === 'no-starter-login' && starter !== undefined
  const withFiles =
    !fresh && (state.composer === 'attachments' || state.composer === 'picker')
  let draft = ''
  if (!fresh && state.conversation === 'steer') draft = steerDraft
  else if (withFiles) draft = attachmentDraft
  else if (!fresh && (noLogin || state.composer === 'no-key')) {
    draft = followUpDraft
  }
  return {
    choice: workspace.choice,
    running: !fresh && isRunning(state),
    draft,
    attachments: withFiles ? draftAttachments : [],
    picker: state.composer === 'picker',
    sessionAgent: fresh ? undefined : workspace.choice.agent,
    sendTo: opensLinked ? paths.linkedSession : undefined,
    blocked: waits,
    sessionLogin: sessionLoginFor(workspace, opensLinked ? undefined : starter),
  }
}
