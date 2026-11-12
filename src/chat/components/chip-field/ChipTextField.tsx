import { useRef, useState, type Ref } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import fieldStyles from '../../../../docs/mockups/src/components/chat/ChipTextField.module.css'
import { classes } from '../../../../docs/mockups/src/components/common/classes'
import { useControlSizes } from '../../../../docs/mockups/src/components/common/touch'
import { useChatLinks } from '../../links/LinksContext'
import { useMentionTree } from '../../mentions/MentionsContext'
import { AttachedFileNode } from './attached-file-node'
import { FieldFilesProvider, type FieldFiles } from './attached-files'
import { LinkTextNode, WorkspaceChipNode } from './chip-nodes'
import local from './chip-field.module.css'
import { ClipboardPlugin } from './clipboard-plugins'
import { DropCaretLayer, type DropCaretControl } from './drop-caret'
import { $setFieldText } from './field-nodes'
import { FileMentionNode, MentionTextNode } from './file-mention-nodes'
import { MentionPlugin, MentionReconcilePlugin } from './mention-plugins'
import { OwnedFilesPlugin } from './owned-files'
import { UndoPlugin } from './undo-plugin'
import {
  EditablePlugin,
  EnterPlugin,
  ReconcilePlugin,
  ValuePlugin,
  type FieldOwner,
} from './field-plugins'
import {
  CaretAtEndPlugin,
  HandlePlugin,
  type FieldHandle,
} from './focus-plugins'

export interface ChipTextFieldProps {
  /** The spoken name of the field, such as "Message". */
  label: string
  placeholder: string
  /**
   * The text of the draft, with the link of each chip. With `files`, it is
   * the draft text of `src/app/draft-marks.ts`: escaped literal text and the
   * mark of each attached file.
   */
  value: string
  /**
   * The owner of the draft that the field shows: `Draft.id` in the chat, or
   * the model of a New workspace form. A new owner replaces the content,
   * the selection, and the undo history, also when its text is equal. A
   * draft that moves with its identity keeps them. See `ValuePlugin`.
   */
  owner: FieldOwner
  onChangeText: (text: string) => void
  /** The least number of lines that the field shows. */
  lines: number
  /** The most lines that the field shows before its text scrolls. */
  maxLines: number
  /** Whether the field takes changes now. It stays focusable either way. */
  editable?: boolean
  /** Enter, which the owner can take, such as to send. See `EnterPlugin`. */
  onEnter?: (event: KeyboardEvent) => boolean
  /**
   * The handle that moves the focus into the field, puts the chips of
   * attached files into its text, and draws its drop caret.
   */
  handle?: Ref<FieldHandle>
  /**
   * The attached files of the draft, which the chips in the text find by the
   * mark of each file. See `FieldFiles`. Only a field with them reads marks.
   * Such a field escapes each literal U+E000, U+E001, and U+E002 in its
   * draft text, as `literalText` says, so only an attached file makes a
   * mark, and a copy gives the text as typed. A field without them, such as
   * the message of Feedback, keeps its text, its clipboard, and its drag as
   * before, and treats each character of a mark as plain text.
   */
  files?: FieldFiles
  /**
   * The field takes the focus from the keyboard with the caret where it
   * was, or at the end of the text, as the message of New workspace does
   * with a kept draft. See `CaretAtEndPlugin`.
   */
  caretAtEnd?: boolean
  /**
   * Where the list of `@` opens, just above the message box. A field inside
   * the files of a chat, as `MentionsProvider` gives them, offers the list.
   */
  mentionHost?: HTMLElement | null
}

/**
 * The text field of a message box that holds a chip for each workspace
 * link: plain text, where each chip is one unit of the text. A paste and a
 * draft that comes back turn each workspace link into a chip, and typed
 * text stays text. Inside the files of a chat, `@` also opens the list of
 * the files and folders of the workspace, and a pick, a paste, or a draft
 * shows each mention of an entry as a file chip. With `files`, the field
 * also shows a chip for each attached file of the draft, with its upload.
 * The draft stays text, with the link of each chip and the mention of each
 * file chip. With `files`, it also holds the mark of each attached file, and
 * its literal text is escaped.
 * The field has the type and the line heights of the plain text field, and
 * it grows from `lines` to `maxLines`, then scrolls. On a phone its text is
 * larger. The chips find their workspaces through `LinksProvider`. The
 * field stays mounted when its owner changes, so it keeps the focus.
 */
export function ChipTextField(props: ChipTextFieldProps) {
  const { links } = useChatLinks()
  const tree = useMentionTree()
  const files = props.files ?? null
  const touch = useControlSizes().field === 'lg'
  const editable = props.editable ?? true
  const dropCaret = useRef<DropCaretControl>(null)
  const [initialConfig] = useState(() => ({
    namespace: 'Message',
    nodes: [
      WorkspaceChipNode,
      LinkTextNode,
      FileMentionNode,
      MentionTextNode,
      AttachedFileNode,
    ],
    theme: { paragraph: local.paragraph },
    editable,
    editorState: () => $setFieldText(props.value, { links, tree, files }),
    onError: (error: Error) => {
      throw error
    },
  }))
  return (
    <FieldFilesProvider files={files}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className={local.frame}>
          <PlainTextPlugin
            ErrorBoundary={LexicalErrorBoundary}
            contentEditable={
              <ContentEditable
                aria-label={props.label}
                aria-multiline
                aria-placeholder={props.placeholder}
                className={classes(
                  fieldStyles.field,
                  touch && fieldStyles.touch,
                )}
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
          <DropCaretLayer control={dropCaret} />
        </div>
        <UndoPlugin />
        <ValuePlugin
          onChangeText={props.onChangeText}
          owner={props.owner}
          value={props.value}
        />
        {files ? <OwnedFilesPlugin files={files} /> : null}
        <ClipboardPlugin owner={props.owner} />
        <EnterPlugin onEnter={props.onEnter} />
        <EditablePlugin editable={editable} />
        <ReconcilePlugin />
        <HandlePlugin dropCaret={dropCaret} handle={props.handle} />
        {props.caretAtEnd ? <CaretAtEndPlugin /> : null}
        {tree ? (
          <>
            <MentionPlugin host={props.mentionHost ?? null} />
            <MentionReconcilePlugin />
          </>
        ) : null}
      </LexicalComposer>
    </FieldFilesProvider>
  )
}
