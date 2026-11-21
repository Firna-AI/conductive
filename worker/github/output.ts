import type { GitHubBanner } from '../../src/shared/github'
import { filterGitHubBanner } from '../../src/shared/output-fields'
import { OutputSanitizer } from '../../src/shared/output-sanitizer'
import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../chat/workspace-events'
import type { AppEnv } from '../env'
import { runningOutputSecrets } from '../lifecycle/output-secrets'

type BranchLabels = (banner: GitHubBanner) => GitHubBanner

export async function githubBranchLabels(
  env: AppEnv,
  workspace: { id: string; orgId: string },
): Promise<BranchLabels> {
  const output = new OutputSanitizer()
  for (const secret of await runningOutputSecrets(env, workspace))
    output.add(secret)
  return (banner) => filterGitHubBanner(banner, (value) => output.text(value))
}

function labelEnvelope(
  envelope: WorkspaceEventEnvelope,
  labels: BranchLabels,
): WorkspaceEventEnvelope {
  const event = envelope.event
  return event.type === 'github.updated'
    ? { ...envelope, event: { ...event, banner: labels(event.banner) } }
    : envelope
}

export function labelGitHubMessage(
  message: WorkspaceSocketMessage,
  labels: BranchLabels,
): WorkspaceSocketMessage {
  return message.type === 'event'
    ? { ...message, envelope: labelEnvelope(message.envelope, labels) }
    : {
        ...message,
        history: {
          ...message.history,
          events: message.history.events.map((envelope) =>
            labelEnvelope(envelope, labels),
          ),
        },
      }
}
