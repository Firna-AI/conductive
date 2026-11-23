import { ApiError, type ApiClient } from '../../app/api/client'
import type { EmptyRequest } from '../../shared/api'
import { sessionWakeUpPaths } from '../../shared/wake-up-paths'
import type { WorkspaceTarget } from '../api/client'
import {
  readSessionWakeUpCancel,
  readSessionWakeUps,
} from '../api/read-wake-up'
import { showNotice, type ChatContext } from '../state/context'
import {
  withCancel,
  withWakeUpOver,
  withWakeUpRead,
  type WakeUpsState,
} from './wake-up-state'

const empty: EmptyRequest = {}

/** The routes of the pending wake-ups of a session, through the client of the chat. */
export function createWakeUpApi(client: ApiClient) {
  return {
    /** The pending wake-ups of a session, at an event number of the workspace. */
    list: ({ orgId, workspaceId }: WorkspaceTarget, sessionId: string) =>
      client.get(
        sessionWakeUpPaths.list(orgId, workspaceId, sessionId),
        readSessionWakeUps,
      ),
    /** The Cancel of a member. */
    cancel: (
      { orgId, workspaceId }: WorkspaceTarget,
      sessionId: string,
      wakeUpId: string,
    ) =>
      client.send(
        'POST',
        sessionWakeUpPaths.cancel(orgId, workspaceId, sessionId, wakeUpId),
        empty,
        readSessionWakeUpCancel,
      ),
  }
}

export type WakeUpApi = ReturnType<typeof createWakeUpApi>

function update(
  context: ChatContext,
  change: (state: WakeUpsState) => WakeUpsState,
): void {
  context.store.update((snapshot) => ({
    ...snapshot,
    wakeUps: change(snapshot.wakeUps),
  }))
}

/**
 * Reads the pending wake-ups of a session, when its history loads. A wake-up
 * can wait for days, so its event can be in a page of the history that has
 * not loaded yet. The read gives it at once, at the event number of the
 * read, and the events keep it current, as `pendingWakeUps` says. A failed
 * read keeps the wake-ups of the events, and the full history brings the
 * rest.
 */
export async function readWakeUps(
  context: ChatContext,
  sessionId: string,
): Promise<void> {
  if (!context.live()) return
  try {
    const read = await context.wakeUps.list(context.target, sessionId)
    if (!context.live()) return
    update(context, (state) => withWakeUpRead(state, sessionId, read))
  } catch {
    // The events of the session keep the wake-ups that the chat shows.
  }
}

/** The wake-up is not one of the session, so it does not wait there. */
const NOT_FOUND = 'wake_up_not_found'

/**
 * The Cancel of a member, which asks no question (wake-up decision 3 B).
 * While it waits for its reply, the wake-up takes no second Cancel. The
 * reply ends the card at once, also when the wake-up already fired or ended.
 * The end line comes with the event of the cancel. A wake-up that the
 * session does not have ends its card with no notice. Any other failure
 * keeps the card and names the cause.
 */
export async function cancelWakeUp(
  context: ChatContext,
  sessionId: string,
  wakeUpId: string,
): Promise<void> {
  if (Object.hasOwn(context.store.get().wakeUps.cancels, wakeUpId)) return
  update(context, (state) => withCancel(state, wakeUpId, true))
  try {
    await context.wakeUps.cancel(context.target, sessionId, wakeUpId)
    if (!context.live()) return
    update(context, (state) =>
      withWakeUpOver(withCancel(state, wakeUpId, false), wakeUpId),
    )
  } catch (error) {
    if (!context.live()) return
    const gone = error instanceof ApiError && error.code === NOT_FOUND
    update(context, (state) => {
      const next = withCancel(state, wakeUpId, false)
      return gone ? withWakeUpOver(next, wakeUpId) : next
    })
    if (!gone) {
      showNotice(context, sessionId, "The wake-up didn't cancel", error)
    }
  }
}
