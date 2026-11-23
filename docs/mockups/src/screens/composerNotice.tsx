import { StartFailedNotice } from '../components/capabilities/StartFailedNotice'
import {
  attachFilesLabel,
  folderBody,
  notAttachedTitle,
  smallerFileLabel,
  tooLargeBody,
} from '../../../../src/ui/components/chat/attachmentCopy'
import { connectAgentNotice } from '../entries/components/chat/ConnectAgentNotice.mockup'
import {
  linkedReasonText,
  linkedTitle,
  type LinkedReason,
} from '../../../../src/ui/components/chat/linkedCopy'
import { actionButton } from '../entries/components/common/actions.mockup'
import { notice } from '../entries/components/common/Notice.mockup'
import { ScreenLink } from '../components/common/ScreenLink'
import { agents } from '../fixtures/agents'
import { droppedFolder, largeRecording } from '../fixtures/attachments'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { plainData } from '../defined'
import { loginOwnerOf } from './sessionStarter'
import { explainNotice } from './explainMarks'
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
    <notice.Component
      action={
        // The mockups draw one upload, which the chosen file leads to.
        <ScreenLink asChild to={paths.attachments}>
          <actionButton.Component
            icon="paperclip"
            moklyInstance="attach-smaller-file"
          >
            {smallerFileLabel}
          </actionButton.Component>
        </ScreenLink>
      }
      body={tooLargeBody}
      icon="circle-alert"
      moklyInstance="composer-notice"
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
    <notice.Component
      action={
        // The mockups draw one upload, which the chosen files lead to.
        <ScreenLink asChild to={paths.attachments}>
          <actionButton.Component
            icon="paperclip"
            moklyInstance="attach-folder-files"
          >
            {attachFilesLabel}
          </actionButton.Component>
        </ScreenLink>
      }
      body={folderBody}
      icon="circle-alert"
      moklyInstance="composer-notice"
      title={notAttachedTitle(droppedFolder)}
      tone="danger"
    />
  )
}

/**
 * The notice over the composer when the agent of the chosen model is not
 * connected. Its action opens the Connect form of that agent in the account.
 * A file over the size limit, an unreadable folder, and a grant of a new
 * workspace that did not start on this Mac have their own notices.
 *
 * A message in a session on the login of another member, or on the org
 * login, runs on that login, so the own login of the viewer does not
 * matter there. When that login is not available, or its starter keeps it
 * for their own messages, the notice says that the message starts a new
 * session, and why, such as "Acme's Claude login is not available." after
 * an admin removed the org login. The starter whose own login is not
 * available sees the notice that asks to connect. A viewer whose default
 * login is the org login sees no such notice (decision 4 of the org logins
 * plan). While text of the chat is selected, a phone shows Explain there
 * instead, as `explainNotice` says.
 */
export function composerNotice(state: WorkspaceState, workspace: Workspace) {
  const explain = explainNotice(state)
  if (explain) return explain
  if (state.composer === 'too-large' && state.tab !== 'new-session') {
    return tooLargeNotice()
  }
  if (state.composer === 'unreadable-folder' && state.tab !== 'new-session') {
    return folderNotice()
  }
  if (state.composer === 'grant-not-started') {
    return <StartFailedNotice failure="not-started" />
  }
  if (state.composer === 'grant-not-reached') {
    return <StartFailedNotice failure="not-reached" />
  }
  const { choice } = workspace
  const agent = agents[choice.agent].name
  const owner = loginOwnerOf(state, workspace)
  const reason = linkedReason(state)
  // A new session takes the default login of the viewer, so it opens none.
  const fresh = state.tab === 'new-session'
  if (owner !== undefined && reason !== undefined && !fresh) {
    return (
      <notice.Component
        body={linkedReasonText(reason, owner, agent)}
        icon="message-square-plus"
        moklyInstance="composer-notice"
        title={linkedTitle}
      />
    )
  }
  const noLogin =
    state.composer === 'no-agent' || state.composer === 'no-starter-login'
  if (!noLogin || owner !== undefined) return undefined
  return (
    <connectAgentNotice.Component
      choice={plainData(choice)}
      moklyInstance="connect-agent-notice"
    />
  )
}
