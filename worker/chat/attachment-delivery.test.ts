import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { retryMessagePath, sessionPaths } from '../../src/shared/sessions'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { attachmentFixture, FILE_BYTES, held } from './attachment.test-support'
import { prepareMessageAttachments } from './attachment-copy'
import { storeAttachment } from './attachment-storage'
import { WORKSPACE_ID } from './harness.test-support'
import { messageCommands, startTurn } from './turn-lifecycle.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => {
  vi.unstubAllGlobals()
})
afterAll(async () => {
  await harness.dispose()
})

function providerCopy(
  options: {
    hold?: Promise<void>
    entered?: () => void
    fail?: () => boolean
  } = {},
) {
  const paths: string[] = []
  const copies: Uint8Array[] = []
  const fetch = async (request: Request) => {
    if (new URL(request.url).hostname === 'boat.dev') {
      const body: { path: string } = await request.json()
      paths.push(body.path)
      return Response.json({
        ok: true,
        type: 'file.upload_url',
        method: 'PUT',
        path: body.path,
        url: 'https://attachment-transfer.test/file',
        expiresAt: '2099-01-01T00:00:00Z',
      })
    }
    options.entered?.()
    await options.hold
    copies.push(new Uint8Array(await request.arrayBuffer()))
    return new Response(null, { status: options.fail?.() ? 503 : 204 })
  }
  return { paths, copies, fetch }
}

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
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const sending = fixture.sendAttachment(session.id, longMessageId, fileIds)
  await entered.promise
  expect(runner.commands).toEqual([])
  release.resolve()
  expect((await sending).status).toBe(202)
  await fixture.drainAttachments()
  expect(provider.copies).toEqual([FILE_BYTES, FILE_BYTES])
  expect(provider.paths[0]).toMatch(
    /^\/home\/user\/\.conductive-attachment-[A-Za-z0-9_-]{43}\.pdf$/,
  )
  expect(provider.paths[1]).toMatch(
    /^\/home\/user\/\.conductive-attachment-[A-Za-z0-9_-]{43}$/,
  )
  expect(messageCommands(runner, longMessageId)[0]?.attachments[0]?.path).toBe(
    provider.paths[0],
  )
  runner.disconnect()
  await fixture.connect(runner)
  await fixture.drainAttachments()
  expect(provider.copies).toHaveLength(2)
  runner.disconnect()
  await harness.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind('sandbox-two', WORKSPACE_ID)
    .run()
  await fixture.connect(runner)
  await fixture.drainAttachments()
  expect(provider.copies).toEqual([
    FILE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
  ])
  expect(provider.paths.slice(2)).toEqual(provider.paths.slice(0, 2))
  expect(
    (await fixture.sendAttachment(session.id, 'another-file-message', fileIds))
      .status,
  ).toBe(202)
  await fixture.drainAttachments()
  expect(provider.copies).toEqual([
    FILE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
    FILE_BYTES,
  ])
  expect(provider.paths[4]).not.toBe(provider.paths[0])
  runner.disconnect()
})

it('keeps the accepted message and exposes Try again after a copy prevents its turn start', async () => {
  let fail = true
  const provider = providerCopy({ fail: () => fail })
  const fixture = await attachmentFixture(harness, {
    prepareAttachments: (...args) =>
      prepareMessageAttachments(harness.env, ...args, provider.fetch),
  })
  await harness.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = ? WHERE id = ?',
  )
    .bind('sandbox-one', WORKSPACE_ID)
    .run()
  const file = await fixture.upload()
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(
    (await fixture.sendAttachment(session.id, 'copy-fails', [file.id])).status,
  ).toBe(202)
  await fixture.drainAttachments()
  expect(messageCommands(runner, 'copy-fails')).toEqual([])
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.session(session.id),
    ),
  ).toMatchObject({ activeTurnId: null, retryMessageId: 'copy-fails' })
  expect(await fixture.bytes(file.id)).toEqual(FILE_BYTES)
  fail = false
  const retry = await fixture.fetch(
    retryMessagePath(fixture.org.id, WORKSPACE_ID, session.id, 'copy-fails'),
    {},
  )
  expect(retry.status).toBe(202)
  await fixture.drainAttachments()
  expect(provider.copies).toEqual([FILE_BYTES, FILE_BYTES])
  expect(
    runner.commands.filter((command) => command.type === 'turn'),
  ).toHaveLength(1)
  runner.disconnect()
})

it('ends a running turn after copy failure and lets Try again copy its message', async () => {
  let fail = true
  const fixture = await attachmentFixture(harness, {
    attachmentSandboxId: async () => 'sandbox-one',
    prepareAttachments: async () => {
      if (fail) throw new Error('An injected copy failure')
      return 'sandbox-one'
    },
  })
  const file = await fixture.upload()
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, session.id, 'text-start')
  expect(
    (await fixture.sendAttachment(session.id, 'waiting-file', [file.id]))
      .status,
  ).toBe(202)
  await fixture.drainAttachments()
  expect(messageCommands(runner, 'waiting-file')).toEqual([])
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.turn(turn.turnId),
    ),
  ).toMatchObject({ state: 'failed' })
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.session(session.id),
    ),
  ).toMatchObject({ activeTurnId: null, retryMessageId: 'waiting-file' })
  fail = false
  const retry = await fixture.fetch(
    retryMessagePath(fixture.org.id, WORKSPACE_ID, session.id, 'waiting-file'),
    {},
  )
  expect(retry.status).toBe(202)
  await fixture.drainAttachments()
  expect(messageCommands(runner, 'waiting-file')).toEqual([])
  expect(
    runner.commands.filter((command) => command.type === 'turn'),
  ).toHaveLength(2)
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.turn(turn.turnId),
    ),
  ).toMatchObject({ state: 'failed' })
  runner.disconnect()
})

it('answers Stop during a held provider copy and never sends the stopped command', async () => {
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
  const file = await fixture.upload()
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const response = await fixture.sendAttachment(
    session.id,
    'stop-before-copy',
    [file.id],
  )
  expect(response.status).toBe(202)
  await entered.promise
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(runner.pendingEvents()).toEqual([])
  const turnId = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
    view.messageTurn('stop-before-copy'),
  )
  const stopped = await fixture.fetch(
    sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id),
    { turnId },
  )
  expect(stopped.status).toBe(200)
  expect(messageCommands(runner, 'stop-before-copy')).toEqual([])
  release.resolve()
  await fixture.drainAttachments()
  expect(messageCommands(runner, 'stop-before-copy')).toEqual([])
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.turn(turnId ?? 'missing'),
    ),
  ).toMatchObject({ state: 'stopped' })
  runner.disconnect()
})
