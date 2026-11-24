import { createContext, useContext, type ReactNode } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $create,
  $getNodeByKey,
  $getState,
  $setState,
  createState,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
} from 'lexical'
import { SkillChip } from '../../../ui/components/chat/SkillChip'
import type { Agent } from '../../../shared/generated/Agent'
import { skillTextAt } from '../../../shared/skill-text'
import {
  findListedSkill,
  useMentionSkills,
  type ListedSkill,
  type MentionSkills,
} from '../../mentions/mention-skills'
import { useChatMentions } from '../../mentions/MentionsContext'

/** The skill text as the text has it, such as `/plans`. */
const skillState = createState('skill', {
  parse: (value) => (typeof value === 'string' ? value : ''),
})

const skillStates = [{ flat: true, stateConfig: skillState }] as const

const FieldAgentContext = createContext<Agent | null>(null)

/**
 * The agent of the model chosen now in the composer of the field, whose
 * skills the list of `/` shows. Null in a field without the list.
 */
export function FieldAgentProvider(props: {
  agent: Agent | null
  children: ReactNode
}) {
  return (
    <FieldAgentContext.Provider value={props.agent}>
      {props.children}
    </FieldAgentContext.Provider>
  )
}

/** The agent of the field, as `FieldAgentProvider` gives it. */
function useFieldAgent(): Agent | null {
  return useContext(FieldAgentContext)
}

/**
 * The skill of either agent that a whole text names as its skill text,
 * with its agent, or undefined. The skill of `agent` comes first.
 */
export function namedSkill(
  skills: MentionSkills,
  source: string,
  agent?: Agent,
): ListedSkill | undefined {
  const text = skillTextAt(source, 0)
  if (text === null || text.source !== source) return undefined
  return findListedSkill(skills, text.name, agent)
}

/**
 * The chip of a skill in the field: the shared `SkillChip`, with the
 * skill icon and the name. It names the skill of the agent of the
 * composer, else of the other agent: its title is the description of that
 * skill, and a press on its name opens the skill tab of that skill. The ×
 * of its icon removes it as one step of undo, while the field takes
 * changes. Until the field turns a chip whose skill left both lists into
 * text, it shows the skill text.
 */
function FieldSkillChip(props: { source: string; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext()
  const skills = useMentionSkills()
  const tabs = useChatMentions()?.skillTabs
  const agent = useFieldAgent() ?? undefined
  const listed = skills ? namedSkill(skills, props.source, agent) : undefined
  if (!listed) return props.source
  const { skill } = listed
  const remove = () => {
    if (!editor.isEditable()) return
    editor.update(() => $getNodeByKey(props.nodeKey)?.remove())
  }
  return (
    <SkillChip
      onOpen={
        tabs
          ? () => tabs.open({ agent: listed.agent, name: skill.name })
          : undefined
      }
      removal={{ name: skill.name, onRemove: remove }}
      skill={{ name: skill.name, description: skill.description }}
    />
  )
}

/**
 * A skill text in the field. It is one unit of the text: the caret cannot
 * enter it, the arrow keys step over it, and Backspace and Delete remove it
 * whole. Its text is the skill text, so the draft keeps it.
 */
export class SkillMentionNode extends DecoratorNode<ReactNode> {
  $config() {
    return this.config('skill-mention', {
      extends: DecoratorNode,
      stateConfigs: [...skillStates],
    })
  }

  createDOM(): HTMLElement {
    return document.createElement('span')
  }

  updateDOM(): false {
    return false
  }

  isInline(): true {
    return true
  }

  isKeyboardSelectable(): false {
    return false
  }

  getTextContent(): string {
    return $getState(this, skillState)
  }

  decorate(): ReactNode {
    return (
      <FieldSkillChip
        nodeKey={this.getKey()}
        source={$getState(this, skillState)}
      />
    )
  }
}

export function $createSkillMentionNode(source: string): SkillMentionNode {
  return $setState($create(SkillMentionNode), skillState, source)
}

export function $isSkillMentionNode(
  node: LexicalNode | null | undefined,
): node is SkillMentionNode {
  return node instanceof SkillMentionNode
}
