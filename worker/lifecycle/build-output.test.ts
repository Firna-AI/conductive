import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import {
  failBuild,
  readBuild,
  readBuildJob,
  saveBuildOutput,
  writeBuildLog,
} from './build-data'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'

const backendFixture = setupBackendTests()

it('stores a detached status reply above two million output bytes in bounded rows without losing output', async () => {
  const fixture = await backendFixture()
  const { images, org, user, boat, runtime } = fixture
  // An empty install script skips the install step, so give this build one.
  await runtime.env.DB.prepare(
    "UPDATE settings SET install_script = 'true' WHERE org_id = ?",
  )
    .bind(org.id)
    .run()
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  await advanceImageBuild(images, org.id, id)
  await advanceImageBuild(images, org.id, id)
  await advanceImageBuild(images, org.id, id)
  const beforeOutput = await readBuild(runtime.env.DB, org.id, id)
  const outputCursor = beforeOutput.log.at(-1)?.eventNumber ?? 0
  boat.commandRunning = true
  boat.commandOutput = 'x'.repeat(2_100_000)
  await advanceImageBuild(images, org.id, id)

  const running = await readBuild(runtime.env.DB, org.id, id)
  expect(running.build.state).toBe('running')
  const output = running.log.filter((event) => event.eventNumber > outputCursor)
  const outputThrough = output.at(-1)?.eventNumber ?? outputCursor
  expect(output.map((event) => event.eventNumber - outputCursor)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9,
  ])
  expect(
    output.map((event) => new TextEncoder().encode(event.text).byteLength),
  ).toEqual([
    262_144, 262_144, 262_144, 262_144, 262_144, 262_144, 262_144, 262_144,
    2_848,
  ])
  expect(output.map((event) => event.text).join('')).toBe('x'.repeat(2_100_000))
  expect(await readBuildJob(runtime.env.DB, org.id, id)).toMatchObject({
    stdoutOffset: 2_100_000,
    stderrOffset: 0,
  })
  boat.commandRunning = false
  await advanceImageBuild(images, org.id, id)
  boat.commandOutput = 'install done\n'
  await finishImageBuild(fixture, id)
  const completed = await readBuild(runtime.env.DB, org.id, id)
  expect(completed.build.state).toBe('succeeded')
  expect(
    completed.log
      .filter(
        (event) =>
          event.eventNumber > outputCursor &&
          event.eventNumber <= outputThrough,
      )
      .map((event) => event.text)
      .join(''),
  ).toBe('x'.repeat(2_100_000))
  expect(completed.log.at(-1)?.text).toBe('install done\n')
})

it('keeps UTF-8 characters and event order across all build log writers', async () => {
  const { images, org, user, runtime } = await backendFixture()
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  const heading = `${'x'.repeat(262_143)}🙂tail`
  const stdout = 'é'.repeat(131_073)
  const message = `${'z'.repeat(262_142)}😀failed`
  await writeBuildLog(runtime.env.DB, id, heading, TEST_TIME)
  await saveBuildOutput(
    runtime.env.DB,
    id,
    {
      processId: 7,
      state: 'exited',
      running: false,
      exitCode: 1,
      timedOut: false,
      stdout,
      stderr: 'err\n',
      stdoutOffset: 0,
      stderrOffset: 0,
      stdoutNextOffset: 262_146,
      stderrNextOffset: 4,
      more: false,
    },
    TEST_TIME,
  )
  await failBuild(runtime.env.DB, id, message, TEST_TIME + 1)

  const completed = await readBuild(runtime.env.DB, org.id, id)
  expect(completed.build).toMatchObject({ state: 'failed', error: message })
  expect(completed.log.map((event) => event.eventNumber)).toEqual([
    1, 2, 3, 4, 5, 6, 7,
  ])
  expect(
    completed.log.map(
      (event) => new TextEncoder().encode(event.text).byteLength,
    ),
  ).toEqual([262_143, 8, 262_144, 2, 4, 262_142, 10])
  expect(completed.log.map((event) => event.text).join('')).toBe(
    `${heading}${stdout}err\n${message}`,
  )
  expect(await readBuildJob(runtime.env.DB, org.id, id)).toMatchObject({
    stdoutOffset: 262_146,
    stderrOffset: 4,
  })
})
