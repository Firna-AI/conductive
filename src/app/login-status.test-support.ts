import { ACCOUNT_PATHS, type AgentLoginStatus } from '../shared/account'
import { sessionsPath } from '../shared/sessions'
import { ShownWorkspaces } from '../shell/workspace/shown-workspaces'
import { newSessionRecord } from '../chat/state/test-kit'
import { loginReader, sessionLoginOf } from '../chat/state/session-login'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME, fakeUser } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { accountWithDefaults, acme } from './default-logins.test-support'
import {
  HeldRequests,
  ManualDelay,
  ManualVisibility,
  requestLines,
  testServices,
} from './test-kit'

export const codexLogin = {
  agent: 'codex',
  connected: true,
  kind: 'token',
  noReuse: true,
  updatedAt: FAKE_TIME,
} as const satisfies AgentLoginStatus

export function serveLoginStatus(
  server: FakeApiServer,
  status: 'usable' | 'failed' | 'missing',
  defaultLogin: 'own' | 'org' | null,
  personal: AgentLoginStatus = codexLogin,
): void {
  const account = accountWithDefaults('admin', {
    claude: null,
    codex: defaultLogin,
  })
  server.json('GET', ACCOUNT_PATHS.account, {
    ...account,
    agentLogins: [
      { agent: 'claude', connected: false },
      status === 'missing'
        ? { agent: 'codex', connected: false }
        : {
            ...personal,
            ...(status === 'failed' ? { unusableCause: 'refresh_denied' } : {}),
          },
    ],
  })
}

export async function startedLoginOwner(
  status: 'usable' | 'failed' | 'missing' = 'usable',
  defaultLogin: 'own' | 'org' | null = 'own',
) {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const timer = new ManualDelay()
  const visible = new ManualVisibility()
  serveLoginStatus(server, status, defaultLogin)
  const app = new AppModel(
    testServices(server, {
      fetch: held.fetch,
      delay: timer.delay,
      visible,
      events: {
        open: (target, handlers) =>
          server.events.subscribe(target.afterEventNumber, handlers.message),
      },
    }),
  )
  await app.start()
  const kept = new ShownWorkspaces(app, fakeUser.id, () => true)
  const chat = kept.view({
    orgId: acme.id,
    workspaceId: FAKE_IDS.workspace,
  }).chat
  const observation = {
    agent: 'codex',
    orgId: acme.id,
    login: { type: 'personal', userId: fakeUser.id },
    available: false,
  } as const
  const session = newSessionRecord(
    FAKE_IDS.session,
    {
      agent: 'codex',
      model: 'gpt-5.2',
      effort: 'high',
      fast: false,
    },
    null,
    { login: observation.login },
  )
  server.json('GET', sessionsPath(acme.id, FAKE_IDS.workspace), {
    sessions: [session],
    history: [],
    eventNumber: server.events.history().throughEventNumber,
  })
  const view = () => {
    const snapshot = chat.getSnapshot()
    const current = snapshot.sessions.find((item) => item.id === session.id)
    return current ? sessionLoginOf(current, loginReader(snapshot)) : null
  }
  const reads = () =>
    requestLines(server).filter(
      (line) => line === `GET ${ACCOUNT_PATHS.account}`,
    ).length
  const emit = (available: boolean) => {
    server.events.emit({
      workspaceId: FAKE_IDS.workspace,
      eventNumber: server.events.history().throughEventNumber + 1,
      occurredAt: FAKE_TIME,
      event: {
        type: 'session.updated',
        session: { ...session, loginAvailable: available },
      },
    })
  }
  return {
    app,
    server,
    held,
    timer,
    visible,
    kept,
    chat,
    session,
    observation,
    view,
    reads,
    emit,
  }
}
