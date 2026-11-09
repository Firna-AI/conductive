import { useState, type Ref } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import fieldStyles from '../../../../docs/mockups/src/components/chat/ChipTextField.module.css'
import { classes } from '../../../../docs/mockups/src/components/common/classes'
import { useControlSizes } from '../../../../docs/mockups/src/components/common/touch'
import { useChatLinks } from '../../links/LinksContext'
import { LinkTextNode, WorkspaceChipNode } from './chip-nodes'
import local from './chip-field.module.css'
import { $setFieldText } from './field-content'
import {
  CopyPlugin,
  EditablePlugin,
  EnterPlugin,
  FocusPlugin,
  PastePlugin,
  ReconcilePlugin,
  ValuePlugin,
  type FieldHandle,
} from './field-plugins'

export interface ChipTextFieldProps {
  /** The spoken name of the field, such as "Message". */
  label: string
  placeholder: string
  /** The plain text of the draft, with the link of each chip. */
  value: string
  onChangeText: (text: string) => void
  /** The least number of lines that the field shows. */
  lines: number
  /** The most lines that the field shows before its text scrolls. */
  maxLines: number
  /** Whether the field takes changes now. It stays focusable either way. */
  editable?: boolean
  /** Enter, which the owner can take, such as to send. See `EnterPlugin`. */
  onEnter?: (event: KeyboardEvent) => boolean
  /** The handle that moves the focus into the field. */
  handle?: Ref<FieldHandle>
}

/**
 * The text field of a message box that holds a chip for each workspace
 * link: plain text, where each chip is one unit of the text. A paste and a
 * draft that comes back turn each workspace link into a chip, and typed
 * text stays text. The draft stays plain text, with the link of each chip.
 * The field has the type and the line heights of the plain text field, and
 * it grows from `lines` to `maxLines`, then scrolls. On a phone its text is
 * larger. The chips find their workspaces through `LinksProvider`.
 */
export function ChipTextField(props: ChipTextFieldProps) {
  const { links } = useChatLinks()
  const touch = useControlSizes().field === 'lg'
  const editable = props.editable ?? true
  const [initialConfig] = useState(() => ({
    namespace: 'Message',
    nodes: [WorkspaceChipNode, LinkTextNode],
    theme: { paragraph: local.paragraph },
    editable,
    editorState: () => $setFieldText(props.value, links),
    onError: (error: Error) => {
      throw error
    },
  }))
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={local.frame}>
        <PlainTextPlugin
          ErrorBoundary={LexicalErrorBoundary}
          contentEditable={
            <ContentEditable
              aria-label={props.label}
              aria-multiline
              aria-placeholder={props.placeholder}
              className={classes(fieldStyles.field, touch && fieldStyles.touch)}
              placeholder={
                <div
                  className={classes(local.placeholder, touch && local.touch)}
                >
                  {props.placeholder}
                </div>
              }
              style={{
                minHeight: `${props.lines}lh`,
                maxHeight: `${props.maxLines}lh`,
              }}
              tabIndex={0}
            />
          }
        />
      </div>
      <HistoryPlugin />
      <ValuePlugin onChangeText={props.onChangeText} value={props.value} />
      <PastePlugin />
      <CopyPlugin />
      <EnterPlugin onEnter={props.onEnter} />
      <EditablePlugin editable={editable} />
      <ReconcilePlugin />
      <FocusPlugin handle={props.handle} />
    </LexicalComposer>
  )
}
