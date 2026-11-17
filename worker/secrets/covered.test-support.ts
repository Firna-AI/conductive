import { expect } from 'vitest'
import { chatHistoryPath } from '../../src/shared/events'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { record } from '../chat/inputs'
import { array } from '../chat/agent-events'
import type { SecretFixture } from './requests.test-support'

/** A request that became late, and a second request that waits. */
export async function lateThenWaiting(
  active: SecretFixture,
  first: string[],
  second: string[] = ['TOKEN'],
) {
  const late = await active.waiting({ names: first, command: 'deploy' })
  await (
    await active.secretActor()
  ).advanceSecretClock(DEVICE_TEST_NOW + 90_000)
  expect(await (await late.response).json()).toMatchObject({
    status: 'pending',
  })
  const waiting = await active.waiting({
    names: second,
    command: 'deploy again',
  })
  return { late, waiting }
}

export async function requestState(active: SecretFixture, id: string) {
  const found = (await active.listRequests()).requests.find(
    (request) => request.id === id,
  )
  if (!found) throw new Error(`The request ${id} is missing.`)
  return found
}

export async function notices(
  active: SecretFixture,
  sessionId = 'first-session',
) {
  const history = record(
    await (
      await active.request(
        chatHistoryPath(OUTER_ORG, OUTER_WORKSPACE, sessionId),
      )
    ).json(),
  )
  return array(history.events, (item) => record(record(item).event)).filter(
    (event) => event.type === 'secrets.notice',
  )
}

export async function workspaceState(active: SecretFixture) {
  return active.env.DB.prepare('SELECT state FROM workspaces WHERE id = ?')
    .bind(OUTER_WORKSPACE)
    .first('state')
}
