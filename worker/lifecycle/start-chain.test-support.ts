import type { backendFixture } from './backend-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { readStartJob, serializeStartJob } from './start-job-codec'
import { START_JOB_KEY } from './start-storage'
import type { WorkspaceValues } from './platform-storage'
import type { WorkspaceStartJob } from './start-types'
import { createWorkspace } from './workspaces'

export async function pendingCreate(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
) {
  const created = await fixture.run(() =>
    createWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const actor = fixture.actors.get(created.workspace.id)
  const start = fixture.starts.get(created.workspace.id)
  if (!actor || !start) throw new Error('Missing start actor')
  return {
    ...start,
    actor,
    endpoint: actor.endpoint(),
    save: async (job: WorkspaceStartJob) => {
      await actor.storage.put<WorkspaceValues['job']>(
        START_JOB_KEY,
        serializeStartJob(job),
      )
    },
    stored: async () => {
      const job = await actor.storage.get<WorkspaceValues['job']>(START_JOB_KEY)
      if (!job) throw new Error('Missing saved start')
      return readStartJob(job)
    },
  }
}
