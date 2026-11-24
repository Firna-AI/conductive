import type { Workspace } from '../../src/shared/generated/Workspace'
import type { MessageSender } from '../../src/shared/generated/MessageSender'
import type {
  ContinueWorkspaceRequest,
  ContinueWorkspaceResponse,
} from '../../src/shared/workspaces'
import type { WorkspaceChat } from '../chat/backend'
import type { ChatData } from '../chat/types'
import type { AppDependencies, AppEnv } from '../env'
import type { CommandRoute } from '../machines/channel'
import type { FeatureResult } from '../features/result'
import type {
  GitHubRefreshWorkspace,
  GitHubWorkspace,
} from '../github/contracts'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import {
  readContinueStopCause,
  type ContinueStopCause,
} from './continue-stop-causes'

export const CONTINUE_JOB_KEY = 'lifecycle:continue'
export const continueJobKey = (id: string) => `continue:job:${id}`
export const continuedBranchKey = (branch: string) =>
  `continue:branch:${branch}`

type StoredReply =
  | Exclude<
      ContinueWorkspaceResponse,
      { state: 'continued' } | { state: 'pending' }
    >
  | {
      state: 'continued'
      workspace: Omit<Workspace, 'link'>
      eventNumber: number
    }

export const CONTINUE_PHASES = [
  'verify',
  'resume',
  'check',
  'fetch',
  'move',
  'publish',
] as const

export interface ContinueJob {
  id: string
  binding: GitHubWorkspace
  repositoryId: string
  sandboxId: string
  providerAccount: string
  member: MessageSender
  request: ContinueWorkspaceRequest
  branch: string
  baseBranch: string
  defaultBranch: string
  directory: string
  phase: (typeof CONTINUE_PHASES)[number]
  processId: number | null
  commandRoute?: CommandRoute
  hostStatusFailingSince?: number
  commandStarted: boolean
  resumeQueued: boolean
  fetchId: string
  stdoutOffset: number
  stderrOffset: number
  publication?: { after: number; through: number }
  failure?: { status: number; code: string; message: string }
  stopCause?: ContinueStopCause
  cancelled?: true
  outcome?: FeatureResult<StoredReply>
}

export interface ContinueOptions {
  env: AppEnv
  dependencies: AppDependencies
  storage: Pick<ChatData, 'get' | 'put'>
  chat: WorkspaceChat
  run<T>(operation: () => Promise<T>): Promise<T>
  schedule(at: number | null): Promise<void>
  refresh: GitHubRefreshWorkspace
  defaultBranch(binding: GitHubWorkspace, userId: string): Promise<string>
  scheduleRefresh(binding: GitHubWorkspace): Promise<void>
  resume(orgId: string, workspaceId: string, userId: string): Promise<void>
  matches(workspaceId: string): boolean
  assertActive(): Promise<void>
  activity(): Promise<void>
}

export async function readContinueJob(
  storage: ContinueOptions['storage'],
  key = CONTINUE_JOB_KEY,
): Promise<ContinueJob | null | undefined> {
  const job = await storage.get<
    | (Omit<ContinueJob, 'providerAccount' | 'defaultBranch' | 'stopCause'> & {
        providerAccount?: string
        defaultBranch?: string
        stopCause?: unknown
      })
    | null
  >(key)
  return job
    ? {
        ...job,
        providerAccount: job.providerAccount ?? DEFAULT_PROVIDER_ACCOUNT,
        defaultBranch: job.defaultBranch ?? job.baseBranch,
        stopCause: readContinueStopCause(job.stopCause),
      }
    : job
}

export async function pendingContinue(
  storage: ContinueOptions['storage'],
): Promise<boolean> {
  const job = await readContinueJob(storage)
  return Boolean(job)
}
