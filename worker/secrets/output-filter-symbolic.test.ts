import { afterEach, beforeAll, expect, it } from 'vitest'
import { chatHistoryPath } from '../../src/shared/events'
import { workspaceSecretValuePath } from '../../src/shared/secret-requests'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { record } from '../chat/inputs'
import { array } from '../chat/agent-events'
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

it.each([
  { cleanup: 'expiry', symbolicAtReceipt: true, containsValue: false },
  { cleanup: 'removal', symbolicAtReceipt: false, containsValue: true },
] as const)(
  'keeps receipt-time masks through $cleanup and permits copies completed afterwards',
  async ({ cleanup, symbolicAtReceipt, containsValue }) => {
    const active = (f = await secretFixture(bundle))
    const actor = await active.secretActor()
    if (symbolicAtReceipt) await actor.enableSymbolicAnswers()
    await active.seed('LONG', 'short-token-longer', true)
    expect(
      (await active.run({ names: ['LONG'], command: 'deploy' })).status,
    ).toBe(200)
    const supplied = await active.waiting({
      names: ['SHORT'],
      command: 'deploy',
    })
    await active.answer(supplied.request.id, {
      kind: 'values',
      lifetime: cleanup === 'expiry' ? '15-minutes' : 'workspace',
      values: { SHORT: 'short-token' },
    })
    expect((await supplied.response).status).toBe(200)
    const context = { sessionId: 'first-session', turnId: 'first-turn' }
    await active.emit({
      type: 'assistant.delta',
      ...context,
      messageId: 'whole',
      text: 'short-token',
    })
    await active.emit({
      type: 'assistant.delta',
      ...context,
      messageId: 'partial',
      text: 'short-',
    })
    expect(
      (await actor.savedFilterState()).includes('short-token'),
      `${cleanup}: receipt format`,
    ).toBe(containsValue)
    await actor.enableSymbolicAnswers()
    if (cleanup === 'expiry')
      await actor.advanceSecretClock(DEVICE_TEST_NOW + 900_000)
    else {
      const value = (await active.listRequests()).workspaceValues[0]
      expect(
        (
          await active.request(
            workspaceSecretValuePath(OUTER_ORG, OUTER_WORKSPACE, value.id),
            { method: 'DELETE' },
          )
        ).status,
      ).toBe(204)
    }
    expect(
      await actor.savedFilterState(),
      `${cleanup}: no values after cleanup`,
    ).not.toContain('short-token')
    await active.emit({
      type: 'assistant.delta',
      ...context,
      messageId: 'whole',
      text: cleanup === 'expiry' ? '!' : '-longer!',
    })
    await active.emit({
      type: 'assistant.delta',
      ...context,
      messageId: 'partial',
      text: 'token!',
    })
    const history = record(
      await (
        await active.request(
          chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, 'first-session'),
        )
      ).json(),
    )
    const events = array(history.events, (item) => record(record(item).event))
    expect(events.filter((event) => event.type === 'assistant.delta')).toEqual([
      {
        type: 'assistant.delta',
        ...context,
        messageId: 'whole',
        text: '[redacted]!',
      },
      {
        type: 'assistant.delta',
        ...context,
        messageId: 'partial',
        text: 'short-token!',
      },
    ])
  },
)
