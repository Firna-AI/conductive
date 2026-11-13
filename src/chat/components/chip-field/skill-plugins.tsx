import { useMemo } from 'react'
import { SkillIcon } from '../../../../docs/mockups/src/components/chat/SkillChip'
import { skillListCopy } from '../../../../docs/mockups/src/components/chat/skillCopy'
import type { Agent } from '../../../shared/agents'
import type { AgentSkill } from '../../../shared/skills'
import {
  agentSkills,
  useMentionSkills,
  type MentionSkills,
} from '../../mentions/mention-skills'
import { skillRows } from '../../mentions/skill-rows'
import { MentionListPlugin, type MentionSource } from './mention-list-plugin'
import { $pickSkill } from './skill-content'

/**
 * The one line of the list of `/` in place of its rows, or null. No list
 * can tell yet whether a skill matches while the lists load or are
 * unavailable, so those lines show for each query. The line of an agent
 * without skills shows only for `/` alone, so a typed path such as
 * `see /tmp` opens nothing.
 */
function lineOf(
  skills: MentionSkills,
  agent: Agent,
  query: string,
): string | null {
  if (skills.state === 'loading') return skillListCopy.loading
  if (skills.state === 'unavailable') return skillListCopy.unavailable
  if (query === '' && skills.lists[agent].length === 0) {
    return skillListCopy.none
  }
  return null
}

/**
 * The list of `/`, as `MentionListPlugin` opens it, with the skills of
 * `agent`: the agent of the model chosen now in the composer. When no skill
 * matches the query, the list closes. While the list shows no row, also
 * while a line shows, Enter goes on to the field, so it sends. Screen
 * readers hear the list as "Skills". A pick puts the chip of the skill in
 * place of `/` and the query.
 */
export function SkillMentionPlugin(props: {
  host: HTMLElement | null
  agent: Agent
}) {
  const skills = useMentionSkills()
  const { agent } = props
  const source = useMemo(
    (): MentionSource<AgentSkill> | null =>
      skills && {
        rowsOf: (query) => skillRows(agentSkills(skills, agent), query),
        lineOf: (query) => lineOf(skills, agent, query),
      },
    [skills, agent],
  )
  return (
    <MentionListPlugin
      host={props.host}
      id="skill-mention-list"
      keepsEnter={false}
      label="Skills"
      listRow={(skill) => ({
        key: skill.name,
        name: skill.name,
        folder: '',
        description: skill.description,
        icon: <SkillIcon size={14} />,
      })}
      pick={$pickSkill}
      source={source}
      trigger="/"
    />
  )
}
