import type { User } from '../../src/shared/api'
import type { SendMessageRequest } from '../../src/shared/messages'

export interface WorkspaceStartJob {
  workspaceId: string
  orgId: string
  kind: 'create' | 'resume'
  imageName: string | null
  startupScript: string
  environmentCiphertext: string | null
  defaultBranch: string
  turnId: string
  attempt: string
  phase: 'records' | 'machine' | 'ready' | 'fetch' | 'branch' | 'startup'
  creation?: WorkspaceCreation
  processId: number | null
  stdoutOffset: number
  stderrOffset: number
  createPayloadCiphertext?: string
  allocatedSandboxId?: string
  cancelled?: boolean
  failure?: { code: string; message: string; status: number }
}

export interface WorkspaceCreation {
  user: User
  sender: User
  repositoryId: string
  sectionId?: string
  city: string
  branch: string
  sessionId: string
  request: SendMessageRequest
  createdAt: number
}

export type WorkspaceStartResult =
  | { ok: true }
  | { ok: false; error: { code: string; message: string; log: string | null } }

export interface CreationPublication {
  workspaceId: string
  state: 'succeeded' | 'failed'
}

export interface StartJobStorage {
  job(): Promise<WorkspaceStartJob | undefined>
  epoch(): Promise<number>
  begin(job: WorkspaceStartJob, epoch: number): Promise<boolean>
  stop(): Promise<boolean>
  update(job: WorkspaceStartJob): Promise<void>
  result(): Promise<WorkspaceStartResult | undefined>
  creationResult(): Promise<WorkspaceStartResult | undefined>
  publication(): Promise<CreationPublication | undefined>
  clearPublication(): Promise<void>
  complete(result: WorkspaceStartResult): Promise<void>
  secrets(values: readonly string[]): Promise<void>
  capture(
    job: WorkspaceStartJob,
    output: {
      stdout: string
      stderr: string
      stdoutNextOffset: number
      stderrNextOffset: number
    },
  ): Promise<void>
  schedule(): Promise<void>
}
