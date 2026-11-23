import type { HelperOptions } from '../generated/HelperOptions'
import type { ProviderInput } from '../generated/ProviderInput'
import type { RunnerNoticeLine } from '../generated/RunnerNoticeLine'

/** What the fixed instructions of a session name. */
export type FixedContext = Pick<
  HelperOptions,
  'instructionBranches' | 'instructionFolder'
>

/** An input that a member message makes: a turn or a message during a turn. */
export type MemberInput = Exclude<ProviderInput, { type: 'notice' }>

/** App text has no member sender or member context lines. */
export function providerNotice(notices: readonly RunnerNoticeLine[]): string {
  return notices.length
    ? `Line of the app: no member wrote this text.\n\n${notices.map((notice) => notice.text).join('\n')}`
    : ''
}

/**
 * The sender line, then the repository line when the instructions name an
 * earlier repository folder, then the branch line when they name other
 * branches. Each input builder places these lines around its message body.
 */
function senderLines(command: MemberInput, fixed: FixedContext = {}): string {
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

/**
 * The sender lines, then the change notes of a turn under the app header.
 * The notes come after the sender lines, so a skill text at the start of
 * the member's text still starts the prompt.
 */
export function contextLines(
  command: MemberInput,
  fixed: FixedContext = {},
): string {
  const lines = senderLines(command, fixed)
  const notices =
    command.type === 'turn' ? providerNotice(command.notices ?? []) : ''
  return notices ? `${lines}\n\n${notices}` : lines
}
