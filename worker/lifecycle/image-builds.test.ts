import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { SOFTWARE } from './backend-test-support'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild, readBuildHistory } from './build-data'
import { buildEventsResponse } from './build-stream'
import { advanceImageBuild, startImageBuild } from './image-builds'
import { finishImageBuild as finish } from './image-test-support'

const backendFixture = setupBackendTests()

it('recovers scheduling and allocation replies while streaming a successful image build', async () => {
  const fixture = await backendFixture()
  try {
    const { images, org, user, boat, runtime } = fixture
    const schedule = images.scheduler.schedule
    let firstSchedule = true
    images.scheduler.schedule = async (...args) => {
      if (firstSchedule) {
        firstSchedule = false
        throw new Error('scheduler unavailable')
      }
      await schedule(...args)
    }
    await expect(
      startImageBuild(images, {
        orgId: org.id,
        userId: user.id,
        kind: 'build',
        software: SOFTWARE,
      }),
    ).rejects.toThrow('scheduler unavailable')
    const id = await startImageBuild(images, {
      orgId: org.id,
      userId: user.id,
      kind: 'build',
      software: { ...SOFTWARE, sha256: 'b'.repeat(64) },
    })
    expect(fixture.scheduled[0]).toEqual({
      orgId: org.id,
      software: SOFTWARE,
      nextAt: TEST_TIME,
      buildId: id,
    })
    boat.lostCreateReplies = 1
    await advanceImageBuild(images, org.id, id)
    await advanceImageBuild(images, org.id, id)
    expect(boat.starts[1]).toEqual(boat.starts[0])
    expect(boat.states.size).toBe(1)
    await advanceImageBuild(images, org.id, id)
    boat.commandRunning = true
    await advanceImageBuild(images, org.id, id)
    const beforeOutput = await readBuild(runtime.env.DB, org.id, id)
    await advanceImageBuild(images, org.id, id)
    let signalWait: () => void = () => {}
    const waiting = new Promise<void>((resolve) => {
      signalWait = resolve
    })
    const streaming = await buildEventsResponse({
      env: runtime.env,
      orgId: org.id,
      userId: user.id,
      buildId: id,
      after: beforeOutput.log.at(-1)?.eventNumber ?? 0,
      wait: () => {
        signalWait()
        return new Promise(() => {})
      },
    })
    const reader = streaming.body!.getReader()
    try {
      const observed = await Promise.race([
        reader.read().then((output) => ({ kind: 'output' as const, output })),
        waiting.then(() => ({ kind: 'waiting' as const })),
      ])
      expect(observed.kind).toBe('output')
      if (observed.kind !== 'output')
        throw new Error('The queued build output was not available.')
      const output = observed.output
      expect(new TextDecoder().decode(output.value)).toContain('installing...')
      expect((await readBuild(runtime.env.DB, org.id, id)).build.state).toBe(
        'running',
      )
    } finally {
      await reader.cancel()
    }
    expect(boat.starts[0]).toMatchObject({
      from: 'last-good-image',
      noEnv: true,
      env: {
        CONDUCTIVE_REPOSITORY_REPOSITORY_DIR: '/home/user/code/repository',
      },
    })
    boat.commandRunning = false
    await finish(fixture, id)
    const good = await readBuildHistory(runtime.env.DB, org.id)
    expect(good.currentImageBuildId).toBe(id)
    expect(good.builds[0]).toMatchObject({
      state: 'succeeded',
      kind: 'build',
      error: null,
    })
    expect(
      (await readBuild(runtime.env.DB, org.id, id)).log.filter(
        (event) => event.text === 'installing...\n',
      ),
    ).toHaveLength(2)
    await expect(
      buildEventsResponse({
        env: runtime.env,
        orgId: org.id,
        userId: user.id,
        buildId: 'unknown',
        after: 0,
      }),
    ).rejects.toMatchObject({ status: 404, code: 'build_not_found' })
  } finally {
    await fixture.dispose()
  }
})
