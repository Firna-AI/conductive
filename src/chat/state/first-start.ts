import type { WorkspaceState } from '../../shared/workspaces'
import type { ChatSnapshot } from './chat-snapshot'

/**
 * The states that the Worker sets only after the first start of the
 * workspace succeeded: the start is prepared, and the runner is connected.
 * A stop or an error is no such sign, because a first start can stop or
 * fail before it succeeds.
 */
const afterFirstStart: ReadonlySet<WorkspaceState> = new Set([
  'ready',
  'working',
  'input',
  'unread',
])

/**
 * The records of the snapshot show that the first start of the workspace
 * succeeded: a state after it, or the record of a resume.
 */
function showsSuccess(snapshot: ChatSnapshot): boolean {
  const state = snapshot.workspace?.state
  return (
    (state !== undefined && afterFirstStart.has(state)) ||
    snapshot.start?.kind === 'resume'
  )
}

/**
 * Remembers that the records showed the success of the first start, so that
 * the success stays after a stop. A resume then never waits, also when its
 * workspace record comes before the record of the resume, which replaces
 * the record of the first start. Apply it after each change of the
 * workspace record or of its start.
 */
export function withFirstStart(snapshot: ChatSnapshot): ChatSnapshot {
  if (snapshot.firstStartDone || !showsSuccess(snapshot)) return snapshot
  return { ...snapshot, firstStartDone: true }
}

/**
 * Send waits until the chat sees that the first start of the workspace
 * succeeded, because the Worker refuses each new message until then. Each
 * draft stays, and nothing sends it on its own. A resume still takes
 * messages, and the workspace queues them for the sandbox.
 */
export function waitsForFirstStart(snapshot: ChatSnapshot): boolean {
  if (snapshot.workspace === null) return false
  return !snapshot.firstStartDone && !showsSuccess(snapshot)
}
