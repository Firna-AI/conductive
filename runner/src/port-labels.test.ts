import { expect, it, onTestFinished } from 'vitest'

import { jsonBytes } from '../../src/shared/event-limits'
import { RUNNER_EVENT_MAX_BYTES } from '../../src/shared/runner'
import { portDriver } from '../test-support/ports'
import { refresh } from '../test-support/reports'
import { wireFixture } from '../test-support/wire'
import { Runner } from './runner'
import { EventStore } from './state'

it('preserves complete port labels through credential filtering, saved replay, reconnect, and refresh', async () => {
  const h = await wireFixture()
  h.endpoint.confirmEvents = false
  const driver = portDriver()
  driver.set([
    {
      port: 3000,
      name: 'wire-token-development-server-entry-point secretpass',
      folder: `secretpass/${'z'.repeat(115)}/wire-token`,
    },
  ])
  const runner = new Runner({ ...h.options, ports: driver.options })
  onTestFinished(() => runner.close())
  await runner.start(false)
  h.endpoint.disconnect()
  await driver.tick()
  await runner.close()
  const expected = {
    type: 'ports.updated',
    ports: [
      {
        port: 3000,
        name: '[redacted]-development-server-entry-point secretpass',
        folder: `secretpass/${'z'.repeat(115)}/[redacted]`,
      },
    ],
  }
  const store = await EventStore.open(h.storage)
  expect(store.snapshot.outbox.at(-1)?.event).toEqual(expected)
  h.endpoint.confirmEvents = true
  const restored = new Runner({ ...h.options, store, ports: driver.options })
  onTestFinished(() => restored.close())
  await restored.start(false)
  expect(
    h.endpoint.runnerEvents
      .filter(({ event }) => event.type === 'ports.updated')
      .map(({ event }) => event),
  ).toEqual([
    { type: 'ports.updated', ports: [] },
    expected,
    { type: 'ports.updated', ports: [] },
  ])
  await driver.tick()
  h.endpoint.send(refresh('ports.updated', 'complete-labels'))
  await restored.idle()
  h.endpoint.disconnect()
  await restored.connect()
  expect(
    h.endpoint.runnerEvents
      .filter(({ event }) => event.type === 'ports.updated')
      .slice(-3)
      .map(({ event }) => event),
  ).toEqual([expected, expected, expected])
  const count = h.endpoint.runnerEvents.length
  h.endpoint.send(refresh('ports.updated', 'complete-labels'))
  await restored.idle()
  expect(h.endpoint.runnerEvents).toHaveLength(count)
  expect(h.warnings).toEqual([])
})

it('omits whole optional labels to fit the private budget and retains each listening port', async () => {
  const h = await wireFixture()
  const driver = portDriver()
  driver.set([
    { port: 3000, name: 'a'.repeat(600_000), folder: 'secretpass/app' },
    {
      port: 3001,
      name: 'safe server',
      folder: 'secretpass/' + 'z'.repeat(600_000),
    },
  ])
  const runner = new Runner({ ...h.options, ports: driver.options })
  onTestFinished(() => runner.close())
  await runner.start(false)
  await driver.tick()
  const envelope = h.endpoint.runnerEvents.at(-1)
  expect(envelope?.event).toEqual({
    type: 'ports.updated',
    ports: [
      { port: 3000, name: null, folder: 'secretpass/app' },
      { port: 3001, name: 'safe server', folder: null },
    ],
  })
  expect(jsonBytes(envelope)).toBeLessThanOrEqual(RUNNER_EVENT_MAX_BYTES)
  expect(h.warnings).toEqual([
    'The listening port labels exceeded the private report budget.',
  ])
})
