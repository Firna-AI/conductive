import type { WorkspaceState } from './generated/WorkspaceState'
import type { Agent } from './generated/Agent'
import type { AgentChoice } from './generated/AgentChoice'
import type { Timestamp } from './generated/Timestamp'
import type { MessageSender } from './generated/MessageSender'
import type { SessionLogin } from './generated/SessionLogin'
import { orgPath } from './api'
import type { OrgSecret } from './secrets'

export function automationsPath(orgId: string): string {
  return `${orgPath(orgId)}/automations`
}

export function automationPath(orgId: string, automationId: string): string {
  return `${automationsPath(orgId)}/${encodeURIComponent(automationId)}`
}

export const automationPaths = {
  runs: (orgId: string, id: string, before?: string) =>
    `${automationPath(orgId, id)}/runs${before === undefined ? '' : `?before=${encodeURIComponent(before)}`}`,
  runNow: (orgId: string, id: string) => `${automationPath(orgId, id)}/run-now`,
} as const

export type AutomationWeekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

type ClockTime = { hour: number; minute: number }

export type AutomationSchedule =
  | { kind: 'hourly'; minute: number }
  | { kind: 'daily'; time: ClockTime }
  | { kind: 'weekdays'; time: ClockTime }
  | { kind: 'weekly'; day: AutomationWeekday; time: ClockTime }
  | { kind: 'custom'; cron: string }

export type AutomationPullRequestEvent = 'opened' | 'pushed' | 'merged'

export interface AutomationAuthorFilterInput {
  members: boolean
  is: readonly string[]
  isNot: readonly string[]
}

export interface AutomationAuthorAccount {
  githubId: number
  login: string
}

export interface AutomationAuthorFilter {
  members: boolean
  is: readonly AutomationAuthorAccount[]
  isNot: readonly AutomationAuthorAccount[]
}

export type AutomationTriggerInput =
  | AutomationSchedule
  | {
      kind: 'pull-request'
      event: AutomationPullRequestEvent
      authors?: AutomationAuthorFilterInput
    }

export type AutomationTrigger =
  | (AutomationSchedule & { cron: string })
  | {
      kind: 'pull-request'
      event: AutomationPullRequestEvent
      authors?: AutomationAuthorFilter
    }

export type AutomationInactiveReason =
  'owner_left' | 'repository_removed' | 'failed_runs'

export interface AutomationCapabilities {
  preapprovedSecretIds: readonly string[]
}

export interface Automation {
  id: string
  orgId: string
  owner: MessageSender
  movedFrom: string | null
  name: string
  repositoryId: string
  sectionId: string
  prompt: string
  choice: AgentChoice
  capabilities: AutomationCapabilities
  active: boolean
  inactiveReason: AutomationInactiveReason | null
  failedRunsInARow: number
  timeZone: string
  triggers: readonly AutomationTrigger[]
  nextRunAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type AutomationRunTrigger =
  | {
      kind: 'schedule'
      schedule: AutomationSchedule['kind']
      scheduledAt: Timestamp
    }
  | { kind: 'run-now' }
  | {
      kind: 'pull-request'
      event: AutomationPullRequestEvent
      number: number
      url: string
      headBranch: string
      headSha: string
      baseBranch: string
      skipLogin?: string
    }

export interface AutomationRun {
  id: string
  automationId: string
  orgId: string
  agent: Agent | null
  owner: MessageSender | null
  trigger: AutomationRunTrigger
  state: WorkspaceState | 'queued' | 'failed' | 'skipped'
  workspaceId: string | null
  error: { code: string; message: string } | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreateAutomationRequest {
  name?: string
  repositoryId: string
  sectionId?: string
  prompt: string
  choice: AgentChoice
  capabilities?: AutomationCapabilities
  active?: boolean
  timeZone: string
  triggers: readonly AutomationTriggerInput[]
}

export type UpdateAutomationRequest = Partial<CreateAutomationRequest>

export interface AutomationResponse {
  automation: Automation
  runLogin: SessionLogin | null
  chosenSecrets?: readonly Pick<OrgSecret, 'id' | 'name'>[]
}

export interface AutomationsResponse {
  automations: readonly (Automation & { lastRun: AutomationRun | null })[]
}

export interface RunAutomationRequest {
  requestId: string
}

export interface AutomationRunResponse {
  run: AutomationRun
}

export interface AutomationRunsResponse {
  runs: readonly AutomationRun[]
  nextCursor: string | null
}
