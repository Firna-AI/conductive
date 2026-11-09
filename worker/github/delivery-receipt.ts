import type { WorkspaceEventEnvelope } from '../chat/workspace-events'
import type { GitHubSnapshot, GitHubUpdate } from './contracts'

type GitHubEnvelopeIdentity = Pick<
  WorkspaceEventEnvelope,
  'workspaceId' | 'eventNumber' | 'occurredAt'
>

export interface GitHubDeliveryReceipt {
  snapshot: GitHubSnapshot
  envelope: GitHubEnvelopeIdentity | null
}

export function githubUpdated(snapshot: GitHubSnapshot): GitHubUpdate {
  return {
    type: 'github.updated',
    banner: snapshot.banner,
    checks: snapshot.checks,
  }
}
