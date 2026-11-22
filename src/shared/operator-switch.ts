export function operatorOrgSwitchPath(orgId: string): string {
  return `/api/operator/orgs/${encodeURIComponent(orgId)}/provider-switch`
}

export interface OperatorSwitchActor {
  githubId: number
  login: string
}

export interface OperatorSwitchJob {
  id: string
  kind: 'build' | 'refresh'
  startedAt: number
  starter: OperatorSwitchActor | null
}

export type OperatorSwitchWaitReason = 'job' | 'suspended' | 'deleted' | 'admin'

export type OperatorSwitchState =
  'waiting' | 'building' | 'failed' | 'stopped' | 'completed'

export type OperatorSwitchFailure = 'provider' | 'script' | 'time-limit'

export interface OperatorProviderSwitch {
  id: string
  orgId: string
  fromAccount: string
  toAccount: string
  requestedAt: number
  operator: OperatorSwitchActor | null
  endRunningJob: boolean
  endRunningJobId: string | null
  state: OperatorSwitchState
  waitReason: OperatorSwitchWaitReason | null
  waitingJob: OperatorSwitchJob | null
  buildId: string | null
  buildStartedAt: number | null
  buildCompletedAt: number | null
  failure: OperatorSwitchFailure | null
  accountChangedAt: number | null
  stoppedAt: number | null
  stoppedBy: OperatorSwitchActor | null
}

export interface OperatorOrgSwitchRequest {
  providerAccount: string
  endRunningJob?: boolean
}

export interface OperatorOrgSwitchResponse {
  switch: OperatorProviderSwitch | null
}

export interface OperatorOrgSwitchDetail {
  switchAvailable?: boolean
  providerSwitch: OperatorProviderSwitch | null
  lastProviderSwitch: OperatorProviderSwitch | null
  runningJob: OperatorSwitchJob | null
  switchWaitReason: OperatorSwitchWaitReason | null
  workspacesByAccount: readonly { id: string; workspaces: number }[]
}
