import type { HelperOptions } from '../generated/HelperOptions'
import type { ProviderInput } from '../generated/ProviderInput'
import type { RunnerNoticeLine } from '../generated/RunnerNoticeLine'

/** What the fixed instructions of a session name. */
export type FixedContext = Pick<
  HelperOptions,
  'instructionBranches' | 'instructionFolder'
>

/** App text has no member sender or member context lines. */
export function providerNotice(notices: readonly RunnerNoticeLine[]): string {
  return notices.length
    ? `Line of the app: no member wrote this text.\n\n${notices.map((notice) => notice.text).join('\n')}`
    : ''
}

/**
 * The sender line, then the repository line when the instructions name an
 * earlier repository folder, then the branch line when they name other
 * branches. Agent instructions in docs/protocol/message-lines.md state them.
 */
export function providerMessage(
  command: ProviderInput,
  fixed: FixedContext,
): string {
  if (command.type === 'notice') return providerNotice(command.notices)
  const { message, branches: current, repository } = command
  const branches = fixed.instructionBranches
  const login = message.sender.githubLogin.replace(/\s+/gu, ' ').trim()
  const name = message.sender.displayName?.replace(/\s+/gu, ' ').trim()
  const sender = name ? `${name} (@${login})` : `@${login}`
  const repositoryLine =
    repository &&
    fixed.instructionFolder &&
    repository.folder !== fixed.instructionFolder
      ? `\nCurrent repository: ${JSON.stringify(repository.fullName)} in the folder ${JSON.stringify(repository.folder)}. The workspace now works in this folder. Its context folder is ${JSON.stringify(`${repository.folder}/.context`)}.`
      : ''
  const branchLine =
    current &&
    (current.workspaceBranch !== branches?.workspaceBranch ||
      current.targetBranch !== branches?.targetBranch)
      ? `\nCurrent branches: workspace ${JSON.stringify(current.workspaceBranch)}; target ${JSON.stringify(current.targetBranch)}.`
      : ''
  const notices =
    command.type === 'turn' ? providerNotice(command.notices ?? []) : ''
  return `${notices ? `${notices}\n\n` : ''}Sender: ${sender} [member ID: ${JSON.stringify(message.sender.id)}]${repositoryLine}${branchLine}\n\n${message.text}`
}
