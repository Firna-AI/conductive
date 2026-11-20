import { CircleAlert, MessageSquarePlus, Paperclip } from 'lucide-react'
import {
  attachFilesLabel,
  folderBody,
  notAttachedTitle,
  smallerFileLabel,
  tooLargeBody,
} from '../components/chat/attachmentCopy'
import { ConnectAgentNotice } from '../components/chat/ConnectAgentNotice'
import {
  linkedReasonText,
  linkedTitle,
  type LinkedReason,
} from '../components/chat/linkedCopy'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { ScreenLink } from '../components/common/ScreenLink'
import { agents } from '../fixtures/agents'
import { droppedFolder, largeRecording } from '../fixtures/attachments'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { loginOwnerOf } from './sessionStarter'
import { sideAskNotice } from './sideQuestionMarks'
import type { WorkspaceState } from './workspaceState'

/**
 * Why a message of the viewer starts a new session, in a state. The org
 * login has no share switch, so only a removal of it, which makes it not
 * available, starts one.
 */
function linkedReason(state: WorkspaceState): LinkedReason | undefined {
  if (state.composer === 'no-starter-login') return 'unavailable'
  if (state.composer === 'not-shared' && state.login !== 'org') {
    return 'private'
  }
  return undefined
}

/**
 * The notice for a file over the size limit. The composer does not attach
 * the file, and the other files of the message stay. The notice names the
 * file and the limit, and its action opens the file picker again. It gives
 * no size of the file, as `tooLargeBody` says.
 */
function tooLargeNotice() {
  return (
    <Notice
      action={
        // The mockups draw one upload, which the chosen file leads to.
        <ScreenLink asChild to={paths.attachments}>
          <ActionButton icon={Paperclip}>{smallerFileLabel}</ActionButton>
        </ScreenLink>
      }
      body={tooLargeBody}
      icon={CircleAlert}
      title={notAttachedTitle(largeRecording.name)}
      tone="danger"
    />
  )
}

/**
 * The notice for a dropped folder that the browser cannot read, so the
 * composer cannot zip it. The files of the same drop stay. The notice names
 * the folder and says to attach its files. Its action opens the file
 * picker.
 */
function folderNotice() {
  return (
    <Notice
      action={
        // The mockups draw one upload, which the chosen files lead to.
        <ScreenLink asChild to={paths.attachments}>
          <ActionButton icon={Paperclip}>{attachFilesLabel}</ActionButton>
        </ScreenLink>
      }
      body={folderBody}
      icon={CircleAlert}
      title={notAttachedTitle(droppedFolder)}
      tone="danger"
    />
  )
}

/**
 * The notice over the composer when the agent of the chosen model is not
 * connected. Its action opens the Connect form of that agent in the account.
 * A file over the size limit and an unreadable folder have their own
 * notices.
 *
 * A message in a session on the login of another member, or on the org
 * login, runs on that login, so the own login of the viewer does not
 * matter there. When that login is not available, or its starter keeps it
 * for their own messages, the notice says that the message starts a new
 * session, and why, such as "Acme's Claude login is not available." after
 * an admin removed the org login. The starter whose own login is not
 * available sees the notice that asks to connect. A viewer whose default
 * login is the org login sees no such notice (decision 4 of the org logins
 * plan). While text of the chat is selected, a phone shows Ask about this
 * there instead, as `sideAskNotice` says.
 */
export function composerNotice(state: WorkspaceState, workspace: Workspace) {
  const ask = sideAskNotice(state)
  if (ask) return ask
  if (state.composer === 'too-large' && state.tab !== 'new-session') {
    return tooLargeNotice()
  }
  if (state.composer === 'unreadable-folder' && state.tab !== 'new-session') {
    return folderNotice()
  }
  const { choice } = workspace
  const agent = agents[choice.agent].name
  const owner = loginOwnerOf(state, workspace)
  const reason = linkedReason(state)
  // A new session takes the default login of the viewer, so it opens none.
  const fresh = state.tab === 'new-session'
  if (owner !== undefined && reason !== undefined && !fresh) {
    return (
      <Notice
        body={linkedReasonText(reason, owner, agent)}
        icon={MessageSquarePlus}
        title={linkedTitle}
      />
    )
  }
  const noLogin =
    state.composer === 'no-agent' || state.composer === 'no-starter-login'
  if (!noLogin || owner !== undefined) return undefined
  return <ConnectAgentNotice choice={choice} />
}
