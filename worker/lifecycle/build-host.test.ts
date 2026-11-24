import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { readCommandRoute } from './command-intents'
import { lifecycleCommandBody } from './command-test-support'
import { IMAGE_POLL_MS } from './image-timers'
import { imageRetryFixture } from './retry-test-support'
import { readSourceRun } from './image-sources/run-data'

const fixtureForTest = setupBackendTests()

it('uses the host for sources, software, install, and journal cleanup across alarms', async () => {
  const fixture = fixtureForTest()
  const { boat, host, images } = fixture
  boat.beforeCommand = async (command) => {
    boat.commandOutput = command.includes('MemAvailable:')
      ? 'MemAvailable: 2097152 kB\n'
      : ''
  }
  const image = await imageRetryFixture(fixture, { steps: 1 })
  await image.tick(TEST_TIME)
  expect(await readSourceRun(images.env.DB, image.id)).toMatchObject({
    phase: 'layout',
    processId: 1,
    commandRoute: 'host',
  })
  await image.restart()
  await image.tick(TEST_TIME + IMAGE_POLL_MS)
  expect(host.statusRequests).toEqual([
    { processId: 1, stdoutOffset: 0, stderrOffset: 0 },
  ])
  expect(boat.statusRequests).toEqual(host.statusRequests)

  for (
    let step = 0;
    step < 20 && (await image.job()).phase !== 'done';
    step++
  ) {
    const alarm = await image.storage.getAlarm()
    if (alarm === null) throw new Error('Missing image alarm')
    await image.tick(alarm)
  }
  expect(await image.job()).toMatchObject({ state: 'succeeded', phase: 'done' })
  expect(host.commands[0]).toContain('MemAvailable:')
  expect(host.commands[1]).toContain('clone --bare')
  expect(host.commands[2]).toContain('show-ref --verify')
  expect(lifecycleCommandBody(host.commands[3])).toContain(
    'update check --bootstrap',
  )
  expect(lifecycleCommandBody(host.commands[4])).toContain(
    "bash '/tmp/conductive-install.sh'",
  )
  expect(host.commands[5]).toBe("rm -rf -- '/tmp/conductive-lifecycle'")
  expect(boat.commandRequests).toEqual(host.commandRequests)
  expect(boat.statusRequests).toEqual(host.statusRequests)
})

it('starts and polls a build through the provider when the host stays disconnected', async () => {
  const fixture = fixtureForTest()
  fixture.host.autoConnect = false
  const image = await imageRetryFixture(fixture)
  expect(await image.job()).toMatchObject({
    processId: 1,
    commandRoute: 'provider',
  })
  await image.tick(TEST_TIME)
  expect(await image.job()).toMatchObject({ phase: 'install' })
  expect(fixture.host.commandRequests).toEqual([])
  expect(fixture.host.statusRequests).toEqual([])
  expect(fixture.boat.commandRequests).toHaveLength(1)
  expect(fixture.boat.statusRequests).toEqual([
    { processId: 1, stdoutOffset: 0, stderrOffset: 0 },
  ])
})

it('polls a saved build process without a route through the provider after the host connects', async () => {
  const fixture = fixtureForTest()
  fixture.host.autoConnect = false
  const image = await imageRetryFixture(fixture)
  await fixture.images.env.DB.prepare(
    'UPDATE image_build_jobs SET command_route = NULL WHERE build_id = ?',
  )
    .bind(image.id)
    .run()
  await fixture.host.connect('bx_1')
  await image.tick(TEST_TIME)
  expect(await image.job()).toMatchObject({ phase: 'install' })
  expect(fixture.host.statusRequests).toEqual([])
  expect(fixture.boat.statusRequests).toEqual([
    { processId: 1, stdoutOffset: 0, stderrOffset: 0 },
  ])
})

it('rejects an unknown saved command route', () => {
  expect(() => readCommandRoute('other')).toThrow(
    'Invalid saved build command route',
  )
})
