import { afterEach, beforeAll, expect, it } from 'vitest'

import { workspacePath } from '../../../src/shared/workspaces'
import { array } from '../agent-events'
import { record } from '../inputs'
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
