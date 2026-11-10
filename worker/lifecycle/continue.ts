import type { User } from '../../src/shared/api'
import type {
  ContinueWorkspaceRequest,
  ContinueWorkspaceResponse,
} from '../../src/shared/workspaces'
import { presentWorkspace } from '../data/workspace-link'
import { readMergeWorkspace } from '../github/merge-access'
import { requireFeatureResult } from '../features/result'
import { HttpError } from '../http'
import { sandboxProvider } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import { reserveContinue } from './continue-admission'
import { authorizeContinue } from './continue-data'
import {
  advanceContinue,
  continueFailed,
  type ContinueProgress,
} from './continue-progress'
import {
  CONTINUE_JOB_KEY,
  continueJobKey,
  continuedBranchKey,
  type ContinueJob,
  type ContinueOptions,
} from './continue-types'

/** The durable reservation excludes dispatch. Provider waits never hold the chat queue. */
export class WorkspaceContinue implements ContinueProgress {
  scope: string | null = null
  private readonly options: ContinueOptions
  private advancing: Promise<void> = Promise.resolve()

  constructor(options: ContinueOptions) {
    this.options = options
  }

  async start(
    orgId: string,
    id: string,
    member: User,
    request: ContinueWorkspaceRequest,
    origin: string,
  ): Promise<ContinueWorkspaceResponse> {
    const old = await this.options.storage.get<string>(
      continuedBranchKey(request.expectedBranch),
    )
    if (old) return this.result(orgId, id, member.id, old, origin)
    const job = await this.options.run(async () => {
      const saved = await reserveContinue(
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
    continueId: string,
    origin: string,
  ): Promise<ContinueWorkspaceResponse> {
    if (!this.options.matches(id))
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    await readMergeWorkspace(this.options.env.DB, orgId, id, userId)
    const job = await this.options.storage.get<ContinueJob>(
      continueJobKey(continueId),
    )
    if (
      !job ||
      job.binding.orgId !== orgId ||
      job.binding.id !== id ||
      job.member.id !== userId
    )
      throw new HttpError(
        404,
        'workspace_continue_unavailable',
        'This Continue request is not available. Open the workspace and try again.',
      )
    return this.response(job, origin)
  }

  private response(
    job: ContinueJob,
    origin: string,
  ): ContinueWorkspaceResponse {
    if (!job.outcome) return { state: 'pending', continueId: job.id }
    const result = requireFeatureResult(job.outcome)
    return result.state === 'continued'
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

  async save(job: ContinueJob): Promise<void> {
    await this.options.run(async () => {
      const current = await this.options.storage.get<ContinueJob | null>(
        CONTINUE_JOB_KEY,
      )
      if (!current || current.id !== job.id || current.outcome) return
      if (current.cancelled) job.cancelled = true
      await this.options.storage.put(continueJobKey(job.id), job)
      await this.options.storage.put(CONTINUE_JOB_KEY, job)
    })
  }

  async finish(
    job: ContinueJob,
    outcome: NonNullable<ContinueJob['outcome']>,
  ): Promise<void> {
    this.scope = null
    await this.options.run(async () => {
      const current = await this.options.storage.get<ContinueJob | null>(
        CONTINUE_JOB_KEY,
      )
      if (!current || current.id !== job.id) return
      await this.options.storage.put(continueJobKey(job.id), {
        ...job,
        outcome,
      })
      await this.options.storage.put(CONTINUE_JOB_KEY, null)
    })
  }

  advance(): Promise<void> {
    const work = this.advancing.then(() => this.advanceOwned())
    this.advancing = work.catch(() => undefined)
    return work
  }

  private async advanceOwned(): Promise<void> {
    const job = await this.options.storage.get<ContinueJob | null>(
      CONTINUE_JOB_KEY,
    )
    if (!job || (job.outcome && job.phase !== 'publish')) {
      await this.options.schedule(null)
      return
    }
    try {
      await advanceContinue(this.options, this, job)
    } catch (error) {
      this.scope = null
      if (
        job.commandStarted &&
        error instanceof ProviderError &&
        error.kind === 'not_found'
      ) {
        job.processId = null
        await this.save(job)
      }
      if (
        job.phase === 'publish' ||
        (job.commandStarted && (job.phase === 'move' || job.phase === 'fetch'))
      ) {
        await this.options.schedule(this.options.dependencies.now() + 1_000)
        return
      }
      const failure = error instanceof HttpError ? error : continueFailed(job)
      await this.finish(job, {
        ok: false,
        error: {
          status: failure.status,
          code: failure.code,
          message: failure.message,
        },
      })
    }
    const pending = await this.options.storage.get<ContinueJob | null>(
      CONTINUE_JOB_KEY,
    )
    await this.options.schedule(
      pending ? this.options.dependencies.now() + 1_000 : null,
    )
    if (!pending) await this.options.run(() => this.options.chat.flushRunner())
  }

  async credentialSender(turnId: string): Promise<string | null | undefined> {
    const job = await this.options.storage.get<ContinueJob | null>(
      CONTINUE_JOB_KEY,
    )
    if (!job || job.fetchId !== turnId) return undefined
    if (
      this.scope !== turnId ||
      job.phase !== 'fetch' ||
      job.cancelled ||
      job.outcome
    )
      return null
    if (job.processId !== null) {
      const status = await sandboxProvider(
        this.options.env,
        this.options.dependencies.fetch,
      ).getCommandStatus(job.sandboxId, job.processId, {
        stdoutOffset: job.stdoutOffset,
        stderrOffset: job.stderrOffset,
      })
      if (!status.running) {
        this.scope = null
        return null
      }
    }
    return this.options.run(async () => {
      const current = await this.options.storage.get<ContinueJob | null>(
        CONTINUE_JOB_KEY,
      )
      if (
        !current ||
        current.id !== job.id ||
        current.phase !== 'fetch' ||
        current.cancelled ||
        this.scope !== turnId
      )
        return null
      await authorizeContinue(this.options, current)
      return this.scope === turnId ? current.member.id : null
    })
  }

  async cancel(): Promise<void> {
    this.scope = null
    const job = await this.options.storage.get<ContinueJob | null>(
      CONTINUE_JOB_KEY,
    )
    if (job) await this.save({ ...job, cancelled: true })
  }
}
