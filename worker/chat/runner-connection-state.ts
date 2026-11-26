import type { RunnerLoginKind } from '../../src/shared/generated/RunnerLoginKind'
import type { ServiceBinding } from '../services/binding'
import type { RepositoryMoveState } from './runner-repository-move'
import type { RunnerWorkspaceRecord } from './types'

/** The whole connection value that native storage saves and a wake restores. */
export interface RunnerConnectionState {
  id: string
  generation: number
  workspace: RunnerWorkspaceRecord
  streamId: string | null
  processStartId: string | null
  protocolVersion: number | null
  loginKinds?: readonly RunnerLoginKind[]
  /** The folder of a runner that accepts repository.move. Older runners omit it. */
  repositoryFolder?: string
  /** True when this runner can register a folder variable in a move. */
  addsRepositoryFolder?: boolean
  /** The move of this connection. A new connection starts without one. */
  repositoryMove?: RepositoryMoveState
  fileServer?: boolean
  /** True when the runner announced change notes in its hello. */
  capabilityNotices?: boolean
  services?: boolean
  serviceBinding?: ServiceBinding
  /** The end of the watch window of runner work, from the hello. */
  watchUntil?: number
  ready: boolean
  checkAt: number
}
