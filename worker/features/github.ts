import type { WorkspaceChat } from '../chat/backend'
import type { AppDependencies, AppEnv } from '../env'
import { createGitHubStatePort } from '../github/chat-store'
import type {
  GitHubRefresh,
  GitHubRefreshRequest,
  GitHubSnapshot,
  GitHubWorkspace,
} from '../github/contracts'
import { installationTokenProvider } from '../github/credentials'
import { refreshWorkspace } from '../github/refresh'
import { WorkspaceGitHubState } from '../github/workspace-state'
import { HttpError } from '../http'
import { handleGitHubRead } from '../github/app-handler'
import { handleGitHubMerge } from '../github/merge-handler'
import { authorizeMerge } from '../github/merge-access'
import { GitHubReader } from '../github/client'
import { readBranchWork, type BranchWork } from '../github/branch-work'
import type { WorkspaceAlarms } from './alarms'
import type { ReceiverStorage } from '../members/receiver-storage'
import { freshGitHubUserToken } from '../security/github-tokens'
import type { WorkspaceBaseChanges } from '../lifecycle/workspace-base'
import { saveRepositoryDefaultChange } from '../lifecycle/repository-default-change'

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
  private readonly baseChanges: WorkspaceBaseChanges

  constructor(
    storage: ReceiverStorage,
    env: AppEnv,
    dependencies: AppDependencies,
    chat: WorkspaceChat,
    matches: (id: string) => boolean,
    alarms: WorkspaceAlarms,
    baseChanges: WorkspaceBaseChanges,
  ) {
    this.storage = storage
    this.env = env
    this.dependencies = dependencies
    this.chat = chat
    this.matches = matches
    this.alarms = alarms
    this.baseChanges = baseChanges
  }

  async refresh(workspace: GitHubWorkspace, signal: GitHubRefresh) {
    if (signal.repositoryDefault) {
      this.stateOf(workspace)
      await saveRepositoryDefaultChange(
        this.env.DB,
        this.storage,
        workspace,
        signal.repositoryDefault,
        this.dependencies.now(),
      )
      return null
    }
    const userId = signal.userId
    return refreshWorkspace(
      this.env.DB,
      workspace,
      signal,
      this.stateOf(workspace),
      {
        ...this.dependencies,
        token:
          signal.requireWritable && userId !== undefined
            ? () => freshGitHubUserToken(this.env, userId, this.dependencies)
            : installationTokenProvider(
                {
                  ...this.env,
                  GITHUB_APP_PRIVATE_KEY: this.env.GITHUB_APP_PRIVATE_KEY ?? '',
                },
                this.dependencies.fetch,
                this.dependencies.now,
              ),
      },
    )
  }

  /** The last committed state of the workspace, with no GitHub read. */
  async stored(
    workspace: GitHubWorkspace,
  ): Promise<GitHubSnapshot | undefined> {
    return this.stateOf(workspace).stored()
  }

  private stateOf(workspace: GitHubWorkspace): WorkspaceGitHubState {
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
    return this.state
  }

  fetch(request: Request): Promise<Response> {
    return handleGitHubMerge(request, this.env, {
      ...this.dependencies,
      storage: this.storage,
      refresh: (workspace, signal) => this.refresh(workspace, signal),
    })
  }

  /**
   * The GitHub routes of the workspace object, or null for another route:
   * the reads of the app, which gate themselves, then the other GitHub
   * routes of `fetch`.
   */
  async route(request: Request): Promise<Response | null> {
    const path = new URL(request.url).pathname
    if (/\/github(?:\/checks|\/stored)?$/.test(path))
      return handleGitHubRead(request, this.env, {
        now: this.dependencies.now,
        refresh: (workspace, signal) => this.refresh(workspace, signal),
        stored: (workspace) => this.stored(workspace),
      })
    return /\/github\/.*$/.test(path) ? this.fetch(request) : null
  }

  /**
   * The default branch of the target repository, by default the repository
   * of the workspace. A repository change reads the new repository while
   * the record still names the old one, so access follows the record.
   */
  async defaultBranch(
    workspace: GitHubWorkspace,
    userId: string,
    target: GitHubWorkspace = workspace,
  ): Promise<string> {
    return this.read(workspace, userId, target, (reader) =>
      reader.defaultBranch(),
    )
  }

  /**
   * The default branch of the repository of the workspace for Continue,
   * read with the GitHub token of the member who pressed Continue, as
   * Continue reads its merged pull request and asks for its base.
   */
  async memberDefaultBranch(
    workspace: GitHubWorkspace,
    userId: string,
  ): Promise<string> {
    return this.read(
      workspace,
      userId,
      workspace,
      (reader) => reader.defaultBranch(),
      'member',
    )
  }

  /** The work of the branch that a repository change stops following. */
  async branchWork(
    workspace: GitHubWorkspace,
    userId: string,
  ): Promise<BranchWork> {
    return readBranchWork(
      await this.refresh(workspace, { userId }),
      (baseBranch, headSha) =>
        this.read(workspace, userId, workspace, (reader) =>
          reader.aheadBy(baseBranch, headSha),
        ),
    )
  }

  private async read<T>(
    workspace: GitHubWorkspace,
    userId: string,
    target: GitHubWorkspace,
    operation: (reader: GitHubReader) => Promise<T>,
    access: 'member' | 'app' = 'app',
  ): Promise<T> {
    const authorize = () => authorizeMerge(this.env.DB, workspace, userId)
    await authorize()
    const token =
      access === 'member'
        ? await freshGitHubUserToken(this.env, userId, this.dependencies)
        : await installationTokenProvider(
            {
              ...this.env,
              GITHUB_APP_PRIVATE_KEY: this.env.GITHUB_APP_PRIVATE_KEY ?? '',
            },
            this.dependencies.fetch,
            this.dependencies.now,
          )(target)
    const result = await operation(
      new GitHubReader(
        {
          ...this.dependencies,
          token: async () => token,
          fetch: async (request) => {
            await authorize()
            return this.dependencies.fetch(request)
          },
        },
        target,
        token,
      ),
    )
    await authorize()
    return result
  }

  async scheduleFresh(workspace: GitHubWorkspace): Promise<void> {
    await this.storage.put(
      `github-refresh:${this.dependencies.randomToken()}`,
      {
        at: this.dependencies.now(),
        request: { workspace, signal: {} },
      } satisfies ScheduledRead,
    )
    await this.schedule()
  }

  async alarm(): Promise<void> {
    await this.baseChanges.advance()
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
        else
          await this.storage.put(key, {
            ...read,
            at: this.dependencies.now() + 30_000,
          })
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
