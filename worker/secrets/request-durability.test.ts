import { afterEach, beforeAll, expect, it } from 'vitest'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import { secretAnswerPath } from '../../src/shared/secret-requests'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
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

it('restores a large late request and an encrypted workspace value after a real object restart', async () => {
  const active = (f = await secretFixture(bundle))
  const value = 'private-workspace-credential-'.repeat(5_000)
  const supplied = await active.waiting({ names: ['TOKEN'], command: 'deploy' })
  const answer = await active.request(
    secretAnswerPath(OUTER_ORG, OUTER_WORKSPACE, supplied.request.id),
    {
      method: 'POST',
      body: JSON.stringify({
        kind: 'values',
        lifetime: 'workspace',
        values: { TOKEN: value },
      }),
    },
  )
  expect(answer.status).toBe(200)
  expect(await (await supplied.response).json()).toMatchObject({
    status: 'allowed',
    values: { TOKEN: value },
  })
  const command = 'deploy --label '.repeat(10_000)
  const pending = await active.waiting({ names: ['OTHER'], command })
  await (
    await active.secretActor()
  ).advanceSecretClock(DEVICE_TEST_NOW + 90_000)
  expect(await (await pending.response).json()).toMatchObject({
    status: 'pending',
  })
  expect(await (await active.secretActor()).storedSecretState()).not.toContain(
    value,
  )
  await closeSockets(
    supplied.tab.socket,
    pending.tab.socket,
    active.runner.socket,
  )
  await active.restart()
  const snapshot = await active.listRequests()
  expect(
    snapshot.requests.find((item) => item.id === pending.request.id),
  ).toMatchObject({ command, state: 'late', late: true })
  expect(snapshot.workspaceValues.map((item) => item.name)).toEqual(['TOKEN'])
  expect(
    await (await active.run({ names: ['TOKEN'], command: 'deploy' })).json(),
  ).toMatchObject({ status: 'allowed', values: { TOKEN: value } })
})
