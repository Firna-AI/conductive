import { afterEach, expect, it, vi } from 'vitest'

import { fakeCodexTasks } from '../codex-auth/tasks.test-support'
import type { AppEnv } from '../env'
import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { SOFTWARE_RELEASE } from '../lifecycle/software-release-test-support'
import type { MachineOwner } from '../machines/identity'
import { providerForAccount } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import { heldOperation } from '../test-support/held-operation'
import { requestSoftwareImage } from './build'
import { softwareImageChannel } from './channel'
import { softwareImages } from './data'
import { boundedSoftwareImagePoll } from './poll'
import { softwareImageResult } from './result'

const fixtureForTest = setupBackendTests()
afterEach(() => vi.useRealTimers())

async function hostPollFixture() {
  const { images, boat, host } = fixtureForTest()
  boat.commandRunning = true
  await requestSoftwareImage(images, SOFTWARE_RELEASE, 'a'.repeat(64))
  const [image] = await softwareImages(images.env.DB, 'boat')
  if (!image?.sandboxId) throw new Error('Missing software image sandbox')
  const { sandboxId } = image
  const provider = providerForAccount(
    images.env,
    images.dependencies.fetch,
    'boat',
  )
  const tasks = fakeCodexTasks()
  return {
    env: images.env,
    boat,
    host,
    tasks,
    run: (
      command: string,
      before: () => Promise<void>,
      results: unknown[],
      env = images.env,
    ) =>
      boundedSoftwareImagePoll(
        env,
        images.dependencies,
        tasks.execution,
        async (runtime) => {
          await before()
          const channel = softwareImageChannel(
            runtime,
            provider,
            image.id,
            sandboxId,
          )
          results.push(
            await channel.runCommand(command).catch((error: unknown) => error),
          )
          return softwareImageResult(image, '')
        },
      ),
  }
}

function holdHostReply(env: AppEnv, hold: () => Promise<void>): AppEnv {
  const machines = env.MACHINES
  if (!machines) throw new Error('Missing test machine binding')
  return {
    ...env,
    MACHINES: new Proxy(machines, {
      get(target, key) {
        if (key !== 'get') return Reflect.get(target, key, target)
        return (id: DurableObjectId) =>
          new Proxy(target.get(id), {
            get(stub, method) {
              if (method !== 'runCommand')
                return Reflect.get(stub, method, stub)
              return async (
                owner: MachineOwner,
                command: string,
                timeout: number,
              ) => {
                const result = await stub.runCommand(owner, command, timeout)
                await hold()
                return result
              }
            },
          })
      },
    }),
  }
}

it('refuses a software image host command after the poll answers', async () => {
  const { boat, host, tasks, run } = await hostPollFixture()
  const before = heldOperation()
  const outcomes: unknown[] = []
  const count = boat.commandRequests.length
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const response = run('true', before.wait, outcomes)
  try {
    await before.entered
    await vi.advanceTimersByTimeAsync(20_000)
    expect((await response).status).toBe(503)
    before.release()
    await tasks.drain()
    expect(outcomes).toEqual([new ProviderError('unavailable', 503)])
    expect(boat.commandRequests).toHaveLength(count)
    expect(host.commandRequests).toEqual(boat.commandRequests)
  } finally {
    before.release()
    await response
    await tasks.drain()
  }
})

it('ends a pending software image host command at the poll work deadline', async () => {
  const { boat, host, tasks, run, env } = await hostPollFixture()
  const reply = heldOperation()
  const outcomes: unknown[] = []
  const command = "rm -rf -- '/tmp/conductive-lifecycle'"
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const response = run(
    command,
    async () => {},
    outcomes,
    holdHostReply(env, reply.wait),
  )
  try {
    await reply.entered
    await vi.advanceTimersByTimeAsync(20_000)
    expect((await response).status).toBe(503)
    await vi.advanceTimersByTimeAsync(24_999)
    expect(outcomes).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(outcomes).toEqual([new ProviderError('unavailable', 503)])
    expect(host.commands.at(-1)).toBe(command)
    expect(boat.commandRequests).toEqual(host.commandRequests)
  } finally {
    reply.release()
    await response
    await tasks.drain()
  }
})
