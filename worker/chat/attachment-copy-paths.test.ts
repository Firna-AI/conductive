import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { FakeRunner } from '../test-support/fake-runner'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  attachmentFixture,
  ATTACHMENT_IGNORE_BYTES,
  ATTACHMENT_REPOSITORY_DIRECTORY,
  FILE_BYTES,
  held,
} from './attachment.test-support'
import { prepareMessageAttachments } from './attachment-copy'
import { providerCopy } from './attachment-copy.test-support'
import { ATTACHMENTS_DIRECTORY } from './attachment-record'
import { storeAttachment } from './attachment-storage'
import { WORKSPACE_ID } from './harness.test-support'
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

it('copies before delivery and preserves copy proof across reconnects while new messages and computers get fresh copies', async () => {
  const longMessageId = 'valid-message-'.padEnd(400, 'x')
  const entered = held<void>()
  const release = held<void>()
  const provider = providerCopy({
    entered: () => entered.resolve(),
    hold: release.promise,
  })
  const fixture = await attachmentFixture(harness, {
    prepareAttachments: (...args) =>
      prepareMessageAttachments(harness.env, ...args, provider.fetch),
  })
  await harness.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind('sandbox-one', WORKSPACE_ID)
    .run()
  const upload = (id: string, name: string) =>
    storeAttachment(
      harness.env,
      {
        orgId: fixture.org.id,
        uploaderUserId: fixture.owner.id,
        target: fixture.target,
        name,
        kind: 'file',
        mediaType: 'application/pdf',
      },
      FILE_BYTES,
      { now: () => TEST_TIME, newId: () => id },
    )
  const file = await upload('pdf-file', 'Project plan.PDF')
  const unsafe = await upload('unsafe-file', 'Project plan.pdf/notes')
  const fileIds = [file.id, unsafe.id]
  const session = await fixture.createSession()
  const runner = await fixture.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, protocolVersion: 2 }),
  )
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const sending = fixture.sendAttachment(session.id, longMessageId, fileIds)
  await entered.promise
  expect(runner.commands).toEqual([])
  release.resolve()
  expect((await sending).status).toBe(202)
  await fixture.drainAttachments()
  expect(provider.copies).toEqual([
    ATTACHMENT_IGNORE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
  ])
  expect(provider.paths[0]).toBe(
    `${ATTACHMENT_REPOSITORY_DIRECTORY}/${ATTACHMENTS_DIRECTORY}/.gitignore`,
  )
  expect(provider.paths[1]).toMatch(
    /^\/home\/user\/code\/attachment-repo\/\.context\/attachments\/[a-f0-9]{32}\/Project-plan\.pdf$/,
  )
  expect(provider.paths[2]).toMatch(
    /^\/home\/user\/code\/attachment-repo\/\.context\/attachments\/[a-f0-9]{32}\/Project-plan\.pdf-notes$/,
  )
  const pending = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
    view.pending(),
  )
  expect(pending[0]).toMatchObject({
    attachments: fileIds.map((attachmentId, index) => ({
      attachmentId,
      relativePath: provider.paths[index + 1]?.slice(
        ATTACHMENT_REPOSITORY_DIRECTORY.length + 1,
      ),
    })),
  })
  expect(messageCommands(runner, longMessageId)[0]?.attachments[0]?.path).toBe(
    provider.paths[1],
  )
  expect(messageCommands(runner, longMessageId)[0]).toMatchObject({
    type: 'turn',
    credential: { agent: 'claude', kind: 'api-key', token: expect.any(String) },
  })
  expect(messageCommands(runner, longMessageId)[0]).not.toHaveProperty('login')
  runner.disconnect()
  await fixture.connect(runner)
  await fixture.drainAttachments()
  expect(provider.copies).toHaveLength(3)
  runner.disconnect()
  await harness.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind('sandbox-two', WORKSPACE_ID)
    .run()
  await fixture.connect(runner)
  await fixture.drainAttachments()
  expect(provider.copies).toEqual([
    ATTACHMENT_IGNORE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
    ATTACHMENT_IGNORE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
  ])
  expect(provider.paths.slice(3)).toEqual(provider.paths.slice(0, 3))
  expect(
    (await fixture.sendAttachment(session.id, 'another-file-message', fileIds))
      .status,
  ).toBe(202)
  await fixture.drainAttachments()
  expect(provider.copies).toEqual([
    ATTACHMENT_IGNORE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
    ATTACHMENT_IGNORE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
    ATTACHMENT_IGNORE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
  ])
  expect(provider.paths[7]).not.toBe(provider.paths[1])
  const message = messageCommands(runner, 'another-file-message')[0]
  expect(message?.type).toBe('message')
  expect(message?.attachments[0]?.path).toBe(provider.paths[7])
  expect(message).not.toHaveProperty('login')
  expect(message).not.toHaveProperty('credential')
  runner.disconnect()
})
