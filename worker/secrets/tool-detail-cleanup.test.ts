import { afterEach, beforeAll, expect, it } from 'vitest'
import { chatHistoryPath } from '../../src/shared/events'
import { workspaceSecretValuePath } from '../../src/shared/secret-requests'
import { workspacePaths } from '../../src/shared/workspaces'
import { part } from '../chat/tool-detail.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { array } from '../chat/agent-events'
import { record } from '../chat/inputs'
import { secretFixture, type SecretFixture } from './requests.test-support'

let bundle: string
let f: SecretFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/secrets/requests-entry.test-support.ts',
  )
})
afterEach(async () => {
  await f?.dispose()
  f = undefined
})

it.each(['expiry', 'removal', 'archive'] as const)(
  'masks complete retained source and target with the full pre-change set at %s without retaining values',
  async (cleanup) => {
    const active = (f = await secretFixture(bundle))
    await active.seed('RECEIPT', 'receipt-token', true)
    expect(
      (await active.run({ names: ['RECEIPT'], command: 'deploy' })).status,
    ).toBe(200)
    const context = { sessionId: 'first-session', turnId: 'first-turn' }
    const prefix = '"'.repeat(32760) + '🦀'
    const source = part(
      context,
      prefix + 'db://user:short-token@host|short-token|[reda',
      1,
    )
    if (!source.start) throw new Error('Missing tool start')
    source.start.tool.target =
      'receipt-token db://user:short-token@host short-token'
    await active.emit(source)
    const actor = await active.secretActor()
    const arrival = await actor.savedToolDetail()
    expect
      .soft(arrival?.tool.target)
      .toBe('[redacted] db://user:short-token@host short-token')
    expect.soft(Object.hasOwn(arrival ?? {}, 'values')).toBe(false)
    expect.soft(JSON.stringify(arrival)).not.toContain('receipt-token')
    const supplied = await active.waiting({
      names: ['TOKEN'],
      command: 'deploy',
    })
    await active.answer(supplied.request.id, {
      kind: 'values',
      lifetime: cleanup === 'expiry' ? '15-minutes' : 'workspace',
      values: { TOKEN: 'short-token' },
    })
    expect((await supplied.response).status).toBe(200)
    await active.seed('DATABASE', 'db://user:short-token@host', true)
    expect(
      (await active.run({ names: ['DATABASE'], command: 'deploy' })).status,
    ).toBe(200)
    if (cleanup === 'expiry') {
      await actor.advanceSecretClock(DEVICE_TEST_NOW + 900_000)
    } else if (cleanup === 'removal') {
      const value = (await active.listRequests()).workspaceValues[0]
      expect(
        (
          await active.request(
            workspaceSecretValuePath(OUTER_ORG, OUTER_WORKSPACE, value.id),
            { method: 'DELETE' },
          )
        ).status,
      ).toBe(204)
    } else {
      expect(
        (
          await active.request(
            workspacePaths.archive(OUTER_ORG, OUTER_WORKSPACE),
            {
              method: 'POST',
              body: '{}',
            },
          )
        ).status,
      ).toBe(200)
    }
    const cleaned = await actor.savedToolDetail()
    expect.soft(cleaned?.tool.target).toBe('[redacted] [redacted] [redacted]')
    expect.soft(JSON.stringify(cleaned)).not.toContain('short-token')
    expect.soft(Object.hasOwn(cleaned ?? {}, 'values')).toBe(false)
    expect
      .soft(cleaned?.retainedText === prefix + '[redacted]|[redacted]|')
      .toBe(true)
    expect.soft(cleaned?.held).toBe('[reda')
    expect.soft(cleaned?.sourceRecordCount).toBe(cleaned?.sourceChunks)
    expect(await actor.storedSecretState()).not.toContain('short-token')
    if (cleanup === 'archive') return
    await active.emit(part(context, 'cted]|short-token', 2, true))
    const response = await active.request(
      chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
    )
    expect(response.status).toBe(200)
    const events = array(record(await response.json()).events, (item) =>
      record(record(item).event),
    )
    expect
      .soft(events.filter((event) => event.type === 'tool.updated'))
      .toEqual([
        expect.objectContaining({
          tool: {
            id: 'tool',
            kind: 'run',
            target: '[redacted] [redacted] [redacted]',
            detail: prefix + '[redacted]',
            state: 'done',
            omittedDetailBytes: 51,
          },
        }),
      ])
    expect(await actor.savedToolDetail()).toBeUndefined()
  },
)

it('erases a whole temporary copy in held text at expiry and archive while preserving the remaining match', async () => {
  for (const cleanup of ['expiry', 'archive'] as const) {
    const active = (f = await secretFixture(bundle))
    await active.seed('DATABASE', 'db://user:short-token@host', true)
    expect(
      (await active.run({ names: ['DATABASE'], command: 'deploy' })).status,
    ).toBe(200)
    const supplied = await active.waiting({
      names: ['TOKEN'],
      command: 'deploy',
    })
    await active.answer(supplied.request.id, {
      kind: 'values',
      lifetime: cleanup === 'expiry' ? '15-minutes' : 'workspace',
      values: { TOKEN: 'short-token' },
    })
    expect((await supplied.response).status).toBe(200)
    const context = { sessionId: 'first-session', turnId: 'first-turn' }
    await active.emit(part(context, 'ordinary db://user:short-token@ho', 1))
    const actor = await active.secretActor()
    expect((await actor.savedToolDetail())?.held).toBe(
      'db://user:short-token@ho',
    )
    if (cleanup === 'expiry')
      await actor.advanceSecretClock(DEVICE_TEST_NOW + 900_000)
    else
      expect(
        (
          await active.request(
            workspacePaths.archive(OUTER_ORG, OUTER_WORKSPACE),
            {
              method: 'POST',
              body: '{}',
            },
          )
        ).status,
      ).toBe(200)
    const cleaned = await actor.savedToolDetail()
    expect.soft(cleaned?.held, cleanup).toBe('db://user:[redacted]@ho')
    expect.soft(cleaned?.retainedText, cleanup).toBe('ordinary ')
    expect.soft(JSON.stringify(cleaned), cleanup).not.toContain('short-token')
    if (cleanup === 'expiry') {
      await active.emit(part(context, 'st|', 2, true))
      const response = await active.request(
        chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
      )
      expect(response.status).toBe(200)
      const events = array(record(await response.json()).events, (item) =>
        record(record(item).event),
      )
      expect(events.filter((event) => event.type === 'tool.updated')).toEqual([
        expect.objectContaining({
          tool: expect.objectContaining({
            detail: 'ordinary [redacted]|',
            omittedDetailBytes: 17,
          }),
        }),
      ])
    }
    await active.dispose()
    f = undefined
  }
})
