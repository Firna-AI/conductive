import type { Agent } from './generated/Agent'
import type { SkillEntry } from './generated/SkillEntry'
import type { SkillReadOutcome } from './generated/SkillReadOutcome'

import type { SelectedOrgSkill } from './providers/skills'
import { readSkillContent, SKILL_FILE_MAX_BYTES } from './skill-content'
import { readFrontMatter, type FrontMatterValue } from './skill-front-matter'
import type { SkillFile } from './skill-files'

/** The path of one `SKILL.md`, and the name of the folder that the agent sees. */
type SkillPlace = Pick<SkillFile, 'path' | 'folder'>

/**
 * Claude names a skill after the front matter `name`, else its folder. Its
 * description is the front matter `description`, else the first line of
 * text, without a heading mark. A front matter that fails is ignored. A
 * skill whose `user-invocable` is set to anything but a true value stays
 * out, because Claude hides it from the menu of its user.
 */
export async function readClaudeSkill(
  file: SkillFile,
  warn: (message: string) => void,
): Promise<SkillEntry | null> {
  const source = await readSkillFile(file.path, warn)
  return source === null ? null : claudeSkill(source, file, warn)
}

/** The Claude entry of the text of one `SKILL.md`, as `readClaudeSkill` says. */
function claudeSkill(
  source: string,
  file: SkillPlace,
  warn: (message: string) => void,
): SkillEntry | null {
  const front = readFrontMatter(source)
  if (front.invalid)
    warn(
      `The front matter of ${file.path} could not be read. The skill uses the name of its folder.`,
    )
  const fields = front.fields ?? new Map<string, FrontMatterValue>()
  const invocable = fields.get('user-invocable')
  if (invocable !== undefined && !isTrue(text(invocable))) return null
  return {
    name: text(fields.get('name')) || file.folder,
    description:
      text(fields.get('description')) || skillDescriptionLine(front.body),
    ...(isTrue(text(fields.get('disable-model-invocation')))
      ? { manualOnly: true }
      : {}),
    path: file.path,
  }
}

/**
 * Codex needs a front matter with a `description`. It names a skill after
 * the front matter `name`, else its folder.
 */
export async function readCodexSkill(
  file: SkillFile,
  warn: (message: string) => void,
): Promise<SkillEntry | null> {
  const source = await readSkillFile(file.path, warn)
  return source === null ? null : codexSkill(source, file, warn)
}

/** The Codex entry of the text of one `SKILL.md`, as `readCodexSkill` says. */
function codexSkill(
  source: string,
  file: SkillPlace,
  warn: (message: string) => void,
): SkillEntry | null {
  const front = readFrontMatter(source)
  const description = text(front.fields?.get('description'))
  if (!front.fields || front.invalid || !description) {
    warn(
      `The front matter of ${file.path} gives no description. The Codex list leaves out its skill.`,
    )
    return null
  }
  return {
    name: text(front.fields.get('name')) || file.folder,
    description,
    path: file.path,
  }
}

export function orgSkillEntry(
  skill: SelectedOrgSkill,
  agent: Agent,
): SkillEntry | null {
  const { frontmatter, path } = skill.metadata
  const invocable = frontmatter['user-invocable']
  if (
    agent === 'claude' &&
    invocable !== undefined &&
    !isTrue(String(invocable))
  )
    return null
  return {
    name: skill.shownName,
    description: String(frontmatter.description ?? '').trim(),
    path,
    org: true,
    ...(agent === 'claude' &&
    isTrue(String(frontmatter['disable-model-invocation']))
      ? { manualOnly: true }
      : {}),
  }
}

async function readSkillFile(
  path: string,
  warn: (message: string) => void,
): Promise<string | null> {
  const result = await readSkillContent(path, SKILL_FILE_MAX_BYTES)
  return listedSkillText(result, path, warn)
}

/** A failed read warns and gives no text for the list. */
export function listedSkillText(
  result: SkillReadOutcome,
  path: string,
  warn: (message: string) => void,
): string | null {
  if (result.ok) return result.text
  warn(
    `The skill file ${path} could not be read. The list leaves out its skill.`,
  )
  return null
}

function text(value: FrontMatterValue | undefined): string {
  return value?.kind === 'text' ? value.text.trim() : ''
}

function isTrue(value: string): boolean {
  return /^(?:true|yes|on|1)$/i.test(value.trim())
}

export function skillDescriptionLine(body: string): string {
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed) return /^#+\s+(\S.*)$/.exec(trimmed)?.[1] ?? trimmed
  }
  return ''
}
