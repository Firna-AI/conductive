import type { User } from '../../src/shared/api'
import type {
  ChangeRepositoryRequest,
  ChangeRepositoryResponse,
} from '../../src/shared/workspaces'
import { presentWorkspace } from '../data/workspace-link'
import { requireFeatureResult } from '../features/result'
import { readMergeWorkspace } from '../github/merge-access'
import { HttpError } from '../http'
import { providerForAccount } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import { reserveRepositoryChange } from './repository-change-admission'
import { authorizeRepositoryChange } from './repository-change-data'
import { endAfterFailure } from './repository-change-end'
import { repositoryChangeFailed } from './repository-change-errors'
import {
  advanceRepositoryChange,
  type RepositoryChangeProgress,
} from './repository-change-progress'
import {
  REPOSITORY_CHANGE_JOB_KEY,
  readRepositoryChangeJob,
  repositoryChangedKey,
  repositoryChangeJobKey,
  type RepositoryChangeJob,
  type RepositoryChangeOptions,
} from './repository-change-types'
import { workspaceCommandChannel } from './workspace-command-channel'

/**
 * The durable job of a repository change, beside Continue. The running job
 * is the reservation of the workspace. Command waits never hold the chat
 * queue.
 */
export class WorkspaceRepositoryChange implements RepositoryChangeProgress {
  scope: string | null = null
  private readonly options: RepositoryChangeOptions
  private advancing: Promise<void> = Promise.resolve()

  constructor(options: RepositoryChangeOptions) {
    this.options = options
  }

  async start(
    orgId: string,
    id: string,
    member: User,
    request: ChangeRepositoryRequest,
    origin: string,
  ): Promise<ChangeRepositoryResponse> {
    const previous = await this.options.storage.get<string>(
      repositoryChangedKey(
        request.expectedRepositoryId,
        request.expectedBranch,
      ),
    )
    const done =
      previous &&
      (await readRepositoryChangeJob(
        this.options.storage,
        repositoryChangeJobKey(previous),
      ))
    if (
      previous &&
      done &&
      done.member.id === member.id &&
      done.request.repositoryId === request.repositoryId
    )
      return this.result(orgId, id, member.id, previous, origin)
    const job = await this.options.run(async () => {
      const saved = await reserveRepositoryChange(
        this.options,
        orgId,
        id,
        member,
        request,
      )
      await this.options.activity()
      return saved
    })
    await this.options.schedule(this.options.dependencies.now())
    return this.response(job, origin)
  }

  async result(
    orgId: string,
    id: string,
    userId: string,
    changeId: string,
    origin: string,
  ): Promise<ChangeRepositoryResponse> {
    if (!this.options.matches(id))
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    await readMergeWorkspace(this.options.env.DB, orgId, id, userId)
    const job = await readRepositoryChangeJob(
      this.options.storage,
      repositoryChangeJobKey(changeId),
    )
    if (
      !job ||
      job.binding.orgId !== orgId ||
      job.binding.id !== id ||
      job.member.id !== userId
    )
      throw new HttpError(
        404,
        'workspace_repository_change_unavailable',
        'This repository change is not available. Open the workspace and try again.',
      )
    return this.response(job, origin)
  }

  private response(
    job: RepositoryChangeJob,
    origin: string,
  ): ChangeRepositoryResponse {
    if (!job.outcome) return { state: 'pending', changeId: job.id }
    const result = requireFeatureResult(job.outcome)
    return result.state === 'changed'
      ? {
          ...result,
          workspace: presentWorkspace(result.workspace, {
            origin,
            orgId: job.binding.orgId,
            workspaceId: job.binding.id,
            number: result.workspace.number,
          }),
        }
      : result
  }

  async save(job: RepositoryChangeJob): Promise<void> {
    await this.options.run(async () => {
      const current = await readRepositoryChangeJob(this.options.storage)
      if (!current || current.id !== job.id || current.outcome) return
      if (current.cancelled) job.cancelled = true
      await this.options.storage.put(repositoryChangeJobKey(job.id), job)
      await this.options.storage.put(REPOSITORY_CHANGE_JOB_KEY, job)
    })
  }

  async finish(
    job: RepositoryChangeJob,
    outcome: NonNullable<RepositoryChangeJob['outcome']>,
  ): Promise<void> {
    this.scope = null
    await this.options.run(async () => {
      const current = await readRepositoryChangeJob(this.options.storage)
      if (!current || current.id !== job.id) return
      await this.options.storage.put(repositoryChangeJobKey(job.id), {
        ...job,
        outcome,
      })
      await this.options.storage.put(REPOSITORY_CHANGE_JOB_KEY, null)
    })
  }

  advance(): Promise<void> {
    const work = this.advancing.then(() => this.advanceOwned())
    this.advancing = work.catch(() => undefined)
    return work
  }

  private async advanceOwned(): Promise<void> {
    const job = await readRepositoryChangeJob(this.options.storage)
    if (!job || (job.outcome && job.phase !== 'publish')) {
      await this.options.schedule(null)
      return
    }
    try {
      await advanceRepositoryChange(this.options, this, job)
    } catch (error) {
      this.scope = null
      if (
        job.commandStarted &&
        job.commandRoute !== 'host' &&
        error instanceof ProviderError &&
        error.kind === 'not_found'
      ) {
        job.processId = null
        delete job.commandRoute
        await this.save(job)
      }
      if (await this.retries(job, error)) {
        await this.options.schedule(this.options.dependencies.now() + 1_000)
        return
      }
    }
    const pending = await readRepositoryChangeJob(this.options.storage)
    await this.options.schedule(
      pending ? this.options.dependencies.now() + 1_000 : null,
    )
    if (!pending)
      await this.options.run(async () => {
        await this.options.moveRunner()
        await this.options.chat.flushRunner()
      })
  }

  /**
   * A started fetch or move and publication retry failed steps until the
   * end rule ends the job. Other failures end the job immediately.
   */
  private async retries(
    job: RepositoryChangeJob,
    error: unknown,
  ): Promise<boolean> {
    if (
      job.phase === 'publish' ||
      (job.commandStarted && (job.phase === 'move' || job.phase === 'fetch'))
    )
      return !(await endAfterFailure(this.options, this, job, job.phase))
    const failure =
      error instanceof HttpError ? error : repositoryChangeFailed(job)
    await this.finish(job, {
      ok: false,
      error: {
        status: failure.status,
        code: failure.code,
        message: failure.message,
      },
    })
    return false
  }

  /** The member who started the change, for the Git credential of its fetch. */
  async credentialSender(turnId: string): Promise<string | null | undefined> {
    const job = await readRepositoryChangeJob(this.options.storage)
    if (!job || job.fetchId !== turnId) return undefined
    if (
      this.scope !== turnId ||
      job.phase !== 'fetch' ||
      job.cancelled ||
      job.outcome
    )
      return null
    if (job.processId !== null) {
      await this.options.run(() => authorizeRepositoryChange(this.options, job))
      const provider = providerForAccount(
        this.options.env,
        this.options.dependencies.fetch,
        job.providerAccount,
      )
      const status = await workspaceCommandChannel(
        this.options.env,
        job,
        provider,
      ).getCommandStatus(
        { processId: job.processId, route: job.commandRoute ?? 'provider' },
        { stdoutOffset: job.stdoutOffset, stderrOffset: job.stderrOffset },
      )
      if (!status.running) {
        this.scope = null
        return null
      }
    }
    return this.options.run(async () => {
      const current = await readRepositoryChangeJob(this.options.storage)
      if (
        !current ||
        current.id !== job.id ||
        current.phase !== 'fetch' ||
        current.cancelled ||
        this.scope !== turnId
      )
        return null
      await authorizeRepositoryChange(this.options, current)
      return this.scope === turnId ? current.member.id : null
    })
  }

  async cancel(): Promise<void> {
    this.scope = null
    const job = await readRepositoryChangeJob(this.options.storage)
    if (job) await this.save({ ...job, cancelled: true })
  }
}
