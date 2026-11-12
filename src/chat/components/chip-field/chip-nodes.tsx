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
import { SessionChip } from '../../../../docs/mockups/src/components/chat/SessionChip'
import { WorkspaceChip } from '../../../../docs/mockups/src/components/chat/WorkspaceChip'
import { chipOf, useChatLinks } from '../../links/LinksContext'
import { sessionChipOf, useLinkedSession } from '../../links/session-links'
import { linkTarget } from '../../links/workspace-links'

/** The link as the text has it, such as a bare address or a Markdown link. */
const sourceState = createState('source', {
  parse: (value) => (typeof value === 'string' ? value : ''),
})

/** The web address of the link. */
const hrefState = createState('href', {
  parse: (value) => (typeof value === 'string' ? value : ''),
})

const linkStates = [
  { flat: true, stateConfig: sourceState },
  { flat: true, stateConfig: hrefState },
] as const

/**
 * The chip in the field: the pure chip of the mockups, with the current
 * name, state, and GitHub state of its workspace, or the session chip of a
 * known session. It opens nothing. The × of its mark removes it as one step of
 * undo, while the field takes changes. Until the field turns a chip whose
 * workspace left the list into text, it shows the link.
 */
function FieldChip(props: { source: string; href: string; nodeKey: NodeKey }) {
  const [editor] = useLexicalComposerContext()
  const { links } = useChatLinks()
  const target = linkTarget(props.href, links)
  const session = useLinkedSession(target)
  if (!target) return props.source
  const remove = () => {
    if (!editor.isEditable()) return
    editor.update(() => $getNodeByKey(props.nodeKey)?.remove())
  }
  if (session) {
    const chip = sessionChipOf(target.workspace, session)
    return (
      <SessionChip
        removal={{
          name: `${chip.workspace.label} ${chip.title}`,
          onRemove: remove,
        }}
        session={chip}
      />
    )
  }
  const chip = chipOf(target.workspace)
  return (
    <WorkspaceChip
      removal={{ name: `${chip.label} ${chip.name}`, onRemove: remove }}
      workspace={chip}
    />
  )
}

/**
 * A workspace link in the field. It is one unit of the text: the caret
 * cannot enter it, the arrow keys step over it, and Backspace and Delete
 * remove it whole. Its text is the exact link, so the draft keeps the link.
 */
export class WorkspaceChipNode extends DecoratorNode<ReactNode> {
  $config() {
    return this.config('workspace-chip', {
      extends: DecoratorNode,
      stateConfigs: [...linkStates],
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
    return $getState(this, sourceState)
  }

  getHref(): string {
    return $getState(this, hrefState)
  }

  decorate(): ReactNode {
    return (
      <FieldChip
        href={$getState(this, hrefState)}
        nodeKey={this.getKey()}
        source={$getState(this, sourceState)}
      />
    )
  }
}

/**
 * A link of a paste or a draft that shows as text, because no workspace of
 * the list has it yet. It becomes a chip when the list finds its workspace,
 * while it keeps the text of the link. Text typed beside it stays outside
 * it, so a typed word never becomes part of the link.
 */
export class LinkTextNode extends TextNode {
  $config() {
    return this.config('workspace-link-text', {
      extends: TextNode,
      stateConfigs: [...linkStates],
    })
  }

  canInsertTextBefore(): false {
    return false
  }

  canInsertTextAfter(): false {
    return false
  }

  /** Whether the text is still the link that the paste or the draft gave. */
  isLink(): boolean {
    return this.getTextContent() === $getState(this, sourceState)
  }

  getHref(): string {
    return $getState(this, hrefState)
  }
}

export function $createWorkspaceChipNode(
  source: string,
  href: string,
): WorkspaceChipNode {
  const chip = $setState($create(WorkspaceChipNode), sourceState, source)
  return $setState(chip, hrefState, href)
}

export function $createLinkTextNode(
  source: string,
  href: string,
): LinkTextNode {
  const text = $create(LinkTextNode).setTextContent(source)
  return $setState($setState(text, sourceState, source), hrefState, href)
}

export function $isWorkspaceChipNode(
  node: LexicalNode | null | undefined,
): node is WorkspaceChipNode {
  return node instanceof WorkspaceChipNode
}

export function $isLinkTextNode(
  node: LexicalNode | null | undefined,
): node is LinkTextNode {
  return node instanceof LinkTextNode
}
