import { expect, it, vi } from 'vitest'

import { turn } from '../test-support/harness'
import { deferred } from '../test-support/runtime'
import { wireFixture } from '../test-support/wire'
import * as checkpoints from './checkpoint'
import type { Repository } from './repository'

it('aborts the runner Repository Git signal on Stop while its checkpoint waits', async () => {
  const h = await wireFixture()
  const entered = deferred<Repository>()
  const baseline = deferred<checkpoints.Checkpoint>()
  vi.mocked(checkpoints.checkpoint).mockImplementation(async (repository) => {
    entered.resolve(repository)
    return baseline.promise
  })
  await h.runner.start(false)
  h.endpoint.send(turn())
  const repository = await entered.promise
  try {
    expect(repository.git.signal?.aborted).toBe(false)
    h.endpoint.send({
      type: 'interrupt',
      commandId: 'stop-repository-scan',
      sessionId: 'session-1',
      turnId: 'turn-1',
    })
    await h.runner.idle()
    expect(repository.git.signal?.aborted).toBe(true)
    expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
      type: 'turn.completed',
      state: 'stopped',
    })
    expect(h.providers.processes).toEqual([])
    expect(h.warnings).toEqual([])
  } finally {
    baseline.resolve(new Map())
  }
})
