import type { Agent } from '../../../src/shared/agents'
import { skillNames } from '../../../src/shared/skill-text'

/** One skill of an agent list, with the absolute path of its `SKILL.md`. */
export interface ListedSkill {
  name: string
  path: string
}

/** The current skill list of each agent. The skills report fills it. */
export interface SkillSource {
  of(agent: Agent): readonly ListedSkill[]
}

/** A runner without a skills report, such as the login measure. */
export const noSkills: SkillSource = { of: () => [] }

/** The structured skill input of the Codex app server. */
export interface CodexSkillInput {
  type: 'skill'
  name: string
  path: string
}

/**
 * One skill input for each distinct skill of the message text that the
 * current Codex list holds, in the order of the text. The text itself stays
 * as the member wrote it.
 */
export function codexSkillInputs(
  text: string,
  skills: SkillSource,
): CodexSkillInput[] {
  const paths = new Map(
    skills.of('codex').map((skill) => [skill.name, skill.path]),
  )
  const inputs: CodexSkillInput[] = []
  for (const name of skillNames(text, (name) => paths.has(name))) {
    const path = paths.get(name)
    if (path !== undefined) inputs.push({ type: 'skill', name, path })
  }
  return inputs
}
