import type { UserMessage } from '../generated/UserMessage'
import type { RunnerBranches } from '../generated/RunnerBranches'

/**
 * The sender line of a message, then the branch line when the current
 * branches differ from the branches that the session's instructions name.
 * Each message to an agent ends with these lines, after an empty line.
 */
export function senderLines(
  message: UserMessage,
  current?: RunnerBranches,
  fixed?: RunnerBranches | null,
): string {
  const login = message.sender.githubLogin.replace(/\s+/gu, ' ').trim()
  const name = message.sender.displayName?.replace(/\s+/gu, ' ').trim()
  const sender = name ? `${name} (@${login})` : `@${login}`
  const branchLine =
    current &&
    (current.workspaceBranch !== fixed?.workspaceBranch ||
      current.targetBranch !== fixed?.targetBranch)
      ? `\nCurrent branches: workspace ${JSON.stringify(current.workspaceBranch)}; target ${JSON.stringify(current.targetBranch)}.`
      : ''
  return `Sender: ${sender} [member ID: ${JSON.stringify(message.sender.id)}]${branchLine}`
}
