// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import type { Session } from '../../shared/generated/Session'
import { createApiClient } from '../../app/api/client'
import { accountWithDefaults } from '../../app/default-logins.test-support'
import { Store } from '../../app/store'
import type { AccountResponse } from '../../shared/account'
import { byRole, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  fakeUser,
} from '../../test-support/fixtures/core'
import { asMessageField, typeMessage } from '../../test-support/message-field'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../test-support/mount'
import { ChatController } from '../state/controller'
import { withSessions } from '../state/linked-kit'
import type { ChatSources } from '../state/sources'
import { manualTimers } from '../state/test-kit'
import { WorkspaceChatView } from '../WorkspaceChat'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The title of the notice in the session of the fake, on Opus 5.5. */
const connect = 'Connect Claude to use Opus 5.5'

/**
 * The account that the app keeps before a read: the server named the own
 * Claude login of the reader, the admin, as the default login.
 */
const ownDefault = accountWithDefaults(
  'admin',
  { claude: 'own', codex: 'own' },
  { ownLogins: true },
)

/** The account of a later read: the org login of Acme serves the reader. */
const orgDefault = accountWithDefaults(
  'admin',
  { claude: 'org', codex: 'own' },
  { ownLogins: true },
)

/** The account after an admin removed the org login: no login serves. */
const noLogin = accountWithDefaults('admin', { claude: null, codex: null })

/** The reader's own session, whose own login the server can no longer use. */
const ownLoginFailed = (session: Session): Session => ({
  ...session,
  login: { type: 'personal', userId: fakeUser.id },
  loginAvailable: false,
})

/**
 * The watches of missing-login notices that the account owner of the app
 * keeps: one entry for each watch that has not ended. A second end of a
 * watch changes nothing, as in the owner.
 */
function noticeWatches() {
  const active = new Set<object>()
  let started = 0
  const watch = () => {
    started += 1
    const notice = {}
    active.add(notice)
    return () => {
      active.delete(notice)
    }
  }
  return { watch, counts: () => ({ started, active: active.size }) }
}

/**
 * A chat that the app keeps, loaded on the fake API. Its sources give the
 * account of `account` and take the watches of its notices. It needs no
 * org, member, or workspace list.
 */
async function keptChat(
  account: Store<AccountResponse | null>,
  watchMissingLogin: () => () => void,
) {
  const server = new FakeApiServer()
  withSessions(server, ownLoginFailed)
  const sources: ChatSources = {
    account,
    org: new Store(null),
    models: new Store(coreFixtures().models.models),
    members: new Store(null),
    workspaces: new Store(null),
    watchWorkspaces: () => () => undefined,
    watchMissingLogin,
  }
  const controller = new ChatController({
    target: { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace },
    client: createApiClient(server.fetch),
    subscribe: (_target, after, listener) =>
      server.events.subscribe(after, (message) => listener.message(message)),
    timers: manualTimers(),
    sources,
  })
  onTestFinished(controller.stop)
  await controller.start()
  return controller
}

describe('the missing-login notice of the composer', () => {
  it('watches the login status while it shows, keeps one watch while the reader types, and ends it when a read names a login that serves and when the chat unmounts', async () => {
    holdAnimationFrames()
    const account = new Store<AccountResponse | null>(ownDefault)
    const watches = noticeWatches()
    const controller = await keptChat(account, watches.watch)
    const view = await mount(
      <WorkspaceChatView controller={controller} viewport="desktop" />,
    )
    await waitFor(() => queryByText(connect), 'the missing-login notice')
    const state = () => ({
      notice: queryByText(connect) !== null,
      ...watches.counts(),
    })

    const shown = state()
    typeMessage(asMessageField(byRole('textbox', 'Message')), 'Add tests.')
    const typed = state()
    await act(async () => account.set(orgDefault))
    const served = state()
    await act(async () => account.set(noLogin))
    const shownAgain = state()
    await view.unmount()
    const unmounted = state()

    expect({ shown, typed, served, shownAgain, unmounted }).toEqual({
      shown: { notice: true, started: 1, active: 1 },
      typed: { notice: true, started: 1, active: 1 },
      served: { notice: false, started: 1, active: 0 },
      shownAgain: { notice: true, started: 2, active: 1 },
      unmounted: { notice: false, started: 2, active: 0 },
    })
  })
})
