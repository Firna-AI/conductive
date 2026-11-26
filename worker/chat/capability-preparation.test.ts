import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { workspaceCapabilitiesPath } from '../../src/shared/secrets'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
import { attachmentFixture, held } from './attachment.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { noticeFixture } from './capability-notices.test-support'
import { capabilitySecret } from './capability-context.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})

beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('reads the first facts after a held file copy and gives the change only in those facts', async () => {
  const entered = held<void>()
  const release = held<void>()
  const f = await attachmentFixture(harness, {
    attachmentSandboxId: async () => 'sandbox-capabilities',
    prepareAttachments: async () => {
      entered.resolve()
      await release.promise
      return 'sandbox-capabilities'
    },
  })
  harness.env.WORKSPACES = harness.native.bindings.WORKSPACES
  const file = await f.upload()
  const session = await f.createSession()
  const runner = await f.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, capabilityNotices: true }),
  )
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  try {
    expect(
      (await f.sendAttachment(session.id, 'first-file', [file.id])).status,
    ).toBe(202)
    await entered.promise
    expect(runner.commands).toEqual([])
    const secret = await capabilitySecret(f, 'DEPLOY_KEY')
    const response = await harness.request(
      workspaceCapabilitiesPath(f.org.id, WORKSPACE_ID),
      f.ownerCookie,
      {
        method: 'PATCH',
        body: JSON.stringify({ preapprovedSecretIds: [secret.id] }),
      },
    )
    expect(response.status).toBe(200)
    expect(
      (await f.history(session.id)).events.filter(
        ({ event }) => event.type === 'capabilities.changed',
      ),
    ).toEqual([])
    release.resolve()
    await f.drainAttachments()
    expect(runner.commands).toHaveLength(1)
    expect(runner.commands[0]).toMatchObject({
      type: 'turn',
      capabilities: { secrets: ['DEPLOY_KEY'] },
    })
    expect(runner.commands[0]).not.toHaveProperty('notices')
  } finally {
    release.resolve()
    await f.drainAttachments()
  }
})

it('keeps later notes unsent when a turn is resent before its start receipt', async () => {
  const f = await noticeFixture(harness)
  const session = await f.createSession()
  await f.send(session.id, 'first')
  await f.seedNotes(
    [session.id],
    [{ kind: 'pre-approval-removed', names: ['DEPLOY_KEY'] }],
  )
  const replacement = await f.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, capabilityNotices: true }),
  )
  const turn = replacement.commands.at(-1)
  expect(turn?.type).toBe('turn')
  if (turn?.type !== 'turn') throw new Error('The resent turn is missing.')
  expect(turn).not.toHaveProperty('notices')
  expect(await f.waitingNotes(session.id)).toMatchObject([{ sentTurnId: null }])
  replacement.emit({ type: 'runner.ready' })
  replacement.emit({
    type: 'turn.started',
    sessionId: session.id,
    turnId: turn.turnId,
    senderId: f.owner.id,
    choice: turn.message.choice,
    startedAt: f.clock.now(),
    messageIds: ['first'],
  })
  await f.drain()
  expect(replacement.commands.at(-1)).toMatchObject({
    type: 'notice',
    sessionId: session.id,
    turnId: turn.turnId,
    notices: [{ text: 'Octocat removed the pre-approval of `DEPLOY_KEY`.' }],
  })
})
