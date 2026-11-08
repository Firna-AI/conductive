import { afterEach, beforeAll, expect, it } from 'vitest'

import { sessionPath, sessionsPath } from '../../../src/shared/sessions'
import { workspacePath } from '../../../src/shared/workspaces'
import { closeSockets } from '../adapter-sockets.test-support'
import { array } from '../agent-events'
import { CLAUDE } from '../harness.test-support'
import { number, record, string } from '../inputs'
import { outerWorkerBundle } from './outer-runtime.test-support'
import { OUTER_ORG, OUTER_WORKSPACE } from './outer-seed.test-support'
import {
  recoveryWorkspaceFixture,
  type RecoveryWorkspaceFixture,
} from './workspace-recovery.test-support'

let bundle: string
let fixture: RecoveryWorkspaceFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/chat/integration/workspace-recovery-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('keeps hello and live text available during a title write failure and repairs the next workspace update', async () => {
  const active = (fixture = await recoveryWorkspaceFixture(bundle))
  const actor = await active.actor()
  const before = (await actor.readChatWorkspaceSummary()).throughEventNumber
  await active.env.DB.prepare(
    `CREATE TRIGGER fail_agent_title BEFORE UPDATE OF name ON workspaces
     WHEN NEW.id = '${OUTER_WORKSPACE}'
     BEGIN SELECT RAISE(ABORT, 'title write failed'); END`,
  ).run()
  active.runner.emit({ type: 'workspace.title', name: 'The committed title' })
  expect(await active.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 2,
  })
  await active.runner.closed
  const detail = await active.request(workspacePath(OUTER_ORG, OUTER_WORKSPACE))
  expect(detail.status).toBe(200)
  expect(await detail.json()).toMatchObject({
    eventNumber: (await actor.readChatWorkspaceSummary()).throughEventNumber,
    workspace: { name: 'The committed title' },
  })
  const connected = await active.connect('title-recovery-stream')
  expect(connected.welcome).toMatchObject({
    type: 'welcome',
    confirmedThrough: 0,
  })
  await actor.readLifecycle()
  connected.runner.emit({
    type: 'assistant.delta',
    sessionId: 'first-session',
    turnId: 'first-turn',
    messageId: 'live-answer',
    text: 'Text still arrives.',
  })
  expect(await connected.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  await active.env.DB.prepare('DROP TRIGGER fail_agent_title').run()
  await actor.lifecycleStep('title-repair', 'Updating the workspace', 'running')
  expect(
    await active.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
      .bind(OUTER_WORKSPACE)
      .first('name'),
  ).toBe('The committed title')
  const reopened = await active.browser(before)
  const events = array(reopened.history.events, record).map((value) =>
    record(value.event),
  )
  expect(
    events
      .filter((event) => event.type === 'workspace.updated')
      .map((event) => record(event.workspace).name),
  ).toEqual(['The committed title'])
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'assistant.delta',
        text: 'Text still arrives.',
      }),
    ]),
  )
})

it('renames only the first session on the first workspace title and publishes ordered updates to both tabs', async () => {
  const active = (fixture = await recoveryWorkspaceFixture(bundle))
  const created = await active.request(
    sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
    {
      method: 'POST',
      body: JSON.stringify({ choice: CLAUDE }),
    },
  )
  expect(created.status).toBe(201)
  const later = record(record(await created.json()).session)
  await active.restart()
  const connected = await active.connect('session-title-stream')
  await (await active.actor()).readLifecycle()
  const before = number(
    (await active.history(active.first.sessionId)).throughEventNumber,
  )
  const ownerTab = await active.browser(before)
  const memberTab = await active.browser(before, active.cookies.memberCookie)
  const title = connected.runner.emit({
    type: 'workspace.title',
    name: 'Fix chat titles',
  })
  expect(await connected.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  expect((await active.session(active.first.sessionId)).title).toBe(
    'Fix chat titles',
  )
  expect((await active.session(string(later.id))).title).toBe('New session')
  await ownerTab.inbox.next()
  await ownerTab.inbox.next()
  await memberTab.inbox.next()
  await memberTab.inbox.next()
  const live = () =>
    ownerTab.messages.filter((message) => message.type === 'event')
  const events = live()
  expect(
    events.map((message) => {
      const envelope = record(message.envelope)
      return [envelope.eventNumber, record(envelope.event).type]
    }),
  ).toEqual([
    [before + 1, 'workspace.title'],
    [before + 2, 'session.updated'],
  ])
  expect(record(events[1].envelope).event).toMatchObject({
    type: 'session.updated',
    session: { id: active.first.sessionId, title: 'Fix chat titles' },
  })
  expect(memberTab.messages).toEqual(ownerTab.messages)
  const history = await active.history(active.first.sessionId)
  connected.runner.resend(title)
  expect(await connected.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  expect(await active.history(active.first.sessionId)).toEqual(history)
  expect(live()).toEqual(events)
  const renamed = await active.request(
    sessionPath(OUTER_ORG, OUTER_WORKSPACE, active.first.sessionId),
    {
      method: 'PATCH',
      headers: { Cookie: active.cookies.memberCookie },
      body: JSON.stringify({ title: OUTER_WORKSPACE }),
    },
  )
  expect(renamed.status).toBe(200)
  await closeSockets(ownerTab.socket, memberTab.socket)
  await active.restart()
  const reconnected = await active.connect('later-title-stream')
  reconnected.runner.emit({ type: 'workspace.title', name: 'A later title' })
  expect(await reconnected.runner.inbox.next()).toMatchObject({
    type: 'confirm',
    throughEventNumber: 1,
  })
  expect((await active.session(active.first.sessionId)).title).toBe(
    OUTER_WORKSPACE,
  )
})
