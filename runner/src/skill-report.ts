import { jsonBytes } from '../../src/shared/event-limits'
import {
  SKILL_DESCRIPTION_REPORT_MAX_CHARACTERS,
  SKILL_REPORT_MAX_SKILLS,
  isSkillName,
  type AgentSkill,
  type RunnerSkillsUpdated,
} from '../../src/shared/skills'
import { compare } from './skill-files'
import type { FoundSkill } from './skill-read'

/**
 * The budget of the whole report. With the limits of the names and the
 * counts, the names alone stay below it, and the envelope keeps room.
 */
const SKILL_REPORT_MAX_BYTES = 524_288

/** One reported skill with the absolute path of its `SKILL.md`. */
export interface SkillEntry extends AgentSkill {
  path: string
}

/**
 * Shapes the skills that an agent loads into its report list. It never
 * cuts a name or a description, because the workspace filters marked
 * secret values only after it gets the report.
 */
export function skillEntries(
  agent: 'Claude' | 'Codex',
  found: readonly FoundSkill[],
  filter: (text: string) => string,
  warn: (message: string) => void,
): SkillEntry[] {
  const entries = new Map<string, SkillEntry>()
  for (const skill of found) {
    if (!isSkillName(skill.name)) {
      warn(
        `The ${agent} skill of ${skill.path} has a name with white space, control characters, or too many characters. The list leaves it out.`,
      )
      continue
    }
    if (filter(skill.name) !== skill.name) {
      warn(
        `The ${agent} skill of ${skill.path} has a name that holds a credential. The list leaves it out.`,
      )
      continue
    }
    if (entries.has(skill.name)) continue
    let description = filter(skill.description)
    if ([...description].length > SKILL_DESCRIPTION_REPORT_MAX_CHARACTERS) {
      warn(
        `The ${agent} skill ${skill.name} has a description over ${SKILL_DESCRIPTION_REPORT_MAX_CHARACTERS} characters. The report leaves it out.`,
      )
      description = ''
    }
    entries.set(skill.name, {
      name: skill.name,
      description,
      ...(skill.manualOnly ? { manualOnly: true } : {}),
      path: skill.path,
    })
  }
  const sorted = [...entries.values()].sort((left, right) =>
    compare(left.name, right.name),
  )
  if (sorted.length > SKILL_REPORT_MAX_SKILLS)
    warn(
      `The ${agent} list holds ${sorted.length} skills. The report keeps the first ${SKILL_REPORT_MAX_SKILLS} by name.`,
    )
  return sorted.slice(0, SKILL_REPORT_MAX_SKILLS)
}

/**
 * Keeps the report within its byte budget. It leaves out whole
 * descriptions, in list order, and never cuts one.
 */
export function budgetSkillLists(
  claude: readonly SkillEntry[],
  codex: readonly SkillEntry[],
  warn: (message: string) => void,
): { claude: SkillEntry[]; codex: SkillEntry[] } {
  const lists = {
    claude: claude.map((skill) => ({ ...skill, description: '' })),
    codex: codex.map((skill) => ({ ...skill, description: '' })),
  }
  let bytes = jsonBytes(skillsEvent(lists.claude, lists.codex))
  let omitted = false
  for (const [list, sources] of [
    [lists.claude, claude],
    [lists.codex, codex],
  ] as const) {
    for (const [index, source] of sources.entries()) {
      const added = jsonBytes(source.description) - jsonBytes('')
      if (bytes + added > SKILL_REPORT_MAX_BYTES) {
        omitted = true
        continue
      }
      list[index].description = source.description
      bytes += added
    }
  }
  if (omitted)
    warn(
      'The skill descriptions exceeded the report budget. Some are left out.',
    )
  return lists
}

/** The report of two lists, without the paths. */
export function skillsEvent(
  claude: readonly SkillEntry[],
  codex: readonly SkillEntry[],
): RunnerSkillsUpdated {
  const strip = ({
    name,
    description,
    manualOnly,
  }: SkillEntry): AgentSkill => ({
    name,
    description,
    ...(manualOnly ? { manualOnly } : {}),
  })
  return {
    type: 'skills.updated',
    claude: claude.map(strip),
    codex: codex.map(strip),
  }
}
