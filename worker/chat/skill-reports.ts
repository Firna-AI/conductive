import {
  SKILL_DESCRIPTION_MAX_CHARACTERS,
  isSkillName,
  type AgentSkill,
  type RunnerSkillsUpdated,
  type SkillsUpdated,
} from '../../src/shared/skills'
import { array } from './agent-events'
import { invalidInput, record, string } from './inputs'

function skill(value: unknown): AgentSkill {
  const input = record(value)
  const name = string(input.name)
  const description = string(input.description)
  if (input.manualOnly !== undefined && typeof input.manualOnly !== 'boolean')
    return invalidInput()
  return input.manualOnly === true
    ? { name, description, manualOnly: true }
    : { name, description }
}

/**
 * The skills of one agent. A name that no skill text can hold, and the
 * later skill of a repeated name, stay out, as the runner leaves them out.
 */
function skills(value: unknown): AgentSkill[] {
  const names = new Set<string>()
  return array(value, skill).filter((entry) => {
    if (!isSkillName(entry.name) || names.has(entry.name)) return false
    names.add(entry.name)
    return true
  })
}

/** The count and description limits are checked with the event limits. */
export function parseSkillReport(value: unknown): RunnerSkillsUpdated {
  const input = record(value)
  return {
    type: 'skills.updated',
    claude: skills(input.claude),
    codex: skills(input.codex),
  }
}

function cut(text: string): string {
  const characters = Array.from(text)
  return characters.length > SKILL_DESCRIPTION_MAX_CHARACTERS
    ? characters.slice(0, SKILL_DESCRIPTION_MAX_CHARACTERS).join('')
    : text
}

/** The workspace calls this only after complete-source secret filtering. */
export function displaySkillReport(
  event: RunnerSkillsUpdated,
): RunnerSkillsUpdated {
  const display = (skills: readonly AgentSkill[]) =>
    skills.map((skill) => ({ ...skill, description: cut(skill.description) }))
  return {
    ...event,
    claude: display(event.claude),
    codex: display(event.codex),
  }
}

export function checkDisplayedSkillReport(event: RunnerSkillsUpdated): void {
  for (const skill of [...event.claude, ...event.codex])
    if (Array.from(skill.description).length > SKILL_DESCRIPTION_MAX_CHARACTERS)
      invalidInput()
}

/** The event that tabs get for a stored report. */
export function presentSkillReport(event: RunnerSkillsUpdated): SkillsUpdated {
  return {
    type: 'skills.updated',
    skills: { claude: event.claude, codex: event.codex },
  }
}
