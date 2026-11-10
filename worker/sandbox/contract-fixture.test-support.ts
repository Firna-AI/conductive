import type { ProviderErrorKind } from './errors'
import type {
  CommandResult,
  CommandStatus,
  PrivatePort,
  Sandbox,
  SandboxFileRead,
  SandboxProvider,
  SavedSnapshot,
  StartedCommand,
} from './provider'

export type ContractReply =
  | { kind: 'sandbox'; value: Sandbox }
  | { kind: 'snapshot'; value: SavedSnapshot }
  | { kind: 'command'; value: CommandResult }
  | { kind: 'started_command'; value: StartedCommand }
  | { kind: 'command_status'; value: CommandStatus }
  | {
      kind: 'file'
      value: Extract<SandboxFileRead, { kind: 'file' }>['file']
    }
  | { kind: 'large_file'; path: string; sizeBytes: number }
  | { kind: 'wrong_file'; path: string }
  | { kind: 'port' }
  | {
      kind: 'failure'
      errorKind: Exclude<ProviderErrorKind, 'invalid_response'>
      providerCode?: string
      retryAfterSeconds?: number | null
    }
  | { kind: 'network_failure' }
  | {
      kind: 'invalid'
      target: 'sandbox' | 'started_command' | 'command_status'
    }

export interface ProviderContractFixture {
  readonly provider: SandboxProvider
  readonly secret: string
  readonly expectedPort: PrivatePort
  given(reply: ContractReply): void
  createIdentities(): readonly (string | null)[]
}

export type ProviderContractFactory = () => ProviderContractFixture
