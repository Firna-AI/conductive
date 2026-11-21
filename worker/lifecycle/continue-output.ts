import {
  filterContinued,
  filterContinueResponse,
} from '../../src/shared/output-fields'
import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type { ContinueWorkspaceResponse } from '../../src/shared/workspaces'
import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../chat/workspace-events'
import type { AppEnv } from '../env'
import type { FeatureResult } from '../features/result'
import { runningOutputSecrets } from './output-secrets'

type ContinueLabels = (value: string) => string

export async function continueLabels(
  env: AppEnv,
  workspace: { id: string; orgId: string },
): Promise<ContinueLabels> {
  const output = new OutputSanitizer()
  for (const secret of await runningOutputSecrets(env, workspace))
    output.add(secret)
  return (value) => output.text(value)
}

export function labelContinueEnvelope(
  envelope: WorkspaceEventEnvelope,
  labels: ContinueLabels,
): WorkspaceEventEnvelope {
  const event = envelope.event
  return event.type === 'workspace.continued'
    ? { ...envelope, event: filterContinued(event, labels) }
    : envelope
}

export function labelContinueHistory<
  Page extends { events: readonly WorkspaceEventEnvelope[] },
>(history: Page, labels: ContinueLabels): Page {
  return {
    ...history,
    events: history.events.map((envelope) =>
      labelContinueEnvelope(envelope, labels),
    ),
  }
}

export function labelContinueMessage(
  message: WorkspaceSocketMessage,
  labels: ContinueLabels,
): WorkspaceSocketMessage {
  return message.type === 'event'
    ? { ...message, envelope: labelContinueEnvelope(message.envelope, labels) }
    : { ...message, history: labelContinueHistory(message.history, labels) }
}

export async function labelContinueResult(
  env: AppEnv,
  workspace: { id: string; orgId: string },
  result: FeatureResult<ContinueWorkspaceResponse>,
): Promise<FeatureResult<ContinueWorkspaceResponse>> {
  if (
    result.ok
      ? result.value.state !== 'confirmation-required'
      : result.error.code !== 'workspace_continue_failed'
  )
    return result
  const labels = await continueLabels(env, workspace)
  return result.ok
    ? { ok: true, value: filterContinueResponse(result.value, labels) }
    : {
        ok: false,
        error: { ...result.error, message: labels(result.error.message) },
      }
}
