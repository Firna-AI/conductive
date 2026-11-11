import type { ReactNode } from 'react'
import { CircleAlert, MessageSquarePlus, Paperclip } from 'lucide-react'
import {
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
import { largeRecording } from '../fixtures/attachments'
import { people } from '../fixtures/members'
import type { Workspace } from '../fixtures/workspaces'
import { paths } from '../paths'
import { otherStarter } from './sessionStarter'
import type { WorkspaceState } from './workspaceState'
import { installScriptNotice } from './workspaceUpdates'

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
 * The notice over the composer when the agent of the chosen model is not
 * connected. Its action opens the Connect form of that agent in the account.
 * A file over the size limit has its own notice.
 *
 * A message in the session of another member runs on the login of that
 * starter, so the own login of the viewer does not matter there. When the
 * login of the starter is not available, or the starter keeps it for their
 * own messages, the notice says that the message starts a new session, and
 * why. The starter whose login is not available sees the notice that asks
 * to connect.
 */
function messageNotice(state: WorkspaceState, workspace: Workspace) {
  if (state.composer === 'too-large' && state.tab !== 'new-session') {
    return tooLargeNotice()
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

/**
 * The notices over the composer: the notice of a changed install script,
 * with the run of the script, then the notice of the message, if any.
 */
export function composerNotice(
  state: WorkspaceState,
  workspace: Workspace,
): ReactNode {
  const setup = installScriptNotice(state)
  const message = messageNotice(state, workspace)
  if (!setup) return message
  return (
    <>
      {setup}
      {message}
    </>
  )
}
