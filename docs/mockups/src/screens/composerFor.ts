import type { Viewport } from '@mokly/mokly'
import type { ComposerState } from '../components/chat/Composer'
import {
  afterDropCaret,
  afterFolderDropCaret,
  attachmentDraft,
  beforeDrop,
  beforeDropAttachments,
  draftAttachments,
  droppedAttachments,
  droppedFolderAttachments,
  failedAttachments,
  folderDropDraft,
  uploadingAttachments,
  type Attachment,
} from '../fixtures/attachments'
import { barRunningConversations } from '../fixtures/barConversations'
import { capabilityRunningConversations } from '../fixtures/capabilityConversations'
import { followUpDraft, steerDraft } from '../fixtures/conversations'
import { unlistedChoice, unlistedLabels } from '../fixtures/endpointModels'
import { favouriteLists } from '../fixtures/favourites'
import { addedChipDraft, mentionChipsDraft } from '../fixtures/fileMentions'
import { savedCartsDraft } from '../fixtures/newWorkspaceConversations'
import { sessionLinkDraft } from '../fixtures/sessionLinkConversations'
import { wakeRunningConversations } from '../fixtures/wakeConversations'
import { workspaceLinkDraft } from '../fixtures/workspaceLinkConversations'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { choiceOf } from './composerChoice'
import { mentionListFor } from './mentionComposer'
import { loginOwnerOf, otherStarter, sessionLoginFor } from './sessionStarter'
import { skillChipFor, skillListFor } from './skillComposer'
import { workspaceCapabilities } from './workspaceCapabilities'
import { isNew, noMessages } from './workspaceTabs'
import type { WorkspaceState } from './workspaceState'

const runningConversations = new Set([
  'running',
  'steer',
  'first-turn',
  'output-left-out-running',
  'background-waiting',
  'linked',
  'sent-files',
  'sent-files-listed',
  'link-sent',
  'chat-links-sent',
  ...barRunningConversations,
  'sent-by',
  'sent-by-other',
  'secret-waiting',
  'secret-waiting-two',
  'secret-waiting-late',
  'secret-running',
  'secret-done',
  'secret-denied',
  'secret-pre-approved',
  'secret-value',
  'secret-late-ran',
  'secret-temporary',
  'secret-temporary-value',
  'secret-temporary-workspace',
  'secret-temporary-saved',
  'secret-waiting-mixed',
  'secret-waiting-mixed-value',
  'secret-invalid-name',
  'secret-mixed-invalid-name',
  'secret-late-allowed',
  'secret-late-given',
  'secret-asked-again-allowed',
  'secret-stack-answered',
  ...capabilityRunningConversations,
  ...wakeRunningConversations,
])

type ComposerKey = WorkspaceState['composer']

/**
 * The files of each composer state with files. A file over the size limit
 * stays out of the message, so its state holds only the files that the
 * composer attached, and a notice names the file. A dropped folder comes as
 * its zip. A folder that the browser cannot read stays out in the same way
 * as a file over the limit.
 */
const composerFiles: Partial<Record<ComposerKey, readonly Attachment[]>> = {
  attachments: draftAttachments,
  uploading: uploadingAttachments,
  'upload-failed': failedAttachments,
  'too-large': draftAttachments,
  picker: draftAttachments,
  'attachment-pointer': draftAttachments,
  'drop-over': beforeDropAttachments,
  dropped: droppedAttachments,
  'dropped-folder': droppedFolderAttachments,
  'unreadable-folder': droppedAttachments,
}

/**
 * The draft and the drawn caret of each state of a drop. While the
 * screenshot hovers over the box, the drop caret stands where it goes.
 * After the drop, the caret stands after the new chip and its space.
 */
const dropDrafts: Partial<
  Record<ComposerKey, { draft: string; caret: number }>
> = {
  'drop-over': beforeDrop,
  dropped: { draft: attachmentDraft, caret: afterDropCaret },
  'dropped-folder': { draft: folderDropDraft, caret: afterFolderDropCaret },
  'unreadable-folder': { draft: attachmentDraft, caret: afterDropCaret },
}

/** The composer states whose Send leads to the message with its files. */
const sendsFiles = new Set<ComposerKey>(['attachments', 'too-large'])

/** The states that draw the pointer over the icon of the first chip. */
const pointerStates = new Set<ComposerKey>([
  'file-chip-pointer',
  'skill-chip-pointer',
  'workspace-link-pointer',
  'attachment-pointer',
])

/**
 * The draft of a state with chips: file chips, a skill chip, the chip of
 * Add to chat, a workspace link, or two session links.
 */
function chipDraft(composer: ComposerKey): string | undefined {
  if (composer === 'file-chips' || composer === 'file-chip-pointer') {
    return mentionChipsDraft
  }
  const skill = skillChipFor(composer)
  if (skill) return skill
  if (composer === 'file-added') return addedChipDraft
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
 * asks for it, with the favourites of the state and All models open or
 * closed. A new session starts empty. In a session with messages, the
 * picker marks the models and favourites of the other agent as opening a
 * new session. In a session of the viewer on an own endpoint, it leaves out
 * the models that the model list of the endpoint does not name, and each
 * favourite on one of them. Every picker on the
 * org login does the same with the list of the org endpoint (decision 3 A
 * of the org logins plan). After a turn that the endpoint did not serve,
 * the session keeps the model of that turn.
 * A message for an agent that is not connected waits, and Send is off.
 * The composer belongs to a session tab, where the key of Fast mode runs,
 * so the Fast row of the picker shows that key.
 *
 * Send also waits while a file uploads, or while a failed upload waits for
 * Try again or Remove. A file over the size limit stays out, and Send takes
 * the message with the files that the composer attached.
 *
 * A session runs on its login: the login of its starter, or the org login.
 * When that login is not the own login of the viewer, a label in the bar
 * names it, such as "Cal's login" or "Acme's login", and the own login of
 * the viewer does not matter. When that login is not available, or its
 * starter keeps it for their own messages, Send opens a new linked session
 * on the default login of the viewer, and the bar has no login label. The
 * org login has no share switch, so only its removal does that. Such a
 * message does not steer a running turn of the session, and Stop still
 * ends that turn.
 *
 * While the sandbox is not ready, Send queues the message in the
 * workspace, also during the first start and after a failed first start of
 * a new workspace. The message waits for the sandbox.
 *
 * A message with a pasted link to another workspace shows the link as a
 * chip, and the draft keeps the plain link. A pasted link to a session
 * shows as a session chip in the same way. `@` opens the list of the
 * files and folders above the box, and a picked entry shows as a chip. Add
 * to chat of a row menu puts a chip at the end of the draft.
 * `/` opens the list of skills there, and a picked skill shows as a chip.
 *
 * Each attached file is a chip at its place in the text. While files hover
 * over the box, the desktop shows the drop state with the drop caret in the
 * text. A phone shows a pick at the caret in place of the drag, so it draws
 * only the caret, where the attach button puts the files.
 *
 * The Capabilities icon beside the attach button opens what the agents of
 * the workspace can use. A phone holds both in the menu of one button.
 */
export function composerFor(
  state: WorkspaceState,
  workspace: Workspace,
  viewport: Viewport,
): ComposerState {
  const fresh = state.tab === 'new-session'
  const org = state.login === 'org'
  const starter = otherStarter(state, workspace)
  const owner = loginOwnerOf(state, workspace)
  const noLogin =
    state.composer === 'no-agent' || state.composer === 'no-starter-login'
  const needsLogin = !fresh && noLogin && owner === undefined
  const linkedState =
    state.composer === 'no-starter-login' ||
    (state.composer === 'not-shared' && !org)
  const opensLinked = !fresh && linkedState && owner !== undefined
  const unlistedPicker = state.composer === 'picker-unlisted'
  const nextMessage = noLogin || linkedState || unlistedPicker
  const files = fresh ? undefined : composerFiles[state.composer]
  const drop = fresh ? undefined : dropDrafts[state.composer]
  const mention = fresh ? undefined : mentionListFor(state)
  const skills = fresh ? undefined : skillListFor(state.composer)
  const chips = fresh ? undefined : chipDraft(state.composer)
  // After Add to chat, the field takes the focus on desktop only, so only
  // desktop draws the caret, after the chip and its space.
  const addedCaret =
    !fresh && state.composer === 'file-added' && viewport === 'desktop'
      ? addedChipDraft.length
      : undefined
  const choice =
    state.conversation === 'model-not-served'
      ? unlistedChoice
      : choiceOf(state, workspace)
  let draft = ''
  if (!fresh && state.conversation === 'steer') draft = steerDraft
  else if (drop) draft = drop.draft
  else if (files) draft = attachmentDraft
  else if (!fresh && nextMessage) draft = followUpDraft
  else if (mention) draft = mention.draft
  else if (skills) draft = skills.draft
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
    // The picker shows the saved favourites with All models closed unless
    // told otherwise, so the props of the default state stay as they were.
    favourites:
      state.favourites === 'saved'
        ? undefined
        : favouriteLists[state.favourites],
    allModels: state.allModels === 'open' ? true : undefined,
    // A session takes its agent at its first message.
    sessionAgent: noMessages(state) ? undefined : choice.agent,
    fastKey: true,
    // The pickers of the owner of a personal login and every picker on the
    // org login follow its model list, and a session keeps its model.
    hiddenModels:
      unlistedPicker && (org || starter === undefined)
        ? unlistedLabels.filter((label) => label !== choice.model)
        : undefined,
    sendTo,
    startsSession: opensLinked,
    blocked: needsLogin,
    sessionLogin: sessionLoginFor(opensLinked ? undefined : owner),
    mention: mention?.tree,
    skills: skills?.source,
    drop:
      drop !== undefined &&
      state.composer === 'drop-over' &&
      viewport === 'desktop',
    caret: drop?.caret ?? addedCaret,
    pointer: !fresh && pointerStates.has(state.composer),
    capabilities: workspaceCapabilities(state, viewport),
    menu: { open: state.composer === 'menu', to: paths.capabilitiesMenu },
  }
}
