import type { Agent } from '../../shared/generated/Agent'
import type { AgentSkill } from '../../shared/generated/AgentSkill'
import type { SkillLists } from '../../shared/generated/SkillLists'

// The skill lists of the workspace and the lookup of a skill in them. The
// module holds no React, so the readers of chat text can use its types.
// `useMentionSkills` of `MentionsContext.tsx` follows the lists.

/**
 * The skill lists of the workspace as the list of `/` and the skill chips
 * find them: no report yet, no list, or the list of each agent. A list can
 * be empty.
 */
export type MentionSkills =
  | { state: 'loading' }
  | { state: 'unavailable' }
  | { state: 'ready'; lists: SkillLists }

/**
 * The skill lists of the workspace, as a store that the chat follows. The
 * snapshot stays the same value until a new report comes.
 */
export interface SkillsStore {
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => MentionSkills
}

/** The skills of one agent, or none while the lists are not ready. */
export function agentSkills(
  skills: MentionSkills,
  agent: Agent,
): readonly AgentSkill[] {
  return skills.state === 'ready' ? skills.lists[agent] : []
}

/** A skill of a list, with the agent whose list holds it. */
export interface ListedSkill {
  agent: Agent
  skill: AgentSkill
}

/**
 * The skill of either agent that a skill text names, with its agent, or
 * undefined. The list of `agent` comes first, so a chip names the skill of
 * that agent when it has one, and the skill of the other agent otherwise.
 */
export function findListedSkill(
  skills: MentionSkills,
  name: string,
  agent: Agent = 'claude',
): ListedSkill | undefined {
  if (skills.state !== 'ready') return undefined
  const other: Agent = agent === 'claude' ? 'codex' : 'claude'
  const named = (skill: AgentSkill) => skill.name === name
  for (const each of [agent, other]) {
    const skill = skills.lists[each].find(named)
    if (skill) return { agent: each, skill }
  }
  return undefined
}
