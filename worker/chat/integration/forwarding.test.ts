import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  chatHistoryPath,
  workspaceEventsPath,
} from '../../../src/shared/events'
import {
  retryMessagePath,
  sessionPath,
  sessionPaths,
  sessionsPath,
} from '../../../src/shared/sessions'
import { workspacePath } from '../../../src/shared/workspaces'
import { closeSockets, SocketInbox } from '../adapter-sockets.test-support'
import { CLAUDE } from '../harness.test-support'
import { record, string } from '../inputs'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from './outer-runtime.test-support'
import {
  OTHER_WORKSPACE,
  OUTER_ORG,
  OUTER_WORKSPACE,
} from './outer-seed.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('forwards encoded workspace chat writes with their unread body and authenticated headers', async () => {
  fixture = await createOuterRuntime(bundle)
  const created = await fixture.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'POST',
      body: JSON.stringify({ choice: CLAUDE }),
    },
  )
  expect(created.status).toBe(201)
  const sessionId = string(record(record(await created.json()).session).id)
  const message = {
    id: 'outer-ask',
    text: 'Keep this message queued',
    choice: CLAUDE,
    attachmentIds: [],
  }
  const sent = await fixture.request(
    sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    {
      method: 'POST',
      body: JSON.stringify(message),
    },
  )
  expect(sent.status).toBe(202)
  expect(await sent.json()).toMatchObject({
    message: {
      id: 'outer-ask',
      text: 'Keep this message queued',
      state: 'queued',
      sender: { id: 'owner' },
    },
    turnId: null,
  })
  const renamed = await fixture.request(
    sessionPath(OUTER_ORG, OUTER_WORKSPACE, sessionId),
    {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Outer Worker session' }),
    },
  )
  expect(renamed.status).toBe(200)
  expect(await renamed.json()).toMatchObject({
    session: { id: sessionId, title: 'Outer Worker session' },
  })
  const history = await fixture.request(
    chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, sessionId, 1),
  )
  expect(history.status).toBe(200)
  expect(await history.json()).toMatchObject({
    throughEventNumber: 4,
    events: [
      {
        eventNumber: 2,
        event: {
          type: 'message.accepted',
          message: { text: 'Keep this message queued' },
        },
      },
      { eventNumber: 3, event: { type: 'session.updated' } },
      {
        eventNumber: 4,
        event: {
          type: 'session.updated',
          session: { title: 'Outer Worker session' },
        },
      },
    ],
  })
  const other = await fixture.request(sessionsPath(OUTER_ORG, OTHER_WORKSPACE))
  expect(other.status).toBe(200)
  expect(await other.json()).toEqual({ sessions: [], history: [] })
})

it('keeps the Durable Object browser gate on forwarded chat routes', async () => {
  fixture = await createOuterRuntime(bundle)
  const path = sessionsPath(OUTER_ORG, OUTER_WORKSPACE)
  const signedOut = await fixture.request(path, { headers: { Cookie: '' } })
  expect(signedOut.status).toBe(401)
  expect(await signedOut.json()).toMatchObject({
    error: { code: 'sign_in_required' },
  })
  const outsider = await fixture.request(path, {
    headers: { Cookie: fixture.cookies.outsiderCookie },
  })
  expect(outsider.status).toBe(404)
  expect(await outsider.json()).toMatchObject({
    error: { code: 'org_not_found' },
  })
  const otherOrg = await fixture.request(
    sessionsPath('other-org', OUTER_WORKSPACE),
    { headers: { Cookie: fixture.cookies.outsiderCookie } },
  )
  expect(otherOrg.status).toBe(404)
  expect(await otherOrg.json()).toMatchObject({
    error: { code: 'workspace_not_found' },
  })
  const wrongOrigin = await fixture.request(path, {
    headers: { Origin: 'https://other.test' },
  })
  expect(wrongOrigin.status).toBe(403)
  expect(await wrongOrigin.json()).toMatchObject({
    error: { code: 'origin_forbidden' },
  })
  const malformed = await fixture.request(
    `${workspacePath(OUTER_ORG, OUTER_WORKSPACE).replace(encodeURIComponent(OUTER_WORKSPACE), '%ZZ')}/sessions`,
  )
  expect(malformed.status).toBe(404)
  expect(await malformed.json()).toMatchObject({
    error: { code: 'workspace_not_found' },
  })
  const retry = await fixture.request(
    retryMessagePath(
      OUTER_ORG,
      OUTER_WORKSPACE,
      'missing-session',
      'missing-message',
    ),
    {
      method: 'POST',
      body: '{}',
    },
  )
  expect(retry.status).toBe(404)
  expect(await retry.json()).toMatchObject({
    error: { code: 'session_not_found' },
  })
})

it('forwards authenticated event sockets with their replay cursor and subsequent live events', async () => {
  fixture = await createOuterRuntime(bundle)
  const created = await fixture.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'POST',
      body: JSON.stringify({ choice: CLAUDE }),
    },
  )
  expect(created.status).toBe(201)
  const sessionId = string(record(record(await created.json()).session).id)
  const events = await fixture.request(
    workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE, 1),
    {
      headers: { Upgrade: 'websocket' },
    },
  )
  expect(events.status).toBe(101)
  const browser = events.webSocket
  if (!browser) throw new Error('The browser socket is missing.')
  try {
    const inbox = new SocketInbox(browser)
    browser.accept()
    expect(await inbox.next()).toEqual({
      type: 'history',
      history: { events: [], throughEventNumber: 1 },
    })
    const accepted = await fixture.request(
      sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
      {
        method: 'POST',
        body: JSON.stringify({
          id: 'live-ask',
          choice: CLAUDE,
          text: 'New live message',
          attachmentIds: [],
        }),
      },
    )
    expect(accepted.status).toBe(202)
    expect(await inbox.next()).toMatchObject({
      type: 'event',
      envelope: {
        eventNumber: 2,
        event: { type: 'message.accepted', message: { id: 'live-ask' } },
      },
    })
    expect(await inbox.next()).toMatchObject({
      type: 'event',
      envelope: { eventNumber: 3, event: { type: 'session.updated' } },
    })
  } finally {
    await closeSockets(browser)
  }
})
