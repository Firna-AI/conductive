import type { SessionsResponse } from '../../shared/sessions'
import type { OrderedWorkspaceResponse } from '../../shared/workspaces'
import { refreshDevices } from '../device/device-actions'
import type { ChatSnapshot } from './chat-snapshot'
import { logOf, messageOf, withTranscript, type ChatContext } from './context'
import { hydrate } from './history'
import { confirmWorkspace, shownRecord } from './session-records'
import { orderSessions, pickActive, sortHistory } from './sessions'

const orNull = <T>(request: Promise<T>): Promise<T | null> =>
  request.catch(() => null)

const none = Promise.resolve(null)

/**
 * Loads the chat of a workspace, then starts its event stream.
 *
 * 1. The session list and the view choose the session to show. The read
 *    of the view also names the routine whose run made the workspace.
 * 2. Its full history gives the event number that the stream starts after.
 * 3. The workspace and the session list load again after that number, so no
 *    change between the reads and the stream gets lost. Each read carries
 *    the event number of its state, so a record shows only while no newer
 *    record of the stream or a history replaces it.
 *
 * When the history of the shown session fails, the chat still loads. That
 * session shows its failed history with Try again, and its record shows a
 * running turn with Stop. The stream then starts after the older of the two
 * later reads.
 *
 * Without an open session, the stream starts at the beginning, so its
 * history holds every session. The watch of the shown session, which the
 * controller starts, loads the history of each later shown session.
 *
 * The Mac commands load after the stream starts. A request that changes
 * after that read comes with a workspace event that the stream delivers.
 *
 * When app models own the account, the org, the models, and the members,
 * the load reads none of them and writes none of them. So no reply of an
 * old read can replace a newer value of the app.
 */
export async function loadChat(context: ChatContext): Promise<void> {
  const { api, store } = context
  const fail = (error: unknown) => {
    if (!context.live()) return
    store.update((snapshot) => ({
      ...snapshot,
      load: { state: 'failed', message: messageOf(error) },
    }))
  }
  store.update((snapshot) => ({ ...snapshot, load: { state: 'loading' } }))
  context.stream.stop()
  const { owned } = context
  const extras = Promise.all([
    orNull(api.view()),
    owned ? none : orNull(api.models()),
    owned ? none : orNull(api.account()),
    owned ? none : orNull(api.org()),
    owned ? none : orNull(api.members()),
  ])
  let first: SessionsResponse
  try {
    first = await api.sessions()
  } catch (error) {
    fail(error)
    return
  }
  const [viewReply, models, account, org, members] = await extras
  if (!context.live()) return
  const view = viewReply?.view ?? null
  const active = pickActive(orderSessions(first.sessions, view), view)
  // An input that an app model owns keeps the value of its source.
  const read = owned
    ? {}
    : { models: models ?? [], account, members: members ?? [], org }
  store.update((snapshot) => ({
    ...snapshot,
    ...read,
    view,
    routine: viewReply?.routine ?? null,
    activeSessionId: active,
  }))
  let through: number | null = 0
  if (active) {
    through = await hydrate(context, active, true)
    if (!context.live()) return
  }
  let detail: OrderedWorkspaceResponse
  let sessions: SessionsResponse
  try {
    ;[detail, sessions] = await Promise.all([api.workspace(), api.sessions()])
  } catch (error) {
    fail(error)
    return
  }
  if (!context.live()) return
  const listed = [...sessions.sessions, ...sessions.history]
  for (const session of listed) {
    logOf(context, session.id).offer(session, sessions.eventNumber)
  }
  confirmWorkspace(context, detail)
  store.update((snapshot) => {
    const records = listed.map((item) => shownRecord(context, item.id) ?? item)
    const open = orderSessions(
      records.filter((item) => item.closedAt === null),
      snapshot.view,
    )
    const shown = open.some((item) => item.id === snapshot.activeSessionId)
    let next: ChatSnapshot = {
      ...snapshot,
      load: { state: 'ready' },
      sessions: open,
      history: sortHistory(records.filter((item) => item.closedAt !== null)),
      activeSessionId: shown
        ? snapshot.activeSessionId
        : pickActive(open, snapshot.view),
    }
    for (const { id } of listed) {
      const log = logOf(context, id)
      next = withTranscript(next, id, log.transcript, log.times)
    }
    return next
  })
  const after = through ?? Math.min(detail.eventNumber, sessions.eventNumber)
  context.stream.start(after)
  await refreshDevices(context)
}
