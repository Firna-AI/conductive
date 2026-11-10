import type { StoredWorkspaceStartJob } from './start-job-codec'
import { IMPORT_CHECKPOINT_KEY } from './import-activation-cleanup'
import { expect, it } from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import {
  importSessionId,
  runnerImportWire,
} from '../../src/shared/runner-import'
import { conductorOldDocumentPath } from '../../src/shared/conductor-import'
import { TEST_TIME } from '../test-support/harness'
import { setupActivationTests } from './import-activation-test-hooks'
import {
  lifecycleCommandBody,
  lifecycleStartupScript,
} from './command-test-support'
import { workspacePaths } from '../../src/shared/workspaces'
import { SOFTWARE } from './backend-test-support'
import { readPublishedPartRange } from '../conductor-import/activation-data'
import { storeAttachment } from '../chat/attachment-storage'
import { seedPublishedImage } from './published-image-test-support'
import { createHash } from 'node:crypto'

const fixtureForTest = setupActivationTests(true)

it('admits one real activation session and holds messages and attachments until restore and startup finish', async () => {
  const fixture = fixtureForTest()
  const [first, duplicate] = await Promise.all([
    fixture.activate(),
    fixture.activate(),
  ])
  expect(duplicate.sessionId).toBe(first.sessionId)
  expect(first.workspace.conductorImport?.activatedAt).toBeNull()
  const runtime = await fixture.db
    .prepare(
      'SELECT session_id AS sessionId, first_turn_id AS turnId, first_message_id AS messageId FROM workspace_runtime WHERE workspace_id = ?',
    )
    .bind('reservation')
    .first()
  expect(runtime).toEqual({
    sessionId: first.sessionId,
    turnId: null,
    messageId: null,
  })
  expect(
    (
      await fixture.actor.api.chat.readWorkspace('reservation', (view) =>
        view.session(first.sessionId),
      )
    )?.startedBy?.id,
  ).toBe('document-reader')
  const attachmentBytes = new Uint8Array([0, 255, 128, 13, 10, 65])
  const attachment = await storeAttachment(
    fixture.env,
    {
      orgId: fixture.org.id,
      uploaderUserId: 'document-reader',
      target: { type: 'workspace', workspaceId: 'reservation' },
      name: 'binary.dat',
      kind: 'file',
      mediaType: 'application/octet-stream',
    },
    attachmentBytes,
    { now: () => TEST_TIME, newId: () => 'activation-attachment' },
  )
  const sent = await fixture.chatRequest(
    sessionPaths.messages(fixture.org.id, 'reservation', first.sessionId),
    {
      id: 'queued-import-message',
      text: 'Keep my exact message.',
      attachmentIds: [attachment.id],
      choice: { agent: 'codex', model: 'test-model', effort: 'high' },
    },
  )
  expect(sent.status, await sent.clone().text()).toBe(202)
  await fixture.advanceToTransport()
  expect(fixture.boat.starts[0]).toMatchObject({ from: 'older-good-image' })
  expect(
    await fixture.db
      .prepare('SELECT runner_protocol_version FROM workspaces WHERE id = ?')
      .bind('reservation')
      .first('runner_protocol_version'),
  ).toBe(1)
  expect(fixture.boat.commands.map(lifecycleCommandBody).join('\n')).toContain(
    SOFTWARE.url,
  )
  expect(
    fixture.boat.commands
      .map(lifecycleStartupScript)
      .filter((body) => body !== null),
  ).toEqual([])
  await fixture.connect()
  expect(await fixture.actor.lifecycle.readLifecycle()).toMatchObject({
    state: 'starting',
    startupPrepared: false,
    runnerConnected: true,
  })
  const outgoing = fixture.received
  expect(outgoing.filter((message) => message.type === 'turn')).toEqual([])
  expect(fixture.attachments.paths).toEqual([])
  await fixture.finish()
  expect(fixture.preparations.some((entry) => entry.phase === 'startup')).toBe(
    true,
  )
  expect(
    fixture.preparations
      .filter((entry) => !entry.prepared)
      .every((entry) => entry.copies === 0),
  ).toBe(true)
  expect(fixture.attachments.copies).toEqual([
    new Uint8Array([42]),
    attachmentBytes,
  ])
  expect(await fixture.actor.lifecycle.readLifecycle()).toMatchObject({
    state: 'working',
    startupPrepared: true,
  })
  expect(
    await fixture.db
      .prepare('SELECT activation_completed_at FROM workspaces WHERE id = ?')
      .bind('reservation')
      .first('activation_completed_at'),
  ).toBeGreaterThanOrEqual(TEST_TIME)
  const continuation = await fixture.actor.api.chat.readWorkspace(
    'reservation',
    (view) => view.session(importSessionId('old-session')),
  )
  expect(continuation).toMatchObject({
    startedBy: { id: fixture.user.id },
    conductorImport: { documentId: 'old-session', preparation: 'prepared' },
  })
  await fixture.take()
  const released = fixture.received.filter((message) => message.type === 'turn')
  expect(released).toHaveLength(1)
  const protocol = fixture.received.map((message) =>
    message.type === 'import.command' ? message.action.kind : message.type,
  )
  expect(protocol.indexOf('finish')).toBeGreaterThan(
    protocol.indexOf('restore'),
  )
  expect(protocol.indexOf('turn')).toBeGreaterThan(protocol.indexOf('finish'))
  expect(released[0]).toMatchObject({
    message: { id: 'queued-import-message', text: 'Keep my exact message.' },
    credential: { agent: 'codex', kind: 'api-key' },
  })
  const chunks = fixture.received
    .filter((message) => message.type === 'import.command')
    .filter(
      (message) =>
        message.action.kind === 'chunk' && message.action.part.id === 'code',
    )
  expect(chunks.length).toBeGreaterThan(1)
  let offset = 0
  for (const command of chunks) {
    if (command.action.kind !== 'chunk') throw new Error('Missing chunk.')
    const bytes = Buffer.from(command.action.base64, 'base64')
    expect(command.action.offset).toBe(offset)
    expect(bytes.length).toBe(command.action.length)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      command.action.sha256,
    )
    expect(
      new TextEncoder().encode(runnerImportWire(command)).length,
    ).toBeLessThan(1_048_576)
    offset += bytes.length
  }
  expect(offset).toBe(1_000_000)
  expect(
    fixture.boat.commands
      .map(lifecycleStartupScript)
      .filter((body) => body === 'echo restored-startup'),
  ).toHaveLength(1)
  expect(
    (
      await fixture.request(
        conductorOldDocumentPath(fixture.org.id, 'reservation', 'old-session'),
      )
    ).status,
  ).toBe(200)
})

it('keeps stored work after a disk failure and waits for explicit activation retry', async () => {
  const fixture = fixtureForTest()
  await fixture.activate()
  await fixture.advanceToTransport()
  await fixture.connect()
  for (let step = 0; step < 12; step++) {
    await fixture.tick()
    const commands = await fixture.commands()
    for (const command of commands) {
      if (command.action.kind === 'preflight') {
        await fixture.acknowledge(command, {
          ok: false,
          error: {
            code: 'import_disk_space',
            message:
              'The stored work needs 100 bytes. The disk has 1 byte available. Your stored work is kept. Try again.',
            requiredBytes: '100',
            availableBytes: '1',
          },
        })
      } else await fixture.acknowledge(command)
    }
    if ((await fixture.readJob())?.failure) break
  }
  for (let step = 0; step < 5 && (await fixture.readJob()); step++)
    await fixture.tick()
  expect(await fixture.readJob()).toBeUndefined()
  expect(await fixture.actor.lifecycle.waitLifecycleStart()).toMatchObject({
    ok: false,
    error: { code: 'import_disk_space' },
  })
  expect(
    fixture.boat.commands
      .map(lifecycleStartupScript)
      .filter((body) => body !== null),
  ).toEqual([])
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
  ).toBe('AAAA')
  const before = fixture.boat.starts.length
  const resumed = await fixture.request(
    workspacePaths.resume(fixture.org.id, 'reservation'),
    'POST',
    {},
    fixture.reader,
  )
  expect(resumed.status).toBe(200)
  expect(fixture.boat.starts).toHaveLength(before)
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
  ).toBe('AAAA')
  const firstAttempt = (
    await fixture.actor.api.storage.get<StoredWorkspaceStartJob>(
      IMPORT_CHECKPOINT_KEY,
    )
  )?.attempt
  await seedPublishedImage(fixture.db, {
    orgId: fixture.org.id,
    buildId: 'activation-retry-image',
    imageName: 'new-good-image',
    repositories: [
      {
        id: 'import-repo',
        orgId: fixture.org.id,
        fullName: 'example/repository',
        defaultBranch: 'main',
      },
    ],
    software: SOFTWARE,
    now: TEST_TIME + 1,
    runnerProtocolVersion: 2,
  })
  await fixture.activate()
  expect((await fixture.readJob())?.attempt).not.toBe(firstAttempt)
  await fixture.advanceToTransport()
  expect(fixture.boat.starts.at(-1)).toMatchObject({ from: 'new-good-image' })
  expect(
    await fixture.db
      .prepare('SELECT runner_protocol_version FROM workspaces WHERE id = ?')
      .bind('reservation')
      .first('runner_protocol_version'),
  ).toBe(2)
  await fixture.connect()
  await fixture.finish()
  expect(
    await fixture.db
      .prepare('SELECT activation_completed_at FROM workspaces WHERE id = ?')
      .bind('reservation')
      .first('activation_completed_at'),
  ).not.toBeNull()
})
