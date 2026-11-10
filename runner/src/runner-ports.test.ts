import { expect, it, onTestFinished } from 'vitest'

import { turn } from '../test-support/harness'
import { portDriver } from '../test-support/ports'
import { refresh } from '../test-support/reports'
import { deferred } from '../test-support/runtime'
import { wireFixture } from '../test-support/wire'
import { Runner } from './runner'
import { EventStore } from './state'

const server = { port: 3000, name: 'vite dev', folder: 'apps/web' }

it('reports ports after connect and reconnect and deduplicates saved refresh commands after restart', async () => {
  const h = await wireFixture()
  const driver = portDriver()
  const runner = new Runner({ ...h.options, ports: driver.options })
  onTestFinished(() => runner.close())
  await runner.start(false)
  driver.set([server])
  await driver.tick()
  await driver.tick()
  h.endpoint.send(refresh('ports.updated', 'ports-repair'))
  h.endpoint.send(refresh('ports.updated', 'ports-repair'))
  await runner.idle()
  h.endpoint.disconnect()
  await runner.connect()
  h.endpoint.send(refresh('ports.updated', 'ports-repair'))
  await runner.idle()
  expect(
    h.endpoint.runnerEvents
      .filter(({ event }) => event.type === 'ports.updated')
      .map(({ event }) => event),
  ).toEqual([
    { type: 'ports.updated', ports: [] },
    { type: 'ports.updated', ports: [server] },
    { type: 'ports.updated', ports: [server] },
    { type: 'ports.updated', ports: [server] },
  ])
  await runner.close()
  const restarted = new Runner({
    ...h.options,
    store: await EventStore.open(h.storage),
    ports: portDriver().options,
  })
  onTestFinished(() => restarted.close())
  await restarted.start(false)
  const before = h.endpoint.runnerEvents.length
  h.endpoint.send(refresh('ports.updated', 'ports-repair'))
  await restarted.idle()
  expect(h.endpoint.runnerEvents).toHaveLength(before)
  expect(h.warnings).toEqual([])
})

it('restores unconfirmed port reports from the saved outbox and resends them once', async () => {
  const h = await wireFixture()
  h.endpoint.confirmEvents = false
  const driver = portDriver()
  const runner = new Runner({ ...h.options, ports: driver.options })
  onTestFinished(() => runner.close())
  await runner.start(false)
  h.endpoint.disconnect()
  driver.set([server])
  await driver.tick()
  await driver.tick()
  await runner.close()
  const store = await EventStore.open(h.storage)
  expect(
    store.snapshot.outbox
      .filter(({ event }) => event.type === 'ports.updated')
      .map(({ event }) => event),
  ).toEqual([
    { type: 'ports.updated', ports: [] },
    { type: 'ports.updated', ports: [server] },
  ])
  const count = h.endpoint.runnerEvents.length
  const restarted = new Runner({ ...h.options, store })
  onTestFinished(() => restarted.close())
  await restarted.start(false)
  expect(
    h.endpoint.runnerEvents.slice(count).map(({ event }) => event.type),
  ).toEqual([
    'ports.updated',
    'files.snapshot',
    'changes.updated',
    'runner.ready',
  ])
  expect(
    h.endpoint.runnerEvents.filter(
      ({ event }) => event.type === 'ports.updated',
    ),
  ).toHaveLength(2)
})

it('processes agent commands while a port scan waits and stops its scan driver on shutdown', async () => {
  const h = await wireFixture()
  const driver = portDriver()
  const arrived = deferred<void>()
  const held = deferred<readonly (typeof server)[]>()
  const finalScan = deferred<readonly (typeof server)[]>()
  driver.hold(() => {
    arrived.resolve()
    return held.promise
  })
  const runner = new Runner({ ...h.options, ports: driver.options })
  onTestFinished(async () => {
    held.resolve([])
    finalScan.resolve([])
    await runner.close()
  })
  const starting = runner.start(false)
  await arrived.promise
  h.endpoint.send(turn())
  await runner.idle()
  expect(h.providers.processes).toHaveLength(1)
  expect(h.endpoint.runnerEvents.map(({ event }) => event.type)).toEqual([
    'files.snapshot',
    'changes.updated',
    'turn.started',
  ])
  held.resolve([])
  await starting
  const finalScanStarted = deferred<void>()
  driver.hold(() => {
    finalScanStarted.resolve()
    return finalScan.promise
  })
  const scanning = driver.tick()
  await finalScanStarted.promise
  const closing = runner.close()
  await runner.engine.idle()
  expect(h.providers.latest.closed).toBe(true)
  expect(driver.stopped).toBe(1)
  finalScan.resolve([])
  await Promise.all([scanning, closing])
  expect(h.endpoint.runnerEvents.map(({ event }) => event.type)).toEqual([
    'files.snapshot',
    'changes.updated',
    'turn.started',
    'ports.updated',
    'runner.ready',
    'turn.completed',
  ])
})
