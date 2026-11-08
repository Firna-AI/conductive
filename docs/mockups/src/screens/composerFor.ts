import type { ComposerState } from '../components/chat/Composer'
import {
  attachmentDraft,
  draftAttachments,
  failedAttachments,
  uploadingAttachments,
  type Attachment,
} from '../fixtures/attachments'
import { followUpDraft, steerDraft } from '../fixtures/conversations'
import { heldDraft } from '../fixtures/starting'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { otherStarter, sessionLoginFor } from './sessionStarter'
import { isNew } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

const runningConversations = new Set([
  'running',
  'steer',
  'first-turn',
  'output-left-out-running',
  'linked',
  'sent-files',
])

/**
 * The files of each composer state with files. A file over the size limit
 * stays out of the message, so its state holds only the files that the
 * composer attached, and a notice names the file.
 */
const composerFiles: Partial<
  Record<WorkspaceState['composer'], readonly Attachment[]>
> = {
  attachments: draftAttachments,
  uploading: uploadingAttachments,
  'upload-failed': failedAttachments,
  'too-large': draftAttachments,
  picker: draftAttachments,
}

/** The composer states whose Send leads to the message with its files. */
const sendsFiles = new Set<WorkspaceState['composer']>([
  'attachments',
  'too-large',
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
 * A message for an agent that is not connected waits, and Send is off.
 *
 * Send also waits while a file uploads, or while a failed upload waits for
 * Try again or Remove. A file over the size limit stays out, and Send takes
 * the message with the files that the composer attached.
 *
 * A session runs on the login of its starter, and a line under the box
 * names that login. When the starter is another member, the own login of
 * the viewer does not matter. When the login of that starter is not
 * available, or that starter keeps it for their own messages, Send opens a
 * new linked session on the own login of the viewer. Such a message does
 * not steer a running turn of the session, and Stop still ends that turn.
 *
 * While the sandbox of a new workspace starts for the first time, Send
 * waits in every session, and the box keeps the message. A resume of a
 * stopped workspace takes messages, which wait for the sandbox.
 */
export function composerFor(
  state: WorkspaceState,
  workspace: Workspace,
): ComposerState {
  const fresh = state.tab === 'new-session'
  const starter = otherStarter(state, workspace)
  const noLogin =
    state.composer === 'no-agent' || state.composer === 'no-starter-login'
  const needsLogin = !fresh && noLogin && starter === undefined
  const linkedState =
    state.composer === 'no-starter-login' || state.composer === 'not-shared'
  const opensLinked = !fresh && linkedState && starter !== undefined
  const files = fresh ? undefined : composerFiles[state.composer]
  let draft = ''
  if (!fresh && state.conversation === 'steer') draft = steerDraft
  else if (files) draft = attachmentDraft
  else if (!fresh && (noLogin || linkedState)) draft = followUpDraft
  else if (!fresh && state.composer === 'draft') {
    draft = isNew(state) ? heldDraft : followUpDraft
  }
  let sendTo: string | undefined
  if (opensLinked) sendTo = paths.linkedSession
  else if (files && sendsFiles.has(state.composer)) {
    sendTo = paths.attachmentsSent
  }
  return {
    choice: workspace.choice,
    running: !fresh && isRunning(state),
    draft,
    attachments: files ?? [],
    attachTo:
      files && state.composer === 'attachments' ? paths.attachments : undefined,
    picker: state.composer === 'picker',
    sessionAgent: fresh ? undefined : workspace.choice.agent,
    sendTo,
    startsSession: opensLinked,
    blocked: needsLogin,
    waits: isNew(state) && state.sandbox === 'starting',
    sessionLogin: sessionLoginFor(workspace, opensLinked ? undefined : starter),
  }
}
