import type { ReactNode } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $create,
  $getNodeByKey,
  $getState,
  $setState,
  createState,
  DecoratorNode,
  TextNode,
  type LexicalNode,
  type NodeKey,
} from 'lexical'
import { FileChip } from '../../../../docs/mockups/src/components/chat/FileChip'
import { MentionIcon } from '../../mentions/MentionIcon'
import { mentionAt } from '../../mentions/mention-text'
import {
  findMentioned,
  useChatMentions,
  useMentionTree,
} from '../../mentions/MentionsContext'

/** The mention as the text has it, such as `@src/lib/`. */
const mentionState = createState('mention', {
  parse: (value) => (typeof value === 'string' ? value : ''),
})

const mentionStates = [{ flat: true, stateConfig: mentionState }] as const

/**
 * The chip of a file or a folder in the field: the chip of the mockups,
 * with the icon and the label of the name (decision 213). A press on the
 * name opens the file, or shows the folder in All files. The × of its icon
 * removes it as one step of undo, while the field takes changes (decision
 * 215). Until the field turns a chip whose entry left the tree into text,
 * it shows the mention.
 */
function FieldFileChip(props: { source: string; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext()
  const mentions = useChatMentions()
  const tree = useMentionTree()
  const mention = mentionAt(props.source, 0)
  const entry =
    mention && tree
      ? findMentioned(tree, mention.path, mention.folder)
      : undefined
  if (!mentions || !entry) return props.source
  const folder = entry.kind === 'directory'
  const remove = () => {
    if (!editor.isEditable()) return
    editor.update(() => $getNodeByKey(props.nodeKey)?.remove())
  }
  return (
    <FileChip
      entry={{ path: entry.path, folder }}
      icon={<MentionIcon entry={entry} size={12} />}
      name={entry.name}
      onOpen={() =>
        folder ? mentions.showFolder(entry.path) : mentions.openFile(entry.path)
      }
      removal={{ name: entry.name, onRemove: remove }}
      title={folder ? `${entry.path}/` : entry.path}
    />
  )
}

/**
 * A mention of a file or a folder in the field. It is one unit of the text:
 * the caret cannot enter it, the arrow keys step over it, and Backspace and
 * Delete remove it whole. Its text is the mention, so the draft keeps it.
 */
export class FileMentionNode extends DecoratorNode<ReactNode> {
  $config() {
    return this.config('file-mention', {
      extends: DecoratorNode,
      stateConfigs: [...mentionStates],
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
    return $getState(this, mentionState)
  }

  decorate(): ReactNode {
    return (
      <FieldFileChip
        nodeKey={this.getKey()}
        source={$getState(this, mentionState)}
      />
    )
  }
}

/**
 * A mention of a paste or a draft that shows as text, because the tree does
 * not hold its entry, or has not loaded yet. It becomes a chip when the
 * tree holds its entry, while it keeps the text of the mention. Text typed
 * beside it stays outside it, so a typed word never joins the mention.
 */
export class MentionTextNode extends TextNode {
  $config() {
    return this.config('file-mention-text', {
      extends: TextNode,
      stateConfigs: [...mentionStates],
    })
  }

  canInsertTextBefore(): false {
    return false
  }

  canInsertTextAfter(): false {
    return false
  }

  /** Whether the text is still the mention that the paste or draft gave. */
  isMention(): boolean {
    return this.getTextContent() === $getState(this, mentionState)
  }
}

export function $createFileMentionNode(source: string): FileMentionNode {
  return $setState($create(FileMentionNode), mentionState, source)
}

export function $createMentionTextNode(source: string): MentionTextNode {
  const text = $create(MentionTextNode).setTextContent(source)
  return $setState(text, mentionState, source)
}

export function $isFileMentionNode(
  node: LexicalNode | null | undefined,
): node is FileMentionNode {
  return node instanceof FileMentionNode
}

export function $isMentionTextNode(
  node: LexicalNode | null | undefined,
): node is MentionTextNode {
  return node instanceof MentionTextNode
}
