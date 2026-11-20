import type { WorkspaceEventEnvelope } from '../chat/workspace-events'
import { number, record } from '../chat/inputs'
import type { TestHarness } from '../test-support/harness'
import type { NativeActor } from '../test-support/native-runtime'
import type { GitHubRefreshRequest } from './contracts'

export async function inspectGitHubActor(
  actor: NativeActor,
  workspaceId: string,
  publications: WorkspaceEventEnvelope[],
) {
  const snapshot = await actor.api.controls.snapshot()
  publications.push(...(await actor.api.controls.takePublications()))
  const history = await actor.api.controls.history(workspaceId)
  return {
    ...snapshot,
    events: history.events,
    published: [...publications],
    scheduled: [...snapshot.records]
      .filter(([key]) => key.startsWith('github-refresh:'))
      .map(([, value]) => {
        const read = record(value)
        return {
          request: read.request,
          delayMs: number(read.at) - snapshot.now,
        }
      }),
  }
}

export async function advanceGitHubAlarm(
  base: TestHarness,
  actor: NativeActor,
  workspaceId: string,
) {
  await actor.api.github.takeRefreshes()
  const stored = await actor.api.storage.list<{
    at: number
    request: GitHubRefreshRequest
  }>({
    prefix: 'github-refresh:',
  })
  const next = Math.min(...[...stored.values()].map((read) => read.at))
  if (!Number.isFinite(next)) throw new Error('No scheduled GitHub refresh')
  const fired = await base.native.advanceTo(next, [workspaceId])
  if (fired !== 1)
    throw new Error(`Expected one stored alarm, received ${fired}`)
  const refreshes = await actor.api.github.takeRefreshes()
  const last = refreshes.at(-1)
  if (!last) throw new Error('The stored alarm did not refresh GitHub')
  return last.result
}
