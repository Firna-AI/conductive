import { SkillChip } from '../../ui/components/chat/SkillChip'
import type { Agent } from '../../shared/generated/Agent'
import { isPlainClick } from '../../shell/ui/AppLink'
import { findListedSkill, useMentionSkills } from '../mentions/mention-skills'
import { useChatMentions } from '../mentions/MentionsContext'
import type { ChatPart } from './chat-parts'

/** The part of a skill text that names a skill of a list. */
type SkillPart = Extract<ChatPart, { kind: 'skill' }>

/**
 * A skill in a sent message: a link of the app to the skill tab, as a file
 * chip is a link to its file. The chip names the skill of `agent`, the
 * agent that the message went to, or the skill of the other agent when
 * only that agent has a skill of the name, as the title of the chip does.
 * A plain click opens the skill tab, in the temporary tab when the skill
 * has none. A click with a modifier key stays with the browser. In a chat
 * without the skill tabs of the shell, the chip opens nothing.
 */
export function SkillLink(props: { part: SkillPart; agent?: Agent }) {
  const { part } = props
  const tabs = useChatMentions()?.skillTabs
  const skills = useMentionSkills()
  const listed = skills
    ? findListedSkill(skills, part.skill.name, props.agent)
    : undefined
  const target = listed
    ? { agent: listed.agent, name: listed.skill.name }
    : null
  const { name, description } = part.skill
  return (
    <SkillChip
      mention={part.source}
      opener={
        tabs && target
          ? (chip) => (
              <a
                {...chip}
                href={tabs.href(target)}
                onClick={(event) => {
                  if (!isPlainClick(event)) return
                  event.preventDefault()
                  tabs.open(target)
                }}
              />
            )
          : undefined
      }
      skill={{ name, description }}
    />
  )
}
