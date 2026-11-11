import type { ComposerState } from '../components/chat/Composer'
import type { MentionTree } from '../components/chat/FileMentionList'
import {
  attachmentDraft,
  draftAttachments,
  failedAttachments,
  uploadingAttachments,
  type Attachment,
} from '../fixtures/attachments'
import { barRunningConversations } from '../fixtures/barConversations'
import { followUpDraft, steerDraft } from '../fixtures/conversations'
import { unlistedChoice, unlistedLabels } from '../fixtures/endpointModels'
import { mentionChipsDraft, mentionDrafts } from '../fixtures/fileMentions'
import { savedCartsDraft } from '../fixtures/newWorkspaceConversations'
import { sessionLinkDraft } from '../fixtures/sessionLinkConversations'
import { workspaceLinkDraft } from '../fixtures/workspaceLinkConversations'
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
  'link-sent',
  ...barRunningConversations,
  'sent-by',
  'sent-by-other',
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
  'attachment-pointer': draftAttachments,
}

/** The composer states whose Send leads to the message with its files. */
const sendsFiles = new Set<WorkspaceState['composer']>([
  'attachments',
  'too-large',
])

/** The draft and the tree of each state that opens the list of `@`. */
const mentionLists: Partial<
  Record<WorkspaceState['composer'], { draft: string; tree: MentionTree }>
> = {
  'mention-query': { draft: mentionDrafts.query, tree: 'latest' },
  'mention-start': { draft: mentionDrafts.start, tree: 'latest' },
  'mention-none': { draft: mentionDrafts.none, tree: 'latest' },
  'mention-loading': { draft: mentionDrafts.query, tree: 'loading' },
  'mention-unavailable': { draft: mentionDrafts.query, tree: 'unavailable' },
}

/** The pointer that a state draws over the icon of a chip of the composer. */
function pointerOf(state: WorkspaceState): ComposerState['pointer'] {
  if (state.composer === 'attachment-pointer') {
    return { kind: 'attachment', name: draftAttachments[0].name }
  }
  const chip =
    state.composer === 'file-chip-pointer' ||
    state.composer === 'workspace-link-pointer'
  return chip ? { kind: 'chip' } : undefined
}

/**
 * The draft of a state with chips: file chips, a workspace link, or two
 * session links.
 */
function chipDraft(composer: WorkspaceState['composer']): string | undefined {
  if (composer === 'file-chips' || composer === 'file-chip-pointer') {
    return mentionChipsDraft
  }
  if (composer === 'session-link') return sessionLinkDraft
  const link =
    composer === 'workspace-link' || composer === 'workspace-link-pointer'
  return link ? workspaceLinkDraft : undefined
}

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
 * In a session of the viewer on an own endpoint, it leaves out the models
 * that the model list of the endpoint does not name. After a turn that the
 * endpoint did not serve, the session keeps the model of that turn.
 * A message for an agent that is not connected waits, and Send is off.
 *
 * Send also waits while a file uploads, or while a failed upload waits for
 * Try again or Remove. A file over the size limit stays out, and Send takes
 * the message with the files that the composer attached.
 *
 * A session runs on the login of its starter. When the starter is another
 * member, a label in the bar names that login, and the own login of the
 * viewer does not matter. When the login of that starter is not
 * available, or that starter keeps it for their own messages, Send opens a
 * new linked session on the own login of the viewer, and the bar has no
 * login label. Such a message does not steer a running turn of the
 * session, and Stop still ends that turn.
 *
 * While the sandbox is not ready, Send queues the message in the
 * workspace, also during the first start and after a failed first start of
 * a new workspace. The message waits for the sandbox.
 *
 * A message with a pasted link to another workspace shows the link as a
 * chip, and the draft keeps the plain link. A pasted link to a session
 * shows as a session chip in the same way. `@` opens the list of the
 * files and folders above the box, and a picked entry shows as a chip.
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
  const unlistedPicker = state.composer === 'picker-unlisted'
  const nextMessage = noLogin || linkedState || unlistedPicker
  const files = fresh ? undefined : composerFiles[state.composer]
  const mention = fresh ? undefined : mentionLists[state.composer]
  const chips = fresh ? undefined : chipDraft(state.composer)
  const choice =
    state.conversation === 'model-not-served'
      ? unlistedChoice
      : workspace.choice
  let draft = ''
  if (!fresh && state.conversation === 'steer') draft = steerDraft
  else if (files) draft = attachmentDraft
  else if (!fresh && nextMessage) draft = followUpDraft
  else if (mention) draft = mention.draft
  else if (chips) draft = chips
  else if (!fresh && state.composer === 'draft') {
    draft = isNew(state) ? savedCartsDraft : followUpDraft
  }
  let sendTo: string | undefined
  if (opensLinked) sendTo = paths.linkedSession
  else if (files && sendsFiles.has(state.composer)) {
    sendTo = paths.attachmentsSent
  }
  return {
    choice,
    running: !fresh && isRunning(state),
    draft,
    attachments: files ?? [],
    attachTo:
      files && state.composer === 'attachments' ? paths.attachments : undefined,
    picker: state.composer === 'picker' || unlistedPicker,
    sessionAgent: fresh ? undefined : choice.agent,
    // Only the pickers of the owner of the login follow its model list, and
    // a session keeps its current model.
    hiddenModels:
      unlistedPicker && starter === undefined
        ? unlistedLabels.filter((label) => label !== choice.model)
        : undefined,
    sendTo,
    startsSession: opensLinked,
    blocked: needsLogin,
    sessionLogin: sessionLoginFor(opensLinked ? undefined : starter),
    mention: mention?.tree,
    pointer: fresh ? undefined : pointerOf(state),
  }
}
