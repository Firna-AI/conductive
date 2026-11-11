import { softwareVersion } from '../software-image/version'
import { SOFTWARE, type backendFixture } from './backend-test-support'
import { seededCompletedWorkspace } from './backend-workspace.test-support'
import { resumeWorkspace } from './workspace-resume'
import { recordWorkspaceSoftwareVersion } from './workspace-software-data'
import type { WorkspaceStartJob } from './start-types'

export async function softwareResume(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
  version = 'old-software',
) {
  const saved = await seededCompletedWorkspace(fixture)
  await recordWorkspaceSoftwareVersion(
    fixture.runtime.env.DB,
    fixture.org.id,
    saved.id,
    version,
  )
  await saved.actor.endpoint().lifecycleStopped()
  fixture.boat.states.set(saved.sandboxId, 'archived')
  await resumeWorkspace(
    fixture.runtime,
    fixture.org.id,
    saved.id,
    fixture.user.id,
  )
  const start = fixture.starts.get(saved.id)
  if (!start) throw new Error('Missing software resume')
  return { ...saved, ...start }
}

export async function reachPhase(
  start: {
    job(): Promise<WorkspaceStartJob | undefined>
    advance(): Promise<void>
  },
  phase: WorkspaceStartJob['phase'],
) {
  for (let step = 0; step < 20; step++) {
    const job = await start.job()
    if (!job || job.phase === phase) return job
    await start.advance()
  }
  return start.job()
}

export async function currentSoftwareVersion() {
  return softwareVersion(SOFTWARE)
}

export async function finishSoftwareStart(
  start: Awaited<ReturnType<typeof softwareResume>>,
) {
  await reachPhase(start, 'runner')
  await start.actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  await start.advance()
  return start.wait()
}
