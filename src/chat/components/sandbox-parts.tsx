import type { WorkspaceState } from '../../shared/generated/WorkspaceState'
import type { ReactNode } from 'react'
import { failedFirstStart } from '../../app/first-start'
import type { ChatSnapshot } from '../state/chat-snapshot'
import type { ChatController } from '../state/controller'
import { SandboxBar, StartingCard, type SandboxProblem } from './SandboxState'

function problemOf(state: WorkspaceState | undefined): SandboxProblem | null {
  return state === 'stopped' || state === 'error' || state === 'archived'
    ? state
    : null
}

/**
 * The parts of the chat that the app draws from its own record of the
 * workspace: the start steps at the end of the history while the sandbox
 * starts, and the bar under the chat while the sandbox is down. Null leaves
 * the place empty. Without a host, the chat draws both from its own record.
 */
export interface ChatHost {
  starting: ReactNode | null
  sandboxBar: ReactNode | null
  /**
   * The composer stays under the bar, as after a failed first start, so that
   * members can still queue messages. Otherwise the bar takes its place.
   */
  keepsComposer: boolean
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
  now: number
  host?: ChatHost
  readOnly?: boolean
}): ChatHost {
  if (props.host) return props.host
  const { snapshot, controller, now } = props
  const { workspace } = snapshot
  const problem = problemOf(workspace?.state)
  const readOnly = props.readOnly ?? false
  const firstStart = failedFirstStart(workspace, snapshot.start)
  return {
    starting:
      workspace?.state === 'starting' && !readOnly ? (
        <StartingCard now={now} start={snapshot.start} />
      ) : null,
    sandboxBar:
      problem && workspace && (problem === 'archived' || !readOnly) ? (
        <SandboxBar
          archivedAt={workspace.archivedAt}
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
