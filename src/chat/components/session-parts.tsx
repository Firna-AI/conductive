import type { ReactNode } from 'react'
import type { Session } from '../../shared/generated/Session'
import { failedFirstStart } from '../../app/first-start'
import { pendingCommandItems } from '../device/PendingCommands'
import type { ChatSnapshot, SessionState } from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import type { ComposerTool } from './ComposerTools'
import { SandboxBar, StartingCard, workspaceProblemOf } from './SandboxState'
import type { GitHubBranch } from './SessionStatus'
import { useTranscriptInputs } from './transcript-inputs'
import { WaitingRequests } from './WaitingRequests'

/**
 * The parts of the chat that the app draws from its own record of the
 * workspace: the start steps at the end of the history while the sandbox
 * starts, and the bar under the chat while the sandbox is down. Null leaves
 * the place empty. Without a host, the chat draws both from its own record.
 * The app also gives the tools of the composer, such as Capabilities.
 */
export interface ChatHost {
  starting: ReactNode | null
  sandboxBar: ReactNode | null
  /**
   * The composer stays under the bar, as after a failed first start, so that
   * members can still queue messages. Otherwise the bar takes its place.
   */
  keepsComposer: boolean
  /** The tools of the composer, as `ComposerTool` says. */
  tools?: readonly ComposerTool[]
  /** A notice over the composer in a workspace that allows writes. */
  notice?: ReactNode
  /**
   * The GitHub branch with its display label. New session text uses the
   * label when the GitHub branch matches the workspace branch.
   */
  github?: GitHubBranch | null
}

/**
 * The start steps and the sandbox bar: the host's, or the chat's own. A
 * read-only chat without a host shows only the bar of an archived
 * workspace, because it offers no Resume. The chat's own bar shows the
 * message that the workspace saved for a failed start, and after a failed
 * first start the composer stays under it.
 */
export function sandboxParts(props: {
  snapshot: ChatSnapshot
  controller: ChatController
  host?: ChatHost
  readOnly?: boolean
}): ChatHost {
  if (props.host) return props.host
  const { snapshot, controller } = props
  const { workspace } = snapshot
  const problem = workspaceProblemOf(workspace?.state)
  const readOnly = props.readOnly ?? false
  const firstStart = failedFirstStart(workspace, snapshot.start)
  return {
    starting:
      workspace?.state === 'starting' && !readOnly ? (
        <StartingCard start={snapshot.start} />
      ) : null,
    sandboxBar:
      problem && workspace && (problem === 'archived' || !readOnly) ? (
        <SandboxBar
          archivedAt={workspace.archivedAt}
          archivedComputer={workspace.archivedComputer}
          busy={snapshot.resuming}
          firstStart={firstStart}
          message={snapshot.savedError}
          onResume={() => void controller.resume()}
          problem={problem}
        />
      ) : null,
    keepsComposer: firstStart && !readOnly,
  }
}

/**
 * The parts of the chat of one session that its tab and the popover of an
 * explanation share: the inputs of its transcript, as `useTranscriptInputs`
 * says, which are the lines and the cards at their places in the
 * transcript, its readers, and Try again, and the requests that wait for an
 * answer just above the field. The lines and the cards are the link of a
 * linked session to its source, the Mac commands, and the secret requests.
 * A read-only workspace takes no answer.
 */
export function useSessionParts(props: {
  snapshot: ChatSnapshot
  controller: ChatController
  sessionId: string | null
  /** The record of the session, which names the source of a linked one. */
  session: Session | null
  state: SessionState
  readOnly: boolean
  /**
   * Opens a session that a line names, such as the source of a link. The
   * tab shows that session in its own tab without it.
   */
  onOpenSession?: (sessionId: string) => void
}) {
  const { snapshot, controller, readOnly } = props
  const { commands, secrets, inserts, readers, onRetry } = useTranscriptInputs(
    snapshot,
    controller,
    props.sessionId,
    props.session,
    props.state,
    readOnly,
    props.onOpenSession,
  )
  const viewerId = snapshot.account?.user.id ?? null
  const waiting = (
    <WaitingRequests
      items={[
        ...pendingCommandItems({
          devices: snapshot.devices,
          onAnswer: (requestId, action) =>
            void controller.answerCommand(requestId, action),
          readOnly,
          readers: { viewerId, orgName: snapshot.org?.name ?? null },
          requests: commands.waiting,
        }),
        ...secrets.waiting,
      ]}
    />
  )
  return { inserts, readers, onRetry, waiting }
}
