import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { workspacePaths } from '../../src/shared/workspaces'
import { conductorOldDocumentPath } from '../../src/shared/conductor-import'
import { requireFeatureResult } from '../features/result'
import { readPublishedPartRange } from '../conductor-import/activation-data'
import { createHarness, type TestHarness } from '../test-support/harness'
import { activationFixture } from './import-activation.test-support'

let harness: TestHarness
let fixture: Awaited<ReturnType<typeof activationFixture>>
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  fixture = await activationFixture(harness)
})
afterAll(async () => {
  await harness.dispose()
})

it('lets Archive take over incomplete activation and Restore stay stopped until explicit Activate continues the kept attempt', async () => {
  const first = await fixture.activate()
  const send = await fixture.chatRequest(
    sessionPaths.messages(fixture.org.id, 'reservation', first.sessionId),
    {
      id: 'archive-waiter',
      text: 'Retain this message.',
      attachmentIds: [],
      choice: { agent: 'codex', model: 'test-model', effort: 'high' },
    },
  )
  expect(send.status).toBe(202)
  await fixture.advanceToTransport()
  await fixture.connect()
  await fixture.tick()
  const [pending] = await fixture.commands()
  const job = await fixture.readJob()
  const archived = requireFeatureResult(
    await fixture.actor.api.lifecycleRpc.archiveWorkspace(
      fixture.org.id,
      'reservation',
      fixture.user.id,
      fixture.env.APP_ORIGIN,
    ),
  )
  expect(archived.workspace).toMatchObject({
    state: 'archived',
    conductorImport: { activatedAt: null },
  })
  expect(archived.workspace.restoreUntil).not.toBeNull()
  expect(fixture.boat.stopIds).toEqual(['bx_1'])
  expect(fixture.boat.deletedIds).toEqual([])
  await fixture.acknowledge(pending)
  expect(await fixture.readJob()).toBeUndefined()
  expect(
    await fixture.db
      .prepare('SELECT activation_completed_at FROM workspaces WHERE id = ?')
      .bind('reservation')
      .first('activation_completed_at'),
  ).toBeNull()
  expect(
    new TextDecoder().decode(
      await readPublishedPartRange(
        fixture.env,
        fixture.org.id,
        'reservation',
        'code',
        { offset: 0, length: 4 },
      ),
    ),
  ).toBe('code')
  const unavailable = await fixture.request(
    workspacePaths.activate(fixture.org.id, 'reservation'),
    'POST',
    {},
    fixture.reader,
  )
  expect(unavailable.status).toBe(409)
  const starts = fixture.boat.starts.length
  const commands = fixture.boat.commands.length
  const restored = requireFeatureResult(
    await fixture.actor.api.lifecycleRpc.restoreWorkspace(
      fixture.org.id,
      'reservation',
      'document-reader',
      fixture.env.APP_ORIGIN,
    ),
  )
  expect(restored.workspace).toMatchObject({
    state: 'stopped',
    owner: { id: fixture.user.id },
    conductorImport: { activatedAt: null },
  })
  expect(fixture.boat.resumeIds).toEqual([])
  expect(fixture.boat.commands).toHaveLength(commands)
  expect(fixture.boat.starts).toHaveLength(starts)
  expect(
    (
      await fixture.request(
        conductorOldDocumentPath(fixture.org.id, 'reservation', 'old-session'),
      )
    ).status,
  ).toBe(200)
  expect(
    (
      await fixture.request(
        workspacePaths.resume(fixture.org.id, 'reservation'),
        'POST',
        {},
        fixture.reader,
      )
    ).status,
  ).toBe(200)
  expect(await fixture.readJob()).toBeUndefined()
  expect(fixture.received.filter((message) => message.type === 'turn')).toEqual(
    [],
  )
  const continued = await fixture.activate()
  expect(continued.sessionId).toBe(first.sessionId)
  expect(await fixture.readJob()).toMatchObject({
    kind: 'activate',
    attempt: job?.attempt,
    deadlineAt: job?.deadlineAt,
  })
  await fixture.advanceToTransport()
  await fixture.connect()
  await fixture.finish()
  expect(
    await fixture.db
      .prepare('SELECT activation_completed_at FROM workspaces WHERE id = ?')
      .bind('reservation')
      .first('activation_completed_at'),
  ).not.toBeNull()
  expect(fixture.boat.starts).toHaveLength(starts)
  expect(fixture.boat.resumeIds).toEqual(['bx_1'])
  expect(
    (
      await fixture.actor.api.chat.readWorkspace('reservation', (view) =>
        view.message('archive-waiter'),
      )
    )?.text,
  ).toBe('Retain this message.')
  expect(
    fixture.received
      .filter((message) => message.type === 'turn')
      .map((message) => message.message.id),
  ).toEqual(['archive-waiter'])
  fixture.boat.states.set('bx_1', 'archived')
  await fixture.actor.lifecycle.lifecycleStopped()
  expect(
    (
      await fixture.request(
        workspacePaths.resume(fixture.org.id, 'reservation'),
        'POST',
        {},
        fixture.reader,
      )
    ).status,
  ).toBe(200)
  expect(await fixture.readJob()).toMatchObject({
    kind: 'resume',
    turnId: null,
  })
  for (
    let step = 0;
    step < 12 && (await fixture.readJob())?.phase !== 'runner';
    step++
  )
    await fixture.tick()
  expect((await fixture.readJob())?.phase).toBe('runner')
  await fixture.connect()
  await fixture.tick()
  expect(await fixture.readJob()).toBeUndefined()
  expect(await fixture.actor.lifecycle.readLifecycle()).toMatchObject({
    state: 'ready',
    startupPrepared: true,
  })
  expect(fixture.boat.starts).toHaveLength(starts)
  expect(fixture.boat.resumeIds).toEqual(['bx_1', 'bx_1'])
  expect(
    await fixture.db
      .prepare(
        'SELECT first_turn_id FROM workspace_runtime WHERE workspace_id = ?',
      )
      .bind('reservation')
      .first('first_turn_id'),
  ).toBeNull()
})
