import { followUpDraft } from '../../../docs/mockups/src/fixtures/conversations'
import { ACCOUNT_PATHS } from '../../shared/account'
import type { UserMessage } from '../../shared/messages'
import type { Session, SessionsResponse } from '../../shared/sessions'
import {
  workspaceViewPath,
  type WorkspaceTab,
  type WorkspaceView,
} from '../../shared/workspace-view'
import type { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures } from '../../test-support/fixtures/core'
import type { DevBackend } from './dev-backend'
import type { DevOptions } from './dev-options'
import { place, targetOf } from './dev-sessions'

/**
 * The session records of the `starter` option. With `off` and `linked`, the
 * login of each starter is not available. With `none`, the records are older
 * ones that name no starter, as the Worker reads them.
 */
export function withStarter(
  list: SessionsResponse,
  starter: DevOptions['starter'],
): SessionsResponse {
  if (starter === 'on') return list
  const change = (session: Session): Session =>
    starter === 'none'
      ? { ...session, startedBy: null, loginAvailable: false }
      : { ...session, loginAvailable: false }
  return {
    ...list,
    sessions: list.sessions.map(change),
    history: list.history.map(change),
  }
}

/**
 * Says whether the reader has a Claude login, and without one writes an
 * account that names none. The admin started the sessions, so a starter login
 * that is not available is also the admin's own missing login.
 */
export function writeReaderLogin(
  server: FakeApiServer,
  options: DevOptions,
): boolean {
  const ownGone = options.role === 'admin' && options.starter === 'off'
  const claudeLogin = options.login && !ownGone
  if (!claudeLogin) {
    const { account } = coreFixtures(options.role)
    server.json('GET', ACCOUNT_PATHS.account, {
      ...account,
      agentLogins: [
        { agent: 'claude', connected: false },
        account.agentLogins[1],
      ],
    })
  }
  return claudeLogin
}

/**
 * The records when the reader has no Claude login: each Claude session that
 * the reader started has a login that is not available, as the Worker says.
 */
export function withReaderLogin(
  list: SessionsResponse,
  readerId: string,
  claudeLogin: boolean,
): SessionsResponse {
  if (claudeLogin) return list
  const change = (session: Session): Session =>
    session.startedBy?.id === readerId && session.choice.agent === 'claude'
      ? { ...session, loginAvailable: false }
      : session
  return {
    ...list,
    sessions: list.sessions.map(change),
    history: list.history.map(change),
  }
}

/**
 * The linked session of `starter=linked`. The reader's message in the first
 * session opened it, as the Worker does when the login of the starter is not
 * available. Its turn has started, and no scripted agent answers, so the page
 * stays still for a capture. It shows as the last tab.
 */
export function seedLinked(
  backend: DevBackend,
  view: WorkspaceView | null,
): void {
  const [first] = backend.open
  if (!first) return
  const linked = targetOf(backend, first)
  if (linked.id === first.id) return
  const now = backend.clock.now()
  const message: UserMessage = {
    id: 'dev-linked-message',
    sessionId: linked.id,
    sender: backend.viewer,
    text: followUpDraft,
    attachments: [],
    choice: linked.choice,
    createdAt: now,
    state: 'sent',
  }
  const turnId = 'dev-linked-turn'
  backend.messages.set(message.id, message)
  backend.stream.emit({ type: 'message.accepted', message })
  backend.stream.emit({
    type: 'turn.started',
    sessionId: linked.id,
    turnId,
    senderId: backend.viewer.id,
    choice: linked.choice,
    startedAt: now,
    messageIds: [message.id],
  })
  backend.recordedTurns.set(linked.id, turnId)
  place(backend, { ...linked, activeTurnId: turnId, activeTurnStartedAt: now })
  const tab: WorkspaceTab = { kind: 'session', sessionId: linked.id }
  const { orgId, workspaceId } = backend.target
  backend.server.json('GET', workspaceViewPath(orgId, workspaceId), {
    view: {
      tabs: [...(view?.tabs ?? []), tab],
      activeTab: tab,
      fileList: view?.fileList ?? 'changes',
      tool: view?.tool ?? 'terminal',
    },
  })
}
