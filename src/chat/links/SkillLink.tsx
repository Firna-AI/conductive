import { SkillChip } from '../../ui/components/chat/SkillChip'
import { isPlainClick } from '../../shell/ui/AppLink'
import { useChatMentions } from '../mentions/MentionsContext'
import type { ChatPart } from './chat-parts'

/** The part of a skill text that names a skill of a list. */
type SkillPart = Extract<ChatPart, { kind: 'skill' }>

/**
 * A skill in a sent message: a link of the app to the skill tab, as a file
 * chip is a link to its file. The part names the skill and the agent whose
 * list holds it: the agent that the message went to, or the other agent
 * when only that agent has a skill of the name. So the title of the chip
 * and its skill tab come from one lookup. A plain click opens the skill
 * tab, in the temporary tab when the skill has none. A click with a
 * modifier key stays with the browser. In a chat without the skill tabs of
 * the shell, the chip opens nothing.
 */
export function SkillLink(props: { part: SkillPart }) {
  const { part } = props
  const tabs = useChatMentions()?.skillTabs
  const { name, description } = part.skill
  const target = { agent: part.agent, name }
  return (
    <SkillChip
      mention={part.source}
      opener={
        tabs
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
