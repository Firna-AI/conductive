import { readFile } from 'node:fs/promises'

import { readFrontMatter, type FrontMatterValue } from './skill-front-matter'
import type { SkillFile } from './skill-files'

/** A larger `SKILL.md` warns and leaves out its skill. */
const SKILL_FILE_MAX_BYTES = 1_048_576

/** One skill as an agent loads it, with the absolute path of its `SKILL.md`. */
export interface FoundSkill {
  name: string
  description: string
  manualOnly?: boolean
  path: string
}

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
): Promise<FoundSkill | null> {
  const source = await read(file, warn)
  if (source === null) return null
  const front = readFrontMatter(source)
  if (front.invalid)
    warn(
      `The front matter of ${file.path} could not be read. The skill uses the name of its folder.`,
    )
  const fields = front.fields ?? new Map<string, FrontMatterValue>()
  const invocable = fields.get('user-invocable')
  if (invocable !== undefined && !isTrue(invocable)) return null
  return {
    name: text(fields.get('name')) || file.folder,
    description: text(fields.get('description')) || firstLine(front.body),
    ...(isTrue(fields.get('disable-model-invocation'))
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
): Promise<FoundSkill | null> {
  const source = await read(file, warn)
  if (source === null) return null
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

async function read(
  file: SkillFile,
  warn: (message: string) => void,
): Promise<string | null> {
  try {
    const bytes = await readFile(file.path)
    if (bytes.length > SKILL_FILE_MAX_BYTES) throw new Error('Too large.')
    return bytes.toString('utf8')
  } catch {
    warn(
      `The skill file ${file.path} could not be read. The list leaves out its skill.`,
    )
    return null
  }
}

function text(value: FrontMatterValue | undefined): string {
  return value?.kind === 'text' ? value.text.trim() : ''
}

function isTrue(value: FrontMatterValue | undefined): boolean {
  return (
    value?.kind === 'text' && /^(?:true|yes|on|1)$/i.test(value.text.trim())
  )
}

function firstLine(body: string): string {
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed) return /^#+\s+(\S.*)$/.exec(trimmed)?.[1] ?? trimmed
  }
  return ''
}
