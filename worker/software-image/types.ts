import type { AppDependencies, AppEnv } from '../env'

type SoftwareImageState = 'building' | 'ready' | 'failed' | 'deleting'
type SoftwareImagePhase =
  | 'create'
  | 'allocating'
  | 'software'
  | 'journal'
  | 'snapshot'
  | 'publish'
  | 'cleanup'
  | 'done'

export interface SoftwareImage {
  id: string
  providerAccount: string
  version: string
  softwareJson: string
  snapshotName: string
  snapshotRecorded: number
  state: SoftwareImageState
  phase: SoftwareImagePhase
  revision: number
  operation: 'ready' | 'auto-stop' | 'snapshot-missing' | null
  sandboxId: string | null
  processId: number | null
  commandRoute: string | null
  machineTokenCiphertext: string | null
  stdoutOffset: number
  stderrOffset: number
  output: string
  error: string | null
  tokenDigest: string
  startedAt: number
  completedAt: number | null
  /** The apt part version of the started software command, as `image-packages.ts` says. */
  packagesVersion: string | null
}

export interface SoftwareImageRuntime {
  env: AppEnv
  dependencies: AppDependencies
  poll?: {
    stopped(): boolean
    expired(): boolean
    runNetworkCall<T>(call: () => Promise<T>): Promise<T>
    checkpoint(image: SoftwareImage, output: string): void
    output(parts: string[]): void
  }
}

export interface SoftwareImageResult {
  state: 'building' | 'ready' | 'failed'
  phase: SoftwareImagePhase
  version: string
  output: string
  error?: string
  keptOutput?: string
}
