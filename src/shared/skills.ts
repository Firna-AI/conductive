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
