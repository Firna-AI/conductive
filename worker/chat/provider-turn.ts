import type { ProviderRecovery } from './provider-recovery'

export interface ProviderTurnState {
  providerContinuationStartedAt?: number | null
  providerContinuationSourceSessionId?: string
  providerRecovery?: ProviderRecovery
  providerStop?: {
    next: 'turn' | 'reconnect' | 'message'
    continuationTurnId?: string
  }
}
