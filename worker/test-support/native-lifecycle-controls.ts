import type { RunnerEvent } from '../../src/shared/runner'
import { HttpError } from '../http'
import type { Workspace } from '../workspace'
import type { WorkspaceController } from '../lifecycle/workspace-controller-types'
import {
  readStartJob,
  type StoredWorkspaceStartJob,
} from '../lifecycle/start-job-codec'
import { START_JOB_KEY } from '../lifecycle/start-storage'
import type { WorkspaceStartIntent } from '../lifecycle/start-types'

interface NativeLifecycleCheckpoint {
  instanceId: string
  alarmGeneration: number
  alarmAt: number | null
  job: StoredWorkspaceStartJob | undefined
}

type NativeRunnerReportResult =
  | { ok: true }
  | { ok: false; error: { status: number; code: string; message: string } }

export interface NativeLifecycleControls {
  checkpoint(): Promise<NativeLifecycleCheckpoint>
  queueForEpochGuard(
    job: StoredWorkspaceStartJob,
    intent?: WorkspaceStartIntent,
  ): Promise<boolean>
  captureRunnerReport(event: RunnerEvent): Promise<NativeRunnerReportResult>
  cancelWaiters(): Promise<void>
}

export function nativeLifecycleControls(
  workspace: Workspace,
  controller: WorkspaceController,
  storage: DurableObjectStorage,
  runtime: () => { instanceId: string; alarmGeneration: number },
): NativeLifecycleControls {
  return {
    checkpoint: async () => ({
      ...runtime(),
      alarmAt: await storage.getAlarm(),
      job: await storage.get<StoredWorkspaceStartJob>(START_JOB_KEY),
    }),
    queueForEpochGuard: (job, intent) =>
      controller.queueLifecycleStart(readStartJob(job), intent),
    captureRunnerReport: async (event) => {
      try {
        await workspace.reportRunnerLifecycle(event)
        return { ok: true }
      } catch (error) {
        if (!(error instanceof HttpError)) throw error
        return {
          ok: false,
          error: {
            status: error.status,
            code: error.code,
            message: error.message,
          },
        }
      }
    },
    cancelWaiters: async () => controller.cancelLifecycleWaiters(),
  }
}
