/** The most skills of one agent in a report: the first ones in name order. */
export const SKILL_REPORT_MAX_SKILLS = 200
/**
 * The length at which the workspace cuts a description for display, in
 * Unicode code points. The runner never cuts a description, because the
 * workspace filters marked secret values only after it gets the report.
 */
export const SKILL_DESCRIPTION_MAX_CHARACTERS = 300
/**
 * The runner sends a longer description as an empty string, whole or not at
 * all, in Unicode code points.
 */
export const SKILL_DESCRIPTION_REPORT_MAX_CHARACTERS = 4096
/**
 * The runner leaves out a skill with a longer name, in Unicode code points.
 * Claude offers no skill with a longer name.
 */
const SKILL_NAME_MAX_CHARACTERS = 256

/** One skill that an agent can run, as the app shows it. */
export interface AgentSkill {
  name: string
  /** The whole description. Empty when the runner left it out. */
  description: string
  /**
   * True when the `SKILL.md` sets `disable-model-invocation: true`, so only
   * a member can start the skill. Absent for every other skill.
   */
  manualOnly?: boolean
}

/**
 * The full skill list of each agent. A later report replaces the last one.
 * It holds no path of the cloud computer.
 */
export interface RunnerSkillsUpdated {
  type: 'skills.updated'
  claude: readonly AgentSkill[]
  codex: readonly AgentSkill[]
}

/**
 * True for a name that a skill text can hold: not empty, within the limit,
 * and without white space or control characters.
 */
export function isSkillName(name: string): boolean {
  return (
    name.length > 0 &&
    [...name].length <= SKILL_NAME_MAX_CHARACTERS &&
    !/[\s\p{Z}\p{Cc}]/u.test(name)
  )
}

/** The skill list of each agent, as the workspace keeps and shows it. */
export interface SkillLists {
  claude: readonly AgentSkill[]
  codex: readonly AgentSkill[]
}

/**
 * The latest skill lists of the workspace, as tabs get them. A workspace
 * with no such event yet has had no report. A later event replaces the
 * last one, also while the cloud computer sleeps.
 */
export interface SkillsUpdated {
  type: 'skills.updated'
  /**
   * The filtered lists, with each description cut for display. Null means
   * that the list is unavailable: a runner reached `runner.ready` with no
   * skills report since its connect, or the repair of a refused report
   * failed.
   */
  skills: SkillLists | null
}
