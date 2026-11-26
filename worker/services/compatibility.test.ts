import { afterEach, beforeAll, expect, it } from 'vitest'
import { workspaceEventsPath } from '../../src/shared/events'
import { closeSockets, SocketInbox } from '../chat/adapter-sockets.test-support'
import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { record } from '../chat/inputs'
import {
  savedRunnerState,
  seedRunnerState,
} from '../chat/runner-connection-state.test-support'
import {
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

it('keeps an old runner and saved connection without a services flag readable, and rejects unnegotiated private traffic', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const old = await active.connect(false)
  expect(old.welcome).toEqual({
    type: 'welcome',
    protocolVersion: 2,
    streamId: 'services-stream-1',
    confirmedThrough: 0,
  })
  await old.fence([{ port: 3000, name: 'node', folder: null }])
  expect(await active.catalogue()).toEqual({ state: 'unsupported' })
  const state = savedRunnerState(await active.control('state'))
  delete record(state.connection).services
  await active.control('seed', seedRunnerState(state))
  const wake = await active.hibernate()
  expect(wake.before.instance).not.toBe(wake.after.instance)
  expect(await active.catalogue()).toEqual({ state: 'unsupported' })
  await old.fence([{ port: 3000, name: 'node', folder: null }])
  old.document('services.report.part', 'forbidden', snapshot)
  await old.closed
  expect(await active.catalogue()).toEqual({ state: 'unsupported' })
})

it('keeps the old browser socket kinds and port list shape while preserving optional service ownership', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const response = await active.request(
    workspaceEventsPath(OUTER_ORG, OUTER_WORKSPACE),
    {
      headers: { Upgrade: 'websocket', Cookie: active.cookies.memberCookie },
    },
  )
  expect(response.status).toBe(101)
  const browser = response.webSocket
  if (!browser) throw new Error('Missing browser socket.')
  const inbox = new SocketInbox(browser)
  browser.accept()
  expect(record(await inbox.next()).type).toBe('history')
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence([
    { port: 3000, name: 'node', folder: null, serviceId: service.serviceId },
    { port: 5173, name: 'vite', folder: 'code', serviceId: 42 },
  ])
  let message = record(await inbox.next())
  while (record(record(message.envelope).event).type !== 'ports.updated')
    message = record(await inbox.next())
  expect(message.type).toBe('event')
  expect(record(message.envelope).event).toEqual({
    type: 'ports.updated',
    ports: [
      { port: 3000, name: 'node', folder: null, serviceId: service.serviceId },
      { port: 5173, name: 'vite', folder: 'code' },
    ],
  })
  expect([
    ...new Set(inbox.received.map((value) => record(value).type)),
  ]).toEqual(['history', 'event'])
  expect(
    inbox.received
      .slice(1)
      .map((value) => record(record(record(value).envelope).event).type),
  ).not.toContain('services.updated')
  await active.hibernate()
  expect(await active.catalogue()).toMatchObject({ state: 'ready' })
  await closeSockets(browser)
})

it('hides the catalogue after a previous Worker stopped the computer without clearing service keys', async () => {
  const active = (fixture = await servicesFixture(bundle))
  const runner = await active.connect()
  runner.document('services.report.part', 'report', snapshot)
  await runner.fence()
  await active.env.DB.prepare(
    "UPDATE workspaces SET state = 'stopped' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  expect(await active.catalogue()).toEqual({ state: 'stopped' })
  await closeSockets(runner.socket)
  await active.env.DB.prepare(
    "UPDATE workspaces SET state = 'ready', sandbox_id = 'bx_after_rollback' WHERE id = ?",
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const next = await active.connect()
  expect(await active.catalogue()).toEqual({ state: 'unsupported' })
  next.document('services.report.part', 'after-stop', {
    bootId: 'new-run',
    revision: 0,
    services: [],
  })
  await next.fence()
  expect(await active.catalogue()).toEqual({
    state: 'ready',
    snapshot: { bootId: 'new-run', revision: 0, services: [] },
  })
})

it('declines optional services without failing hello when the workspace has no sandbox identity yet', async () => {
  const active = (fixture = await servicesFixture(bundle))
  await active.env.DB.prepare(
    'UPDATE workspaces SET sandbox_id = NULL WHERE id = ?',
  )
    .bind(OUTER_WORKSPACE)
    .run()
  const runner = await active.connect(true, false)
  expect(runner.welcome).toEqual({
    type: 'welcome',
    protocolVersion: 2,
    streamId: 'services-stream-1',
    confirmedThrough: 0,
  })
  await runner.fence()
  expect(runner.inbox.received.map((value) => record(value).type)).toEqual([
    'welcome',
    'confirm',
  ])
  expect(await active.catalogue()).toEqual({ state: 'stopped' })
})
