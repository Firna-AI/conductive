import { InputFrame } from '@firna/ui/input'
import { ArrowUp, MessageSquareQuote } from 'lucide-react'
import { noop } from '../../noop'
import { SendButton } from '../chat/ComposerButtons'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { Linked } from '../common/ScreenLink'
import { useControlSizes, useTouch } from '../common/touch'
import {
  askLabel,
  promptHint,
  promptLabel,
  promptPlaceholder,
} from './sideQuestionCopy'
import styles from './AskAbout.module.css'

/**
 * Where a part by a selection lines up: `start` at the middle of the
 * selection for the button, and at the start of its end for the prompt
 * field, or `end` at the end of the selection, where the chat has no room
 * past it, such as in a message bubble at the right of the chat.
 */
export type ByAlign = 'start' | 'end'

/**
 * Ask about this, by a finished selection inside one message, on a
 * computer. It floats just above the selection, at its middle, as the
 * selection tools of most editors do. So it covers none of the text that
 * the member reads next. Tab reaches it from the selection, and a press
 * opens the prompt field under the selection.
 */
export function AskButton(props: { to?: string; align: ByAlign }) {
  const align = props.align === 'start' ? styles.middle : styles.end
  return (
    <span className={classes(styles.float, styles.above, align)}>
      <Linked to={props.to}>
        <ActionButton icon={MessageSquareQuote}>{askLabel}</ActionButton>
      </Linked>
    </span>
  )
}

/**
 * Ask about this on a phone, above the composer. The phone shows its own
 * selection menu above the selection, and its handles at the ends, so the
 * button stays away from them. A computer shows it by the selection, so
 * it draws nothing here.
 */
export function PhoneAskButton(props: { to?: string }) {
  if (!useTouch()) return null
  return (
    <div className={styles.phoneRow}>
      <span className={classes(styles.float, styles.phoneFloat)}>
        <Linked to={props.to}>
          <ActionButton icon={MessageSquareQuote}>{askLabel}</ActionButton>
        </Linked>
      </span>
    </div>
  )
}

/** The text field of the prompt, which opens focused. */
function PromptField(props: { draft: string; lines: number }) {
  const { field } = useControlSizes()
  return (
    <InputFrame
      accessibilityLabel={promptLabel}
      focusIndicator="none"
      maxLines={6}
      multiline
      numberOfLines={props.lines}
      onChangeText={noop}
      placeholder={promptPlaceholder}
      size={field}
      value={props.draft}
      variant="seamless"
    />
  )
}

/**
 * The prompt field that Ask about this opens by the selection, on a
 * computer: the question, the line that says where it goes, Cancel, and
 * Send. Enter sends, Escape cancels, and the selection stays in view.
 * Send is off until the field holds text.
 */
export function AskPrompt(props: {
  draft: string
  align: ByAlign
  sendTo?: string
  cancelTo?: string
}) {
  return (
    <div
      aria-label={askLabel}
      className={classes(styles.prompt, styles.below, styles[props.align])}
      role="dialog"
    >
      <PromptField draft={props.draft} lines={2} />
      <div className={styles.bar}>
        <span className={styles.hint}>{promptHint}</span>
        <Linked to={props.cancelTo}>
          <ActionButton tone="plain">Cancel</ActionButton>
        </Linked>
        <Linked to={props.sendTo}>
          <SendButton draft={props.draft} />
        </Linked>
      </div>
    </div>
  )
}

/**
 * The prompt field on a phone, as a sheet over the chat, as each phone
 * form of the app opens: the quoted text, the question, the line that says
 * where it goes, then Cancel and Send.
 */
export function AskPromptSheet(props: {
  quote: string
  draft: string
  sendTo?: string
  cancelTo?: string
}) {
  return (
    <ConfirmDialog
      actions={
        <>
          <Linked to={props.cancelTo}>
            <ActionButton>Cancel</ActionButton>
          </Linked>
          <Linked to={props.sendTo}>
            <ActionButton
              disabled={props.draft === ''}
              icon={ArrowUp}
              tone="primary"
            >
              Send
            </ActionButton>
          </Linked>
        </>
      }
      title={askLabel}
      viewport="mobile"
    >
      <p className={styles.quote}>“{props.quote}”</p>
      <div className={styles.sheetField}>
        <PromptField draft={props.draft} lines={3} />
      </div>
      <p className={styles.sheetHint}>{promptHint}</p>
    </ConfirmDialog>
  )
}
