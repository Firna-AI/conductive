import { routes } from '../../../app/router'
import { isSkillName, type SkillIdentity } from '../../../shared/skills'

/** The first part of the address of a skill tab after the workspace. */
const SKILLS = 'skills'

/**
 * The skill that the address after the workspace names, or null. The
 * address of a skill tab is `skills/<agent>/<name>`. See "The address" in
 * `docs/protocol/skill-tabs.md`.
 * The address of a link encodes a `/` of the name, and an address that a
 * person types can keep it, so each part after the agent joins the name.
 * An agent other than `claude` or `codex`, and a name that a skill text
 * cannot hold, name no skill.
 */
export function skillPlace(view: readonly string[]): SkillIdentity | null {
  const [area, agent, ...rest] = view
  if (area !== SKILLS || (agent !== 'claude' && agent !== 'codex')) return null
  const name = rest.join('/')
  return isSkillName(name) ? { agent, name } : null
}

/** The address of the skill tab of a skill in a workspace. */
export function skillHref(
  orgId: string,
  workspaceId: string,
  skill: SkillIdentity,
): string {
  return routes.workspace(orgId, workspaceId, SKILLS, skill.agent, skill.name)
}
