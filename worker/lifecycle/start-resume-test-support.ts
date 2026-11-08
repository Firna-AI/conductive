import { TEST_TIME } from '../test-support/harness'
import type { backendFixture } from './backend-test-support'
import { startRetryFixture } from './retry-test-support'
import type { WorkspaceStartJob } from './start-types'

export async function resumedStartup(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
  requestedByUserId = fixture.user.id,
) {
  const start = await startRetryFixture(fixture)
  const created = await start.job()
  if (!created) throw new Error('Missing create job')
  const platform = fixture.actors.get(created.workspaceId)
  if (!platform) throw new Error('Missing workspace actor')
  const actor = platform.endpoint()
  await start.tick(fixture.runtime.dependencies.now() + 1_000)
  await actor.reportRunnerLifecycle({ type: 'runner.ready' })
  await start.tick(fixture.runtime.dependencies.now())
  await actor.lifecycleStopped()
  fixture.boat.states.set('bx_1', 'archived')
  fixture.setTime(TEST_TIME + 30_000)
  const resume: WorkspaceStartJob = {
    ...created,
    kind: 'resume',
    requestedByUserId,
    admission: undefined,
    creation: undefined,
    phase: 'machine',
    attempt: 'resume-under-test',
    allocatedSandboxId: 'bx_1',
    processId: null,
  }
  if (!(await actor.queueLifecycleStart(resume)))
    throw new Error('The resume was not accepted')
  for (let step = 0; step < 8; step++) {
    const job = await start.job()
    if (job?.phase === 'startup' && job.processId !== null) break
    await start.advance()
  }
  return {
    ...start,
    get actor() {
      return platform.endpoint()
    },
    retry: () =>
      platform
        .endpoint()
        .queueLifecycleStart({ ...resume, attempt: 'later-resume' }),
  }
}
