import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { attachmentFixture } from './attachment.test-support'
import { messageCommands } from './turn-lifecycle.test-support'

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

it('closes after a failed copy-proof save and recovers redelivery with committed proof', async () => {
  for (const boundary of ['rejected', 'committed'] as const) {
    await harness.reset()
    let copies = 0
    const fixture = await attachmentFixture(harness, {
      attachmentSandboxId: async () => 'sandbox-one',
      prepareAttachments: async (
        _workspace,
        _sender,
        _message,
        _attachments,
        copied,
      ) => {
        if (copied !== 'sandbox-one') copies++
        return 'sandbox-one'
      },
    })
    const file = await fixture.upload()
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    fixture.storage.beforeCommit = async (staged) => {
      if (
        !staged.writes.some((key) => key.startsWith('chat:v1:attachment-copy:'))
      )
        return
      fixture.storage.beforeCommit = null
      if (boundary === 'rejected')
        throw new Error('Injected copy-proof save failure')
      fixture.storage.crashAfterCommit = true
    }
    expect(
      (await fixture.sendAttachment(session.id, 'proof-recovery', [file.id]))
        .status,
    ).toBe(202)
    await expect(fixture.drainAttachments()).rejects.toThrow(
      boundary === 'rejected'
        ? 'Injected copy-proof save failure'
        : 'Injected post-commit crash',
    )
    expect(fixture.transport.closedConnections).toBe(1)
    expect(messageCommands(runner, 'proof-recovery')).toEqual([])
    fixture.restart()
    await fixture.connect(runner)
    await fixture.drainAttachments()
    expect(messageCommands(runner, 'proof-recovery')).toHaveLength(1)
    expect(copies).toBe(boundary === 'rejected' ? 2 : 1)
    runner.disconnect()
    await fixture.drainAttachments()
  }
})
