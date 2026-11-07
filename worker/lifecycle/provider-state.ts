import type { SandboxState } from '../sandbox/provider'

export type ProviderState =
  'starting' | 'ready' | 'stopping' | 'stopped' | 'error'

/** Every native state has one classification. Callers choose their safe recovery policy. */
export function providerState(state: SandboxState): ProviderState {
  switch (state) {
    case 'init':
    case 'provisioning':
    case 'provisioned':
    case 'cloning':
      return 'starting'
    case 'ready':
    case 'idle':
    case 'running':
      return 'ready'
    case 'archiving':
      return 'stopping'
    case 'archived':
    case 'cancelled':
      return 'stopped'
    case 'error':
      return 'error'
  }
}
