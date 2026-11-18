import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { captureEnvironment, outputFixture } from './runner-output.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { part, sourceRecords } from './tool-detail.test-support'
import { workspaceSecretValuePath } from '../../src/shared/secret-requests'
import { encrypt } from '../security/crypto'
import { temporaryValueContext } from '../secrets/request-records'
import { readToolDetail } from './tool-detail-records'
import { readToolDetailSource } from './tool-detail-source'
import type { ChatTransaction } from './store'

async function retainedTool(
  f: Awaited<ReturnType<typeof outputFixture>>,
  view: ChatTransaction,
) {
  const owner = { workspaceId: WORKSPACE_ID, output: view.output }
  const state = await readToolDetail(f.env, owner, 'fake-stream-1')
  if (!state) throw new Error('Missing retained source')
  let text = ''
  for await (const block of readToolDetailSource(
    f.env,
    owner,
    'fake-stream-1',
    state,
  ))
    text += block
  return { ...state, text, cursor: await view.cursor('fake-stream-1') }
}

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

it('rolls back source masking and secret removal together, then retries across restart without losing text or assembly identity', async () => {
  const f = await outputFixture(harness, {})
  const source = part(
    f.context,
    'ordinary ephemeral-token|db://user:ephemeral-token@host|ephemeral-',
    1,
  )
  if (!source.start) throw new Error('Missing tool start')
  source.start.tool.target = 'ephemeral-token'
  await f.emit(source)
  const expiresAt = f.clock.now() + 1
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    await view.secrets.saveValue({
      id: 'temporary',
      name: 'TOKEN',
      suppliedBy: {
        id: f.owner.id,
        githubLogin: 'owner',
        displayName: null,
        avatarUrl: null,
      },
      createdAt: f.clock.now(),
      sessionId: null,
      expiresAt,
      ciphertext: await encrypt(
        'ephemeral-token',
        temporaryValueContext(WORKSPACE_ID, 'temporary'),
        f.env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    })
  })
  await captureEnvironment(f, {
    DATABASE: { value: 'db://user:ephemeral-token@host', secret: true },
  })
  const before = sourceRecords((await f.snapshot()).records)
  const header = await f.chat.store.read(WORKSPACE_ID, (view) =>
    view.output.readTool('fake-stream-1'),
  )
  let stagedCleanup: Awaited<ReturnType<typeof retainedTool>> | undefined
  await f.setStorageHooks({
    beforeTransaction: () => f.actor.api.controls.setTime(expiresAt),
    beforeCommit: async (staged) => {
      const values = await staged.read(WORKSPACE_ID, (view) =>
        view.secrets.values(),
      )
      if (!values.length) {
        stagedCleanup = await staged.read(WORKSPACE_ID, (view) =>
          retainedTool(f, view),
        )
        throw new Error('Injected cleanup rollback')
      }
    },
  })
  const path = workspaceSecretValuePath(f.org.id, WORKSPACE_ID, 'temporary')
  expect((await f.fetch(path, undefined, f.ownerCookie, 'DELETE')).status).toBe(
    500,
  )
  expect(stagedCleanup).toMatchObject({
    ...f.context,
    text: 'ordinary [redacted]|[redacted]|',
    held: 'ephemeral-',
    cursor: 3,
    tool: { target: '[redacted]' },
  })
  expect(sourceRecords((await f.snapshot()).records)).toEqual(before)
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.output.readTool('fake-stream-1'),
    ),
  ).toBe(header)
  expect(
    await f.chat.store.read(
      WORKSPACE_ID,
      async (view) => (await view.secrets.values()).length,
    ),
  ).toBe(1)
  await f.clearFaults()
  await f.restart()
  await f.connect(f.runner)
  expect((await f.fetch(path, undefined, f.ownerCookie, 'DELETE')).status).toBe(
    204,
  )
  const cleaned = await f.chat.store.read(WORKSPACE_ID, (view) =>
    retainedTool(f, view),
  )
  expect(cleaned).toMatchObject({
    ...f.context,
    text: 'ordinary [redacted]|[redacted]|ephemeral-',
    held: '',
    cursor: 3,
    tool: { target: '[redacted]' },
  })
  expect(Object.hasOwn(cleaned, 'values')).toBe(false)
  const afterCleanup = sourceRecords((await f.snapshot()).records)
  expect([...before.keys()].some((key) => afterCleanup.has(key))).toBe(false)
  await f.emit(part(f.context, 'token', 2, true))
  const history = await f.history(f.context.sessionId)
  expect(history.events.at(-1)?.event).toMatchObject({
    type: 'tool.updated',
    tool: {
      target: '[redacted]',
      detail: 'ordinary [redacted]|[redacted]|ephemeral-token',
      omittedDetailBytes: 17,
    },
  })
  expect(sourceRecords((await f.snapshot()).records).size).toBe(0)
})
