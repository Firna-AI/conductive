import { afterEach, beforeAll, expect, it } from 'vitest'

import { agentSessionPaths } from '../../src/shared/agent-session-paths'
import { sessionPaths } from '../../src/shared/sessions'
import { record, string } from '../chat/inputs'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  agentWriteFixture,
  type AgentWriteFixture,
} from './agent-session-writes.test-support'

let bundle: string
let fixture: AgentWriteFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('records one exact watch for repeated intent and returns idle without a record', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const target = await active.createSession()
  const path = agentSessionPaths.watch(undefined, target)
  const idle = await active.post(path, {})
  expect(idle.status).toBe(200)
  expect(await idle.json()).toMatchObject({
    state: 'idle',
    session: { id: target },
  })
  expect(
    (
      await active.request(
        sessionPaths.close(OUTER_ORG, OUTER_WORKSPACE, target),
        { method: 'POST', body: JSON.stringify({ stopRunningTurn: true }) },
      )
    ).status,
  ).toBe(200)
  expect(await (await active.post(path, {})).json()).toMatchObject({
    state: 'idle',
  })
  expect(
    (
      await active.request(
        sessionPaths.reopen(OUTER_ORG, OUTER_WORKSPACE, target),
        { method: 'POST', body: '{}' },
      )
    ).status,
  ).toBe(200)
  const turnId = await active.start(
    OUTER_WORKSPACE,
    target,
    active.sourceRunner,
    'owner',
    active.cookies.ownerCookie,
  )
  const response = await active.post(path, { turnId })
  expect(response.status).toBe(200)
  const watched = record(await response.json())
  expect(watched).toMatchObject({
    state: 'watching',
    turnId,
    session: { id: target },
  })
  expect(string(watched.watchId)).not.toBe('')
  expect(await (await active.post(path, {})).json()).toEqual(watched)
  expect(await (await active.post(path, { turnId })).json()).toEqual(watched)
})

it('refuses the calling turn and stale callers and keeps exact turn lookup within its session', async () => {
  const active = (fixture = await agentWriteFixture(bundle))
  const self = await active.post(
    agentSessionPaths.watch(undefined, active.sourceSessionId),
    {},
  )
  expect(self.status).toBe(400)
  expect(await self.json()).toMatchObject({ error: { code: 'invalid_input' } })
  const target = await active.createSession()
  const path = agentSessionPaths.watch(undefined, target)
  const wrong = await active.post(path, { turnId: active.sourceTurnId })
  expect(wrong.status).toBe(404)
  expect(await wrong.json()).toMatchObject({
    error: { code: 'turn_not_found' },
  })
  const stale = await active.post(path, {}, 'stale-turn')
  expect(stale.status).toBe(403)
  expect(await stale.json()).toMatchObject({
    error: { code: 'calling_turn_required' },
  })
})
