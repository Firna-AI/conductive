import type { WorkspaceChat } from '../chat/backend'
import type { AppDependencies, AppEnv } from '../env'
import { createGitHubStatePort } from '../github/chat-store'
import type {
  GitHubRefresh,
  GitHubRefreshRequest,
  GitHubWorkspace,
} from '../github/contracts'
import { installationTokenProvider } from '../github/credentials'
import { refreshWorkspace } from '../github/refresh'
import { WorkspaceGitHubState } from '../github/workspace-state'
import { HttpError } from '../http'
import { captureUnexpectedWorkerFailure } from '../error-reporting/policy'
import type { WorkspaceAlarms } from './alarms'
import type { ReceiverStorage } from '../members/receiver-storage'

interface ScheduledRead {
  at: number
  request: GitHubRefreshRequest
}

export class WorkspaceGitHub {
  private state: WorkspaceGitHubState | undefined
  private readonly storage: ReceiverStorage
  private readonly env: AppEnv
  private readonly dependencies: AppDependencies
  private readonly chat: WorkspaceChat
  private readonly matches: (id: string) => boolean
  private readonly alarms: WorkspaceAlarms

  constructor(
    storage: ReceiverStorage,
    env: AppEnv,
    dependencies: AppDependencies,
    chat: WorkspaceChat,
    matches: (id: string) => boolean,
    alarms: WorkspaceAlarms,
  ) {
    this.storage = storage
    this.env = env
    this.dependencies = dependencies
    this.chat = chat
    this.matches = matches
    this.alarms = alarms
  }

  async refresh(workspace: GitHubWorkspace, signal: GitHubRefresh) {
    if (!this.matches(workspace.id))
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    this.state ??= new WorkspaceGitHubState(
      createGitHubStatePort(
        this.chat,
        workspace.id,
        async (request, delayMs) => {
          await this.storage.put(
            `github-refresh:${this.dependencies.randomToken()}`,
            {
              at: this.dependencies.now() + delayMs,
              request,
            } satisfies ScheduledRead,
          )
          await this.schedule()
        },
      ),
    )
    return refreshWorkspace(this.env.DB, workspace, signal, this.state, {
      ...this.dependencies,
      token: installationTokenProvider(
        {
          ...this.env,
          GITHUB_APP_PRIVATE_KEY: this.env.GITHUB_APP_PRIVATE_KEY ?? '',
        },
        this.dependencies.fetch,
        this.dependencies.now,
      ),
    })
  }

  async alarm(): Promise<void> {
    const reads = await this.storage.list<ScheduledRead>({
      prefix: 'github-refresh:',
    })
    for (const [key, read] of reads) {
      if (read.at > this.dependencies.now()) continue
      try {
        await this.refresh(read.request.workspace, read.request.signal)
        await this.storage.delete(key)
      } catch (error) {
        if (
          error instanceof HttpError &&
          [404, 403, 503].includes(error.status) &&
          error.code !== 'github_unavailable'
        )
          await this.storage.delete(key)
        else {
          captureUnexpectedWorkerFailure('github_refresh_failed', error)
          await this.storage.put(key, {
            ...read,
            at: this.dependencies.now() + 30_000,
          })
        }
      }
    }
    await this.schedule()
  }

  private async schedule(): Promise<void> {
    const reads = await this.storage.list<ScheduledRead>({
      prefix: 'github-refresh:',
    })
    await this.alarms.set(
      'github',
      reads.size
        ? Math.min(...[...reads.values()].map((read) => read.at))
        : null,
    )
  }
}
