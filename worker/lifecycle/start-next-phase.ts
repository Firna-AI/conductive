import type {
  StartJobStorage,
  WorkspaceMachinePhase,
  WorkspaceRunningStartJob,
} from './start-types'

export async function nextStartPhase(
  storage: StartJobStorage,
  job: WorkspaceRunningStartJob,
  phase: WorkspaceMachinePhase,
): Promise<void> {
  await storage.update({
    ...job,
    phase,
    providerRetry: null,
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
  })
}
