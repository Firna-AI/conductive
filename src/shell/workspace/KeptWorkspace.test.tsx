// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { HeldRequests, requestLines } from '../../app/test-kit'
import { ACCOUNT_PATHS } from '../../shared/account'
import type { AgentChoice } from '../../shared/agents'
import { API_PATHS, orgPath } from '../../shared/api'
import { membersPath } from '../../shared/members'
import { sessionsPath } from '../../shared/sessions'
import { workspacePath, workspacePaths } from '../../shared/workspaces'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, fakeUsers } from '../../test-support/fixtures/core'
import { fakeMacRequest } from '../../test-support/fixtures/devices'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { refusedReport } from '../../test-support/recorded-repairs'
import { click, settle, typeText } from '../test-mount'
import { startedApp } from '../test-render'
import {
  answer,
  away,
  bodiesOf,
  chatRequests,
  draftOf,
  emit,
  fieldNamed,
  headerName,
  here,
  id,
  isOff,
  lastEvent,
  messageField,
  mountTab,
  notices,
  org,
  recordingSocket,
} from './kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const nameLost = 'The new workspace name is unavailable'

describe('a workspace that the tab showed', () => {
  test('shows at once on a return, and each socket asks only for the events after its last one', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    emit(server, refusedReport('workspace.title', true))
    const held = new HeldRequests(server)
    const socket = recordingSocket(server)
    const app = await startedApp(server, {
      fetch: held.fetch,
      events: socket.source,
    })
    const { view, go } = mountTab(app)
    await settle()
    typeText(messageField(view), 'Keep this draft')
    click(byLabel('Dismiss', view))
    const first = socket.opens.length
    go(away)
    await settle()
    expect(socket.connected()).toBe(0)
    const kept = lastEvent(server)
    const { sessions } = workspaceFixtures().sessions
    emit(server, { type: 'workspace.title', name: 'Saved addresses' })
    emit(server, {
      type: 'session.updated',
      session: { ...sessions[0], title: 'Address lookups' },
    })
    const before = server.requests.length
    held.hold('POST', workspacePaths.open(org, id))

    go(here)

    // The kept workspace shows while its open waits.
    expect(headerName(view)).toBe(workspaceFixtures().detail.workspace.name)
    expect(view.textContent).toContain(answer)
    expect(draftOf(view)).toBe('Keep this draft')
    expect(notices(view)).toEqual([`${nameLost} now`])
    await act(async () => held.release('POST', workspacePaths.open(org, id)))
    await settle()
    expect(socket.opens.slice(first)).toEqual([kept, kept])
    expect(chatRequests(server, before)).toEqual([
      `POST ${workspacePaths.open(org, id)}`,
    ])
    expect(headerName(view)).toBe('Saved addresses')
    expect(queryByRole('button', 'Address lookups', view)).not.toBeNull()
    // The name came in a full report, so the failed repair is over.
    expect(notices(view)).toEqual([])
  })

  test('opens no socket of the chat while away, also when its first load ends then', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const socket = recordingSocket(server)
    const app = await startedApp(server, {
      fetch: held.fetch,
      events: socket.source,
    })
    held.holdAnswer('GET', workspacePath(org, id))
    const { view, go } = mountTab(app)
    await settle()
    go(away)
    await settle()
    const opened = [...socket.opens]
    await act(async () => held.release('GET', workspacePath(org, id)))
    await settle()
    expect(socket.opens).toEqual(opened)
    expect(socket.connected()).toBe(0)
    go(here)
    await settle()
    expect(view.textContent).toContain(answer)
    expect(socket.opens.slice(opened.length)).not.toContain(0)
  })

  test('waits for its own open on a return after an open that failed', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = await startedApp(server, {
      fetch: held.fetch,
      events: recordingSocket(server).source,
    })
    const open = workspacePaths.open(org, id)
    const busy = { error: { code: 'internal_error', message: 'Busy.' } }
    server.json('POST', open, busy, 500)
    const { view, go } = mountTab(app)
    await settle()
    expect(view.textContent).toContain("The workspace didn't open")
    go(away)
    await settle()
    server.json('POST', open, workspaceFixtures().detail)
    held.hold('POST', open)
    go(here)
    expect(view.textContent).not.toContain("The workspace didn't open")
    expect(queryByLabel('Opening the workspace', view)).not.toBeNull()
    await act(async () => held.release('POST', open))
    await settle()
    expect(headerName(view)).toBe(workspaceFixtures().detail.workspace.name)
  })

  test('starts empty in a new tab of the app', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const first = recordingSocket(server)
    const tab = mountTab(await startedApp(server, { events: first.source }))
    await settle()
    typeText(messageField(tab.view), 'Only in the first tab')
    const before = server.requests.length
    const second = recordingSocket(server)
    const other = mountTab(await startedApp(server, { events: second.source }))
    await settle()
    expect(draftOf(other.view)).toBe('')
    expect(second.opens[0]).toBe(0)
    expect(chatRequests(server, before)).toContain(
      `GET ${workspacePath(org, id)}`,
    )
  })

  test('is forgotten at a sign-out and when another person signs in', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const socket = recordingSocket(server)
    const app = await startedApp(server, { events: socket.source })
    const { view } = mountTab(app)
    await settle()
    typeText(messageField(view), 'A draft of the first person')
    await act(() => app.account.signOut())
    expect(app.boot.get().state).toBe('signed-out')
    const signedOut = socket.opens.length
    await act(() => app.start())
    await settle()
    expect(draftOf(view)).toBe('')
    expect(socket.opens.slice(signedOut)).toContain(0)
    typeText(messageField(view), 'A draft before another person')
    server.json('GET', API_PATHS.session, { user: fakeUsers[1] })
    await act(() => app.start())
    await settle()
    expect(draftOf(view)).toBe('')
  })

  test('takes a login that the tab saves while away, and keeps its draft and Send', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { account } = coreFixtures()
    server.json('GET', ACCOUNT_PATHS.account, {
      ...account,
      agentLogins: account.agentLogins.map((login) =>
        login.agent === 'claude'
          ? { agent: 'claude', connected: false }
          : login,
      ),
    })
    // Priya started the session, and her login is not available. So a
    // message of the reader needs the reader's own login, as the account says.
    const { sessions } = workspaceFixtures()
    const [shown, ...others] = sessions.sessions
    const priyas = { ...shown, startedBy: senderSnapshot(fakeUsers[1]) }
    server.json('GET', sessionsPath(org, id), {
      ...sessions,
      sessions: [{ ...priyas, loginAvailable: false }, ...others],
    })
    const socket = recordingSocket(server)
    const app = await startedApp(server, { events: socket.source })
    const { view, go } = mountTab(app)
    await settle()
    typeText(messageField(view), 'Keep this draft')
    expect(view.textContent).toContain('Connect Claude to use')
    expect(isOff(byLabel('Send', view))).toBe(true)
    click(byRole('button', 'Connect Claude', view))
    await settle()
    typeText(fieldNamed(view, 'Subscription token'), 'token-from-claude')
    click(byRole('button', 'Connect', view))
    await settle()
    const first = socket.opens.length
    const kept = lastEvent(server)
    const before = server.requests.length

    go(here)

    expect(view.textContent).not.toContain('Connect Claude to use')
    expect(draftOf(view)).toBe('Keep this draft')
    expect(isOff(byLabel('Send', view))).toBe(false)
    await settle()
    expect(socket.opens.slice(first)).toEqual([kept, kept])
    expect(chatRequests(server, before)).toEqual([
      `POST ${workspacePaths.open(org, id)}`,
    ])
  })

  test('follows the default model, the org name, and the members that the app holds', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({
      conversation: 'interrupted',
      macCommands: 'waiting',
    })
    const { account, orgs } = coreFixtures()
    const [cal, priya] = fakeUsers
    // The card of a waiting Mac command names the org of its workspace.
    const { workspaceName } = fakeMacRequest()
    server.json('GET', API_PATHS.session, { user: priya })
    server.json('GET', ACCOUNT_PATHS.account, { ...account, user: priya })
    const app = await startedApp(server, {
      events: recordingSocket(server).source,
    })
    const { view, go } = mountTab(app)
    await settle()
    expect(view.textContent).toContain(`${cal.displayName} stopped the agent`)
    expect(view.textContent).toContain(
      `${workspaceName}, in ${orgs.orgs[0].name}`,
    )
    go(away)
    await settle()
    const sonnet: AgentChoice = {
      agent: 'claude',
      model: 'Sonnet 5.5',
      effort: 'medium',
    }
    server.json('PUT', ACCOUNT_PATHS.defaultModel, { choice: sonnet })
    server.json('PATCH', orgPath(org), {
      org: { ...orgs.orgs[0], name: 'Acme Labs' },
    })
    await act(() => app.account.setDefaultChoice(sonnet))
    await act(() => app.renameOrg(org, { name: 'Acme Labs' }))
    const before = server.requests.length

    go(here)

    expect(view.textContent).toContain(`${workspaceName}, in Acme Labs`)
    click(byLabel('New session', view))
    await settle()
    const created = await bodiesOf(
      server,
      'POST',
      sessionsPath(org, id),
      before,
    )
    expect(created).toEqual([{ choice: sonnet }])
    const memberReads = requestLines(server).filter(
      (line) => line === `GET ${membersPath(org)}`,
    )
    expect(memberReads).toHaveLength(1)
  })
})
