import type { ReactNode } from 'react'
import {
  $create,
  $getState,
  $setState,
  createState,
  DecoratorNode,
  stopLexicalPropagation,
  type LexicalNode,
} from 'lexical'
import { fileMark } from '../../../app/draft-marks'
import { FieldAttachedChip } from './attached-file-chip'

/** The draft ID of the file. */
const fileState = createState('file', {
  parse: (value) => (typeof value === 'string' ? value : ''),
})

const fileStates = [{ flat: true, stateConfig: fileState }] as const

/**
 * The events that a control of the chip gets while it has the focus, such as
 * Enter on Try again. The editor leaves them alone, so a key there neither
 * sends the message nor changes the text, and the control gets its own key.
 * Each event still goes on through the page, such as Escape to a dialog.
 */
const controlEvents = ['keydown', 'keyup', 'cut', 'paste'] as const

/**
 * An attached file of the draft in the field. It is one unit of the text, as
 * a file chip is: the caret cannot enter it, the arrow keys step over it, and
 * Backspace and Delete remove it whole. Its text is the mark of its file, so
 * the draft keeps the place of the file.
 */
export class AttachedFileNode extends DecoratorNode<ReactNode> {
  $config() {
    return this.config('attached-file', {
      extends: DecoratorNode,
      stateConfigs: [...fileStates],
    })
  }

  createDOM(): HTMLElement {
    const element = document.createElement('span')
    for (const type of controlEvents) {
      element.addEventListener(type, stopLexicalPropagation)
    }
    return element
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

  /** The draft ID of the file. */
  getFileId(): string {
    return $getState(this, fileState)
  }

  getTextContent(): string {
    return fileMark(this.getFileId())
  }

  decorate(): ReactNode {
    return <FieldAttachedChip id={this.getFileId()} nodeKey={this.getKey()} />
  }
}

export function $createAttachedFileNode(id: string): AttachedFileNode {
  return $setState($create(AttachedFileNode), fileState, id)
}

export function $isAttachedFileNode(
  node: LexicalNode | null | undefined,
): node is AttachedFileNode {
  return node instanceof AttachedFileNode
}
