import { requireActiveOrg } from '../data/user-access'
import { workspaceRecord } from './workspace-data'
import { storeContinuedBranch } from './continue-data'
import {
  CONTINUE_JOB_KEY,
  continueJobKey,
  continuedBranchKey,
  type ContinueJob,
  type ContinueOptions,
} from './continue-types'

/** The move is already durable. Publication repairs it without running Git again. */
export async function publishContinue(
  options: ContinueOptions,
  job: ContinueJob,
): Promise<void> {
  await requireActiveOrg(options.env.DB, job.binding.orgId)
  const row = await storeContinuedBranch(options, job)
  const binding = {
    ...job.binding,
    branch: job.branch,
    defaultBranch: job.baseBranch,
  }
  await options.chat.authorizedWorkspaceOperation(
    job.binding.id,
    async () => {
      await options.assertActive()
      await requireActiveOrg(options.env.DB, job.binding.orgId)
    },
    async (operation) => {
      const replay = await operation.change(async (view) => {
        const saved = await view.github.get<ContinueJob>(continueJobKey(job.id))
        if (saved?.outcome?.ok && saved.outcome.value.state === 'continued')
          return saved.publication
        const after = view.eventNumber
        const workspace = workspaceRecord(row)
        await view.emit({ type: 'workspace.updated', workspace })
        for (const session of await view.sessions())
          await view.emit({
            type: 'workspace.continued',
            sessionId: session.id,
            member: job.member,
            branch: job.branch,
            baseBranch: job.baseBranch,
          })
        const completed = {
          ...job,
          publication: { after, through: view.eventNumber },
          outcome: {
            ok: true,
            value: {
              state: 'continued',
              workspace,
              eventNumber: view.eventNumber,
            },
          },
        } satisfies ContinueJob
        await view.github.put(continueJobKey(job.id), completed)
        await view.github.put(continuedBranchKey(job.binding.branch), job.id)
        await view.github.put(CONTINUE_JOB_KEY, completed)
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
  await options.scheduleRefresh(binding)
  await options.run(async () => {
    const current = await options.storage.get<ContinueJob | null>(
      CONTINUE_JOB_KEY,
    )
    if (current?.id === job.id)
      await options.storage.put(CONTINUE_JOB_KEY, null)
  })
}
