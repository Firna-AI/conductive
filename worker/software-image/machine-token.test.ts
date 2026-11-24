import { afterEach, expect, it, vi } from 'vitest'

import { fakeCodexTasks } from '../codex-auth/tasks.test-support'
import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { SOFTWARE_RELEASE } from '../lifecycle/software-release-test-support'
import { machineClient, softwareImageMachineOwner } from '../machines/client'
import type { MachineOwner } from '../machines/identity'
import { providerForAccount } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import { heldOperation } from '../test-support/held-operation'
import {
  insertSoftwareImage,
  readSoftwareImage,
  saveSoftwareImage,
} from './data'
import { boundedSoftwareImagePoll } from './poll'
import { AttemptChanged } from './resources'
import { softwareImageResult } from './result'
import { advanceSoftwareImageStep } from './steps'
import { softwareVersion } from './version'

const fixtureForTest = setupBackendTests()
afterEach(() => vi.useRealTimers())

async function createStepFixture(id: string) {
  const { images: runtime, boat } = fixtureForTest()
  const { env, dependencies } = runtime
  await insertSoftwareImage(env.DB, {
    id,
    account: 'boat',
    version: await softwareVersion(SOFTWARE_RELEASE),
    artifact: SOFTWARE_RELEASE,
    tokenDigest: 'a'.repeat(64),
    now: dependencies.now(),
  })
  async function readAttempt() {
    const image = await readSoftwareImage(env.DB, id)
    if (!image) throw new Error('Missing software image attempt')
    return image
  }
  return {
    runtime,
    image: await readAttempt(),
    readAttempt,
    boat,
    provider: providerForAccount(env, dependencies.fetch, 'boat'),
    tasks: fakeCodexTasks(),
  }
}

it('refuses to issue a software image machine token after the poll answers', async () => {
  const { runtime, image, readAttempt, boat, provider, tasks } =
    await createStepFixture('software-image-after-answer')
  await advanceSoftwareImageStep(runtime, provider, image)
  const allocating = await readAttempt()
  expect(allocating).toMatchObject({
    phase: 'allocating',
    machineTokenCiphertext: expect.stringMatching(/^v1\./u),
  })
  const before = heldOperation()
  const outcomes: unknown[] = []
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const response = boundedSoftwareImagePoll(
    runtime.env,
    runtime.dependencies,
    tasks.execution,
    async (bounded) => {
      await before.wait()
      outcomes.push(
        await advanceSoftwareImageStep(bounded, provider, allocating).catch(
          (error: unknown) => error,
        ),
      )
      return softwareImageResult(allocating, '')
    },
  )
  try {
    await before.entered
    await vi.advanceTimersByTimeAsync(20_000)
    expect((await response).status).toBe(503)
    before.release()
    await tasks.drain()
    expect(outcomes).toEqual([new ProviderError('unavailable', 503)])
    expect(await readAttempt()).toMatchObject({
      phase: 'allocating',
      machineTokenCiphertext: allocating.machineTokenCiphertext,
    })
    expect(boat.starts).toEqual([])
    const owner = softwareImageMachineOwner(image.id)
    await expect(
      machineClient(runtime.env, owner).connection(),
    ).rejects.toMatchObject({ code: 'machine_not_found' })
  } finally {
    before.release()
    await response
    await tasks.drain()
  }
})

it('ends token issue at the poll deadline and keeps the same token for a competing create', async () => {
  const { runtime, image, readAttempt, boat, provider, tasks } =
    await createStepFixture('software-image-work-limit')
  const reservations = await Promise.allSettled([
    advanceSoftwareImageStep(runtime, provider, image),
    advanceSoftwareImageStep(runtime, provider, image),
  ])
  expect(reservations).toEqual(
    expect.arrayContaining([
      { status: 'fulfilled', value: {} },
      { status: 'rejected', reason: expect.any(AttemptChanged) },
    ]),
  )
  const allocating = await readAttempt()
  const machines = runtime.env.MACHINES
  if (!machines) throw new Error('Missing test machine binding')
  const reply = heldOperation()
  const digests: string[] = []
  const outcomes: unknown[] = []
  const env = {
    ...runtime.env,
    MACHINES: new Proxy(machines, {
      get(target, key) {
        if (key !== 'get') return Reflect.get(target, key, target)
        return (id: DurableObjectId) =>
          new Proxy(target.get(id), {
            get(stub, property) {
              if (property !== 'issueToken')
                return Reflect.get(stub, property, stub)
              return async (owner: MachineOwner, digest: string) => {
                digests.push(digest)
                const result = await stub.issueToken(owner, digest)
                if (digests.length === 1) await reply.wait()
                return result
              }
            },
          })
      },
    }),
  }
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const response = boundedSoftwareImagePoll(
    env,
    runtime.dependencies,
    tasks.execution,
    async (bounded) => {
      outcomes.push(
        await advanceSoftwareImageStep(bounded, provider, allocating).catch(
          (error: unknown) => error,
        ),
      )
      return softwareImageResult(allocating, '')
    },
  )
  try {
    await reply.entered
    await vi.advanceTimersByTimeAsync(20_000)
    expect((await response).status).toBe(503)
    await vi.advanceTimersByTimeAsync(24_999)
    expect(outcomes).toEqual([])
    expect(boat.starts).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(outcomes).toEqual([new ProviderError('unavailable', 503)])
    expect(boat.starts).toEqual([])
    const replay = await readAttempt()
    expect(replay).toMatchObject({
      phase: 'allocating',
      machineTokenCiphertext: expect.stringMatching(/^v1\./u),
    })
    expect(replay.machineTokenCiphertext).toBe(
      allocating.machineTokenCiphertext,
    )
    await advanceSoftwareImageStep({ ...runtime, env }, provider, replay)
    expect(digests).toHaveLength(2)
    expect(digests[1]).toBe(digests[0])
  } finally {
    reply.release()
    await response
    await tasks.drain()
  }
  expect(boat.starts).toHaveLength(1)
})

it('replays a software image allocation from the previous Worker without machine environment', async () => {
  const { runtime, image, readAttempt, boat, provider } =
    await createStepFixture('software-image-legacy-allocation')
  await saveSoftwareImage(runtime.env.DB, image, { phase: 'allocating' })
  boat.lostCreateReplies = 1
  await expect(
    advanceSoftwareImageStep(runtime, provider, await readAttempt()),
  ).rejects.toEqual(new ProviderError('unavailable', 503))
  expect(await readAttempt()).toMatchObject({
    phase: 'allocating',
    machineTokenCiphertext: null,
    sandboxId: null,
  })
  await advanceSoftwareImageStep(runtime, provider, await readAttempt())
  expect(boat.starts).toHaveLength(2)
  expect(boat.starts[0].env).toEqual({})
  expect(boat.starts[1]).toEqual(boat.starts[0])
  expect(await readAttempt()).toMatchObject({
    phase: 'software',
    machineTokenCiphertext: null,
    sandboxId: 'bx_1',
  })
  await expect(
    machineClient(
      runtime.env,
      softwareImageMachineOwner(image.id),
    ).connection(),
  ).rejects.toMatchObject({ code: 'machine_not_found' })
})
