import { requireActiveOrg } from '../data/user-access'
import { markFilesMoved } from '../files/storage'
import { providerForAccount } from '../sandbox/client'
import { warnWorker } from '../warnings'
import { WarningId } from '../warning-values'
import { repositoryChangeSettleCommand } from './repository-change-commands'
import { storeChangedRepository } from './repository-change-data'
import {
  REPOSITORY_CHANGE_JOB_KEY,
  repositoryChangedKey,
  repositoryChangeJobKey,
  type RepositoryChangeJob,
  type RepositoryChangeOptions,
} from './repository-change-types'
import { workspaceRecord } from './workspace-data'
import { workspaceCommandChannel } from './workspace-command-channel'

/** The move is already durable. Publication repairs it without running Git again. */
export async function publishRepositoryChange(
  options: RepositoryChangeOptions,
  job: RepositoryChangeJob,
): Promise<void> {
  await requireActiveOrg(options.env.DB, job.binding.orgId)
  const row = await storeChangedRepository(options, job)
  await options.chat.authorizedWorkspaceOperation(
    job.binding.id,
    async () => {
      await options.assertActive()
      await requireActiveOrg(options.env.DB, job.binding.orgId)
    },
    async (operation) => {
      const replay = await operation.change(async (view) => {
        const saved = await view.github.get<RepositoryChangeJob>(
          repositoryChangeJobKey(job.id),
        )
        if (saved?.outcome?.ok && saved.outcome.value.state === 'changed')
          return saved.publication
        const after = view.eventNumber
        const workspace = workspaceRecord(row)
        await view.emit({ type: 'workspace.updated', workspace })
        for (const session of await view.sessions())
          await view.emit({
            type: 'workspace.repository-changed',
            sessionId: session.id,
            member: job.member,
            repository: {
              id: job.target.repositoryId,
              fullName: job.target.fullName,
            },
            branch: job.branch,
            baseBranch: job.baseBranch,
          })
        await markFilesMoved(view.files)
        const completed = {
          ...job,
          publication: { after, through: view.eventNumber },
          outcome: {
            ok: true,
            value: {
              state: 'changed',
              workspace,
              eventNumber: view.eventNumber,
            },
          },
        } satisfies RepositoryChangeJob
        await view.github.put(repositoryChangeJobKey(job.id), completed)
        await view.github.put(
          repositoryChangedKey(job.repositoryId, job.binding.branch),
          job.id,
        )
        await view.github.put(REPOSITORY_CHANGE_JOB_KEY, completed)
        return undefined
      })
      if (replay) {
        let after = replay.after
        while (true) {
          const page = await options.chat.store.read(job.binding.id, (view) =>
            view.history(after, replay.through),
          )
          for (const envelope of page.events) operation.publish(envelope)
          if (!page.hasMore) break
          after = page.nextAfterEventNumber
        }
      }
    },
  )
  await settle(options, job)
  await options.scheduleRefresh(job.target.binding)
  await options.run(async () => {
    const current = await options.storage.get<RepositoryChangeJob | null>(
      REPOSITORY_CHANGE_JOB_KEY,
    )
    if (current?.id === job.id)
      await options.storage.put(REPOSITORY_CHANGE_JOB_KEY, null)
  })
}

/** The steps after publication only warn, because the change is already stored. */
async function settle(
  options: RepositoryChangeOptions,
  job: RepositoryChangeJob,
): Promise<void> {
  try {
    const provider = providerForAccount(
      options.env,
      options.dependencies.fetch,
      job.providerAccount,
    )
    const channel = workspaceCommandChannel(options.env, job, provider)
    const result = await channel.runCommand(repositoryChangeSettleCommand(job))
    if (result.exitCode === 0 && !result.timedOut) return
  } catch {
    // Setup and send failures use the same warning as an unsuccessful exit.
  }
  warnWorker({
    kind: 'repository_change_settle_failed',
    workspaceId: WarningId.checked(job.binding.id),
  })
}
