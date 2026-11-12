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
import { people } from '../fixtures/members'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { otherStarter } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'

/** Why a message of the viewer starts a new session, in a composer state. */
function linkedReason(
  composer: WorkspaceState['composer'],
): LinkedReason | undefined {
  if (composer === 'no-starter-login') return 'unavailable'
  if (composer === 'not-shared') return 'private'
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
 * The notice for a dropped folder. The composer does not attach a folder,
 * and the files of the same drop stay. The notice names the folder and
 * says to attach its files. Its action opens the file picker.
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
 * A file over the size limit and a dropped folder have their own notices.
 *
 * A message in the session of another member runs on the login of that
 * starter, so the own login of the viewer does not matter there. When the
 * login of the starter is not available, or the starter keeps it for their
 * own messages, the notice says that the message starts a new session, and
 * why. The starter whose login is not available sees the notice that asks
 * to connect.
 */
export function composerNotice(state: WorkspaceState, workspace: Workspace) {
  if (state.composer === 'too-large' && state.tab !== 'new-session') {
    return tooLargeNotice()
  }
  if (state.composer === 'dropped-folder' && state.tab !== 'new-session') {
    return folderNotice()
  }
  const { choice } = workspace
  const agent = agents[choice.agent].name
  const starter = otherStarter(state, workspace)
  const reason = linkedReason(state.composer)
  if (starter !== undefined && reason !== undefined) {
    return (
      <Notice
        body={linkedReasonText(reason, people[starter].name, agent)}
        icon={MessageSquarePlus}
        title={linkedTitle}
      />
    )
  }
  const noLogin =
    state.composer === 'no-agent' || state.composer === 'no-starter-login'
  if (!noLogin || starter !== undefined) return undefined
  return <ConnectAgentNotice choice={choice} />
}
