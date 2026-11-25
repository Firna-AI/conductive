import { routes } from '../../../app/router'
import { isSkillName, type SkillIdentity } from '../../../shared/skills'

/** The first part of the address of a skill tab after the workspace. */
const SKILLS = 'skills'

/**
 * A name of only `~` signs and then one or two dots, such as `.`, `..`, or
 * `~.`. A browser drops a part `.` or `..` of an address, and reads `%2E`
 * as a dot, so the address writes each such name with one more `~` in
 * front. `.` becomes `~.`, and `~.` becomes `~~.`, so each name keeps its
 * own address.
 */
const DOTS = /^~*\.{1,2}$/

/** The name of a skill as the address writes it. */
function nameInAddress(name: string): string {
  return DOTS.test(name) ? `~${name}` : name
}

/** The name of a skill from the address, which takes off its escape. */
function nameFromAddress(written: string): string {
  return written.startsWith('~') && DOTS.test(written)
    ? written.slice(1)
    : written
}

/**
 * The skill that the address after the workspace names, or null. The
 * address of a skill tab is `skills/<agent>/<name>`. See "The address" in
 * `docs/protocol/skill-tabs.md`.
 * The address of a link encodes a `/` of the name, and an address that a
 * person types can keep it, so each part after the agent joins the name.
 * A name of dots has a `~` in front, as `nameInAddress` says.
 * An agent other than `claude` or `codex`, and a name that a skill text
 * cannot hold, name no skill.
 */
export function skillPlace(view: readonly string[]): SkillIdentity | null {
  const [area, agent, ...rest] = view
  if (area !== SKILLS || (agent !== 'claude' && agent !== 'codex')) return null
  const name = nameFromAddress(rest.join('/'))
  return isSkillName(name) ? { agent, name } : null
}

/** The address of the skill tab of a skill in a workspace. */
export function skillHref(
  orgId: string,
  workspaceId: string,
  skill: SkillIdentity,
): string {
  return routes.workspace(
    orgId,
    workspaceId,
    SKILLS,
    skill.agent,
    nameInAddress(skill.name),
  )
}
