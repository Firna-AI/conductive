import { afterEach, beforeAll, expect, it } from 'vitest'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
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

it('resolves discarded control and log transfers and releases the next serialized log read without disconnecting', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const control = active.post(active.paths.control, restart)
  expect(await runner.inbox.next()).toEqual({
    type: 'services.control',
    request: restart,
  })
  runner.send({
    type: 'services.control.result.part',
    requestId: restart.requestId,
    part: { partNumber: 1, finalPart: true, text: '{' },
  })
  expect(await (await control).json()).toEqual({
    request: restart,
    outcome: { state: 'unconfirmed' },
  })

  const request = { requestId: 'discarded-log', target: observed }
  const first = active.post(active.paths.logs, request)
  const command = record(record(await runner.inbox.next()).request)
  const second = active.post(active.paths.logs, request)
  runner.send({
    type: 'services.logs.part',
    requestId: command.requestId,
    part: { partNumber: 2, finalPart: true, text: '{}' },
  })
  expect(await (await first).json()).toEqual({
    request,
    result: {
      state: 'failed',
      error: {
        code: 'service_log_invalid',
        message: 'The service log could not load. Try again.',
      },
    },
  })
  const next = record(record(await runner.inbox.next()).request)
  runner.document('services.logs.part', string(next.requestId), {
    request: next,
    result: { state: 'ready', text: 'next read', omitted: false },
  })
  expect(await (await second).json()).toEqual({
    request,
    result: { state: 'ready', text: 'next read', omitted: false },
  })
  await runner.fence()
  expect(await active.catalogue()).toMatchObject({ state: 'ready' })
})
