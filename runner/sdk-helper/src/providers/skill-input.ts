import { sep } from 'node:path'

import type { Agent } from '../generated/Agent'
import type { SkillInput } from '../generated/SkillInput'
import { skillNames } from '../../../../src/shared/skill-text'
import { orgSkillsCopyRoot } from './org-skills'

/** The current skill list of each agent. The skills report fills it. */
export interface SkillSource {
  of(agent: Agent): readonly SkillInput[]
}

/** Current private paths delivered with each helper send. */
export class SkillInputs implements SkillSource {
  private entries: readonly SkillInput[] = []

  of(): readonly SkillInput[] {
    return this.entries
  }

  replace(entries: readonly SkillInput[]): void {
    this.entries = entries
  }
}

/**
 * The list gives each org skill with its path in the copy of the skills
 * repository. An agent start reads the org skills from its own safe view.
 * So an org skill takes its path in that view, by its name. An org skill
 * that the view lacks gives no input.
 */
export function withOrgSkillPaths(
  skills: SkillSource,
  home: string,
  view: ReadonlyMap<string, string>,
): SkillSource {
  const root = orgSkillsCopyRoot(home) + sep
  return {
    of: (agent) =>
      skills.of(agent).flatMap((skill) => {
        if (!skill.path.startsWith(root)) return [skill]
        const path = view.get(skill.name)
        return path === undefined ? [] : [{ name: skill.name, path }]
      }),
  }
}

/** A runner without a skills report, such as the login measure. */
export const noSkills: SkillSource = { of: () => [] }

/** The structured skill input of the Codex app server. */
interface CodexSkillInput extends SkillInput {
  type: 'skill'
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
