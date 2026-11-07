import type { SessionsResponse } from '../../shared/sessions'
import type { WorkspaceResponse } from '../../shared/workspaces'
import { refreshDevices } from '../device/device-actions'
import type { ChatSnapshot } from './chat-snapshot'
import { logOf, messageOf, withTranscript, type ChatContext } from './context'
import { hydrate } from './history'
import { orderSessions, pickActive, sortHistory } from './sessions'

const orNull = <T>(request: Promise<T>): Promise<T | null> =>
  request.catch(() => null)

const none = Promise.resolve(null)

/**
 * Loads the chat of a workspace, then starts its event stream.
 *
 * 1. The session list and the view choose the session to show.
 * 2. Its full history gives the event number that the stream starts after.
 * 3. The workspace and the session list load again after that number, so no
 *    change between the reads and the stream gets lost. Each record of that
 *    list gives the retry message of its session after that number, until
 *    a newer record from the stream or a history replaces it.
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
  const [view, models, account, org, members] = await extras
  if (!context.live()) return
  const active = pickActive(orderSessions(first.sessions, view), view)
  // An input that an app model owns keeps the value of its source.
  const read = owned
    ? {}
    : { models: models ?? [], account, members: members ?? [], org }
  store.update((snapshot) => ({
    ...snapshot,
    ...read,
    view,
    activeSessionId: active,
  }))
  let after = 0
  if (active) {
    const through = await hydrate(context, active, true)
    if (through === null) {
      fail(null)
      return
    }
    after = through
  }
  let detail: WorkspaceResponse
  let sessions: SessionsResponse
  try {
    ;[detail, sessions] = await Promise.all([api.workspace(), api.sessions()])
  } catch (error) {
    fail(error)
    return
  }
  if (!context.live()) return
  const listed: string[] = []
  for (const session of [...sessions.sessions, ...sessions.history]) {
    if (logOf(context, session.id).takeListed(session, after)) {
      listed.push(session.id)
    }
  }
  store.update((snapshot) => {
    const open = orderSessions(sessions.sessions, snapshot.view)
    const shown = open.some((item) => item.id === snapshot.activeSessionId)
    let next: ChatSnapshot = {
      ...snapshot,
      load: { state: 'ready' },
      workspace: detail.workspace,
      start: detail.start,
      sessions: open,
      history: sortHistory(sessions.history),
      activeSessionId: shown
        ? snapshot.activeSessionId
        : pickActive(open, snapshot.view),
    }
    for (const id of listed) {
      const log = logOf(context, id)
      next = withTranscript(next, id, log.transcript, log.times)
    }
    return next
  })
  context.stream.start(after)
  await refreshDevices(context)
}
