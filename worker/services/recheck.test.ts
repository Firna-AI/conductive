import { afterEach, beforeAll, expect, it } from 'vitest'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { record, string } from '../chat/inputs'
import {
  observed,
  restart,
  servicesFixture,
  snapshot,
  type ServicesFixture,
} from './fixture.test-support'

let bundle: string
let fixture: ServicesFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('rechecks workspace read access after waiting for control and log results', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const control = active.post(active.paths.control, restart)
  expect(record(await runner.inbox.next()).type).toBe('services.control')
  const request = { requestId: 'membership-log', target: observed }
  const log = active.post(active.paths.logs, request)
  const runnerRequest = record(record(await runner.inbox.next()).request)
  await active.env.DB.prepare(
    "DELETE FROM org_members WHERE org_id = ? AND user_id = 'member'",
  )
    .bind(OUTER_ORG)
    .run()
  runner.document('services.control.result.part', restart.requestId, {
    request: restart,
    outcome: { state: 'applied' },
  })
  runner.document('services.logs.part', string(runnerRequest.requestId), {
    request: runnerRequest,
    result: { state: 'ready', text: 'no longer readable', omitted: false },
  })
  for (const pending of [control, log]) {
    const response = await pending
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'workspace_not_found' },
    })
  }
})

it('rejects results and reports after the sandbox binding changes while requests wait', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const pending = active.post(active.paths.control, restart)
  expect(record(await runner.inbox.next()).type).toBe('services.control')
  await active.env.DB.prepare(
    "UPDATE workspaces SET sandbox_id = 'bx_replaced' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  runner.document('services.control.result.part', restart.requestId, {
    request: restart,
    outcome: { state: 'applied' },
  })
  runner.document('services.report.part', 'wrong-computer', {
    ...snapshot,
    revision: 2,
  })
  await runner.fence()
  expect(await active.catalogue()).toEqual({ state: 'unsupported' })
  const replacement = await active.connect()
  expect(await (await pending).json()).toEqual({
    request: restart,
    outcome: { state: 'unconfirmed' },
  })
  expect(await active.catalogue()).toEqual({ state: 'unsupported' })
  replacement.document('services.report.part', 'replacement', {
    ...snapshot,
    bootId: 'replacement-boot',
  })
  await replacement.fence()
  expect(await active.catalogue()).toMatchObject({
    state: 'ready',
    snapshot: { bootId: 'replacement-boot' },
  })
})
