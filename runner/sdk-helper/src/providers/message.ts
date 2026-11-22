import type { HelperOptions } from '../generated/HelperOptions'
import type { ProviderInput } from '../generated/ProviderInput'

/** What the fixed instructions of a session name. */
export type FixedContext = Pick<
  HelperOptions,
  'instructionBranches' | 'instructionFolder'
>

/**
 * The sender line, then the repository line when the instructions name an
 * earlier repository folder, then the branch line when they name other
 * branches. Each input builder places these lines around its message body.
 */
export function senderLines(
  command: ProviderInput,
  fixed: FixedContext = {},
): string {
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
  return `Sender: ${sender} [member ID: ${JSON.stringify(message.sender.id)}]${repositoryLine}${branchLine}`
}
