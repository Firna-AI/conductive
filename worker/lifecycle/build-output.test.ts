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
import { SNAPSHOT_DONE_LOG, SNAPSHOT_START_LOG } from './build-command-data'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { finishImageBuild } from './image-test-support'

const backendFixture = setupBackendTests()

it('hides machine tokens in build logs without changing command offsets', async () => {
  const { images, org, user, boat, runtime } = backendFixture()
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  const token = `cndm1.${'a'.repeat(64)}.${'b'.repeat(43)}`
  await writeBuildLog(runtime.env.DB, id, `heading ${token}\n`, TEST_TIME)
  for (let step = 0; step < 3; step++)
    await advanceImageBuild(images, org.id, id)
  boat.commandRunning = true
  boat.commandOutput = `stdout ${token}\n`
  boat.commandStderr = `stderr ${token}\n`
  await advanceImageBuild(images, org.id, id)
  expect(
    (await readBuild(runtime.env.DB, org.id, id)).log.map(({ text }) => text),
  ).toEqual(
    expect.arrayContaining([
      'heading [hidden]\n',
      'stdout [hidden]\n',
      'stderr [hidden]\n',
    ]),
  )
  expect(await readBuildJob(runtime.env.DB, org.id, id)).toMatchObject({
    stdoutOffset: 122,
    stderrOffset: 122,
  })
})

it('stores a detached status reply above two million output bytes in bounded rows without losing output', async () => {
  const fixture = await backendFixture()
  const { images, org, user, boat, runtime } = fixture
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
  expect(completed.log.slice(-3).map((event) => event.text)).toEqual([
    'install done\n',
    SNAPSHOT_START_LOG,
    SNAPSHOT_DONE_LOG,
  ])
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

it('logs the start of a failed snapshot save and no saved line', async () => {
  const fixture = await backendFixture()
  const { images, org, user, runtime } = fixture
  const id = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  let job = await readBuildJob(runtime.env.DB, org.id, id)
  for (let step = 0; step < 20 && job.phase !== 'snapshot'; step++) {
    await advanceImageBuild(images, org.id, id)
    job = await readBuildJob(runtime.env.DB, org.id, id)
  }
  expect(job.phase).toBe('snapshot')
  const fetch = images.dependencies.fetch
  images.dependencies = {
    ...images.dependencies,
    fetch: async (request) => {
      if (
        request.method === 'POST' &&
        new URL(request.url).pathname.endsWith('/saved-snapshots')
      ) {
        const body: { sandboxId: string; name: string } = await request.json()
        return Response.json({
          ok: true,
          type: 'snapshot.saved.info',
          snapshot: {
            name: body.name,
            sourceSandboxId: body.sandboxId,
            status: 'failed',
          },
        })
      }
      return fetch(request)
    },
  }
  await advanceImageBuild(images, org.id, id)

  const failed = await readBuild(runtime.env.DB, org.id, id)
  expect(failed.build.state).toBe('failed')
  const texts = failed.log.map((event) => event.text)
  expect(texts.filter((text) => text === SNAPSHOT_START_LOG)).toHaveLength(1)
  expect(texts).not.toContain(SNAPSHOT_DONE_LOG)
  expect(texts.slice(-2)).toEqual([SNAPSHOT_START_LOG, failed.build.error])
})
