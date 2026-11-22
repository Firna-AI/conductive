import { afterEach, beforeAll, expect, it } from 'vitest'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { record } from '../chat/inputs'
import { closeSockets } from '../chat/adapter-sockets.test-support'
import {
  observed,
  restart,
  service,
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

it('restarts stopped, ended, and failed services and correlates durable duplicate controls with the exact observed generation', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  for (const [index, state] of ['stopped', 'ended', 'failed'].entries()) {
    runner.document('services.report.part', `state-${state}`, {
      ...snapshot,
      revision: index + 1,
      services: [
        {
          ...service,
          status: {
            ...service.status,
            state,
            endedAt: service.status.startedAt + 1,
            result: { kind: 'exit', code: state === 'failed' ? 1 : 0 },
          },
        },
      ],
    })
    await runner.fence()
    const request = { ...restart, requestId: `restart-${state}` }
    const first = active.post(active.paths.control, request)
    expect(await runner.inbox.next()).toEqual({
      type: 'services.control',
      request,
    })
    const duplicate = active.post(active.paths.control, request)
    const conflicting = active.post(active.paths.control, {
      ...request,
      action: 'stop',
      target: { ...observed, generation: 'changed' },
    })
    runner.document('services.control.result.part', request.requestId, {
      request: { ...request, target: { ...observed, generation: 'wrong' } },
      outcome: { state: 'unchanged' },
    })
    await runner.fence()
    runner.document('services.control.result.part', request.requestId, {
      request,
      outcome: { state: 'applied' },
    })
    expect(await (await first).json()).toEqual({
      request,
      outcome: { state: 'applied' },
    })
    expect(await (await duplicate).json()).toEqual({
      request,
      outcome: { state: 'applied' },
    })
    expect(await (await conflicting).json()).toEqual({
      request,
      outcome: { state: 'applied' },
    })
    expect(
      await (await active.post(active.paths.control, request)).json(),
    ).toEqual({ request, outcome: { state: 'applied' } })
  }
  const stale = {
    ...restart,
    requestId: 'old-generation',
    target: { ...observed, generation: 'earlier' },
  }
  expect(await (await active.post(active.paths.control, stale)).json()).toEqual(
    { request: stale, outcome: { state: 'stale' } },
  )
  const stop = { ...restart, requestId: 'stop-failed', action: 'stop' }
  const stopping = active.post(active.paths.control, stop)
  expect(await runner.inbox.next()).toEqual({
    type: 'services.control',
    request: stop,
  })
  runner.document('services.control.result.part', stop.requestId, {
    request: stop,
    outcome: { state: 'unchanged' },
  })
  expect(await (await stopping).json()).toEqual({
    request: stop,
    outcome: { state: 'unchanged' },
  })
  expect(
    runner.inbox.received.filter(
      (value) => record(value).type === 'services.control',
    ),
  ).toHaveLength(4)
})

it('filters a complete control failure before durable storage and preserves duplicate outcomes after hibernation', async () => {
  const active = (fixture = await servicesFixture(bundle))
  await active.secret('private-failure')
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const request = { ...restart, requestId: 'large-request-'.repeat(1500) }
  const response = active.post(active.paths.control, request)
  expect(await runner.inbox.next()).toEqual({
    type: 'services.control',
    request,
  })
  const reply = {
    request,
    outcome: {
      state: 'failed',
      error: { code: 'unit_failed', message: 'Could not run private-failure.' },
    },
  }
  const source = JSON.stringify(reply)
  const split = source.indexOf('private-failure') + 7
  runner.document('services.control.result.part', request.requestId, reply, [
    split,
  ])
  const expected = {
    request,
    outcome: {
      state: 'failed',
      error: { code: 'unit_failed', message: 'Could not run [redacted].' },
    },
  }
  expect(await (await response).json()).toEqual(expected)
  await active.hibernate()
  expect(
    await (await active.post(active.paths.control, request)).json(),
  ).toEqual(expected)
  expect(JSON.stringify([...(await active.state())])).not.toContain(
    'private-failure',
  )
  expect(
    runner.inbox.received.filter(
      (value) => record(value).type === 'services.control',
    ),
  ).toHaveLength(1)
})

it('ends lost controls as unconfirmed and never sends a duplicate to a replacement runner', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  const response = active.post(active.paths.control, restart)
  expect(await runner.inbox.next()).toEqual({
    type: 'services.control',
    request: restart,
  })
  const replacement = await active.connect()
  expect(await (await response).json()).toEqual({
    request: restart,
    outcome: { state: 'unconfirmed' },
  })
  replacement.document('services.control.result.part', restart.requestId, {
    request: restart,
    outcome: { state: 'applied' },
  })
  await replacement.fence()
  expect(
    await (await active.post(active.paths.control, restart)).json(),
  ).toEqual({ request: restart, outcome: { state: 'unconfirmed' } })
  expect(
    replacement.inbox.received.filter(
      (value) => record(value).type === 'services.control',
    ),
  ).toEqual([])
  replacement.document('services.report.part', 'fresh', {
    ...snapshot,
    revision: 2,
  })
  await replacement.fence()
  const next = { ...restart, requestId: 'lost-close' }
  const lost = active.post(active.paths.control, next)
  expect(await replacement.inbox.next()).toEqual({
    type: 'services.control',
    request: next,
  })
  await closeSockets(replacement.socket)
  expect(await (await lost).json()).toEqual({
    request: next,
    outcome: { state: 'unconfirmed' },
  })
})
