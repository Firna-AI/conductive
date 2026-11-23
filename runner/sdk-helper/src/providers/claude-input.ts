import { skillTextAt } from '../../../../src/shared/skill-text'
import type { ProviderInput } from '../generated/ProviderInput'
import { claudeSkillFiles } from '../skill-files'
import { readClaudeSkill } from '../skill-read'
import {
  attachmentDescription,
  attachmentReadInstruction,
} from './attachment-description'
import { contextLines, providerNotice, type FixedContext } from './message'

/**
 * The text of one Claude message: the member's text, the read instruction
 * and one line for each attached file, an empty line, then the sender
 * lines. So a skill text at the start of the member's text starts the
 * prompt, and Claude runs that skill, also a manual-only one.
 *
 * Claude reads each `/word` at the start of a prompt as a command. So when
 * the text starts with a `/word` that names no skill of the Claude list,
 * the sender lines come first, an empty line follows, and then the rest.
 * Claude then runs no built-in command, such as `/clear`, whose effects
 * the app does not know. `orgSkills` holds the names of the org skills of
 * the session's view, which are also skills of the Claude list.
 *
 * A notice of a running turn has only its app text.
 */
export async function claudeInput(
  command: ProviderInput,
  repository: string,
  fixed: FixedContext = {},
  orgSkills: ReadonlySet<string> = new Set(),
): Promise<string> {
  if (command.type === 'notice') return providerNotice(command.notices)
  const lines = contextLines(command, fixed)
  const text = command.message.text
  const attached = command.attachments.map((item) =>
    attachmentDescription(command, item),
  )
  const body = [
    text,
    ...(attached.length ? [attachmentReadInstruction, ...attached] : []),
  ]
    .filter((part) => part !== '')
    .join('\n')
  const start = skillTextAt(text, 0)
  const header =
    start !== null &&
    !orgSkills.has(start.name) &&
    !(await claudeSkillNames(repository)).has(start.name)
  return header ? `${lines}\n\n${body}` : `${body}\n\n${lines}`
}

/**
 * The names of the Claude list: the skills of the Claude skill folder of the
 * repository, read as the skills report reads them. A folder that cannot be
 * read gives no name, so the message keeps its sender lines first.
 */
async function claudeSkillNames(repository: string): Promise<Set<string>> {
  try {
    const names = new Set<string>()
    const files = await claudeSkillFiles(repository)
    for (const file of files.files) {
      const skill = await readClaudeSkill(file, () => undefined)
      if (skill) names.add(skill.name)
    }
    return names
  } catch {
    return new Set()
  }
}
