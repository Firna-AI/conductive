import { useCallback, useSyncExternalStore } from 'react'
import type { Agent } from '../../shared/agents'
import type { AgentSkill, SkillLists } from '../../shared/skills'
import { useChatMentions } from './MentionsContext'

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

function followNothing(): () => void {
  return () => undefined
}

/**
 * The skill lists that the chat follows now, or null without mentions. A
 * reader that `follows` nothing, such as an answer, gets null and follows
 * no change.
 */
export function useMentionSkills(follows = true): MentionSkills | null {
  const mentions = useChatMentions()
  const skills = follows ? (mentions?.skills ?? null) : null
  const read = useCallback(() => skills?.getSnapshot() ?? null, [skills])
  return useSyncExternalStore(skills?.subscribe ?? followNothing, read, read)
}

/** The skills of one agent, or none while the lists are not ready. */
export function agentSkills(
  skills: MentionSkills,
  agent: Agent,
): readonly AgentSkill[] {
  return skills.state === 'ready' ? skills.lists[agent] : []
}

/**
 * The skill of either agent that a skill text names, or undefined. The
 * list of `agent` comes first, so its description gives the title.
 */
export function findSkill(
  skills: MentionSkills,
  name: string,
  agent: Agent = 'claude',
): AgentSkill | undefined {
  if (skills.state !== 'ready') return undefined
  const other: Agent = agent === 'claude' ? 'codex' : 'claude'
  const named = (skill: AgentSkill) => skill.name === name
  return skills.lists[agent].find(named) ?? skills.lists[other].find(named)
}
