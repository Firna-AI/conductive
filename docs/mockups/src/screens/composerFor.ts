import type { ComposerState } from '../components/chat/Composer'
import type { MentionTree } from '../components/chat/FileMentionList'
import { attachmentDraft, draftAttachments } from '../fixtures/attachments'
import { followUpDraft, steerDraft } from '../fixtures/conversations'
import { mentionChipsDraft, mentionDrafts } from '../fixtures/fileMentions'
import { savedCartsDraft } from '../fixtures/newWorkspaceConversations'
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
  'link-sent',
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

/** The draft of a state with chips: file chips, or a workspace link. */
function chipDraft(composer: WorkspaceState['composer']): string | undefined {
  if (composer === 'file-chips' || composer === 'file-chip-pointer') {
    return mentionChipsDraft
  }
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
 * A message for an agent that is not connected waits, and Send is off.
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
 * chip, and the draft keeps the plain link. `@` opens the list of the
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
  const withFiles =
    !fresh &&
    (state.composer === 'attachments' ||
      state.composer === 'picker' ||
      state.composer === 'attachment-pointer')
  const mention = fresh ? undefined : mentionLists[state.composer]
  const chips = fresh ? undefined : chipDraft(state.composer)
  let draft = ''
  if (!fresh && state.conversation === 'steer') draft = steerDraft
  else if (withFiles) draft = attachmentDraft
  else if (!fresh && (noLogin || linkedState)) draft = followUpDraft
  else if (mention) draft = mention.draft
  else if (chips) draft = chips
  else if (!fresh && state.composer === 'draft') {
    draft = isNew(state) ? savedCartsDraft : followUpDraft
  }
  return {
    choice: workspace.choice,
    running: !fresh && isRunning(state),
    draft,
    attachments: withFiles ? draftAttachments : [],
    picker: state.composer === 'picker',
    sessionAgent: fresh ? undefined : workspace.choice.agent,
    sendTo: opensLinked ? paths.linkedSession : undefined,
    startsSession: opensLinked,
    blocked: needsLogin,
    sessionLogin: sessionLoginFor(opensLinked ? undefined : starter),
    mention: mention?.tree,
    pointer: fresh ? undefined : pointerOf(state),
  }
}
