import type { ReactElement } from 'react'
import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { CornerDownLeft, Info } from 'lucide-react'
import { defined } from '../../defined'
import type { FeedbackScreenshot } from '../../fixtures/feedback'
import { paths } from '../../paths'
import { messageField } from '../../entries/components/chat/MessageField.mockup'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { confirmDialog } from '../../entries/components/common/ConfirmDialog.mockup'
import { notice } from '../../entries/components/common/Notice.mockup'
import { ScreenLink } from '../common/ScreenLink'
import {
  addScreenshotsLabel,
  contextLine,
  feedbackPlaceholder,
  imageTypesBody,
  notAddedTitle,
  notSentTitle,
  screenshotLimitBody,
  sendFeedbackLabel,
  sendingLabel,
  sendLabel,
} from '../../../../../src/ui/components/feedback/feedbackCopy'
import {
  replyFailure,
  replyLine,
} from '../../entries/components/feedback/FeedbackReply.mockup'
import type { FeedbackReply } from './FeedbackReply'
import { screenshotRow } from '../../entries/components/feedback/ScreenshotRow.mockup'
import styles from '../../../../../src/ui/components/feedback/FeedbackDialog.module.css'

/**
 * What a notice under the message box names: a file that the dialog did
 * not add, because it passes the limit of the screenshots or is of another
 * type, or a send that failed, with the message of its error: the message
 * of the server, or the time when a send over the limit can go.
 */
export type FeedbackProblem =
  | { kind: 'too-large'; name: string }
  | { kind: 'other-type'; name: string }
  | { kind: 'not-sent'; message: string }

export type FeedbackDialogProps = {
  text: string
  screenshots: readonly FeedbackScreenshot[]
  /** The read of the reply address, which Send waits for. */
  reply: FeedbackReply
  problem?: FeedbackProblem
  /** The send runs, so the dialog takes no change and stays open. */
  sending?: boolean
  /** The screen that Send leads to, when the mockups draw it. */
  sendTo?: string
  /** The screen that Try again of a failed read leads to, when drawn. */
  retryTo?: string
  viewport: Viewport
}

function problemWords(problem: FeedbackProblem): {
  title: string
  body: string
} {
  switch (problem.kind) {
    case 'too-large':
      return { title: notAddedTitle(problem.name), body: screenshotLimitBody }
    case 'other-type':
      return { title: notAddedTitle(problem.name), body: imageTypesBody }
    case 'not-sent':
      return { title: notSentTitle, body: problem.message }
  }
}

/** The most lines that the message box shows before its text scrolls. */
const maxLines = 12

/**
 * The lines that the message box shows. It grows with the lines of its
 * text, from its least lines to 12, as the box of the app does while the
 * person types. A view runs no script, so it draws the grown box.
 */
function shownLines(text: string, least: number): number {
  return Math.min(maxLines, Math.max(least, text.split('\n').length))
}

/** A control that leads to another screen, when the mockups draw one. */
function linked(control: ReactElement, to: string | undefined): ReactElement {
  if (!to) return control
  return (
    <ScreenLink asChild to={to}>
      {control}
    </ScreenLink>
  )
}

/**
 * Send, with the hint of its key on a computer, where Enter sends the
 * message and Shift+Enter adds a line. Send waits for text and for the
 * reply address. While the send runs, a spinner leads its label. A new
 * press after a failed send tries again.
 */
function SendButton(props: {
  ready: boolean
  sending: boolean
  phone: boolean
  to?: string
}) {
  const { ready, sending } = props
  const key =
    props.phone || sending ? undefined : (
      <CornerDownLeft
        aria-hidden
        className={classes(styles.key, ready && styles.keyOnSolid)}
        size={13}
      />
    )
  const button = (
    <actionButton.Component
      busy={sending}
      disabled={!ready}
      moklyInstance="dialog-send"
      tone={ready ? 'primary' : 'secondary'}
      {...defined({ trailing: key })}
    >
      {sending ? sendingLabel : sendLabel}
    </actionButton.Component>
  )
  return linked(button, ready && !sending ? props.to : undefined)
}

/**
 * The Feedback dialog, drawn open over the page where the palette was: a
 * wide dialog on desktop, and a sheet on a phone. The message box has the
 * focus. Its screenshots show above the text as a row of chips with their
 * names, their sizes, and Remove. Add screenshots opens the file picker,
 * and a paste of an image into the text or a drop on the dialog adds one
 * too. Two lines say what the message also carries and
 * where the team replies. While the read of the reply address runs or
 * after it failed, the draft and Cancel stay available, and Send waits.
 * Cancel closes the dialog and keeps the draft.
 */
export function FeedbackDialog(props: FeedbackDialogProps) {
  const phone = props.viewport === 'mobile'
  const sending = props.sending === true
  const words = props.problem ? problemWords(props.problem) : undefined
  const cancel = (
    <actionButton.Component disabled={sending} moklyInstance="dialog-cancel">
      Cancel
    </actionButton.Component>
  )
  return (
    <confirmDialog.Component
      actions={
        <>
          {linked(cancel, sending ? undefined : paths.shell)}
          <SendButton
            phone={phone}
            ready={props.text !== '' && props.reply.state === 'ready'}
            sending={sending}
            to={props.sendTo}
          />
        </>
      }
      moklyInstance="feedback-dialog"
      title={sendFeedbackLabel}
      viewport={props.viewport}
      wide
    >
      <div className={styles.box}>
        {props.screenshots.length > 0 ? (
          <screenshotRow.Component
            moklyInstance="screenshots"
            screenshots={props.screenshots}
          />
        ) : null}
        <messageField.Component
          lines={shownLines(props.text, phone ? 5 : 6)}
          maxLines={maxLines}
          moklyInstance="feedback-message"
          placeholder={feedbackPlaceholder}
          text={props.text}
        />
        <div className={styles.bar}>
          <actionButton.Component
            disabled={sending}
            icon="image-plus"
            moklyInstance="add-screenshots"
            tone="plain"
          >
            {addScreenshotsLabel}
          </actionButton.Component>
        </div>
      </div>
      {words ? (
        <notice.Component
          body={words.body}
          icon="circle-alert"
          moklyInstance="feedback-problem"
          title={words.title}
          tone="danger"
        />
      ) : null}
      <ul className={classes(styles.facts, phone && styles.phone)}>
        <li className={styles.fact}>
          <Info aria-hidden className={styles.factIcon} size={14} />
          <span>{contextLine}</span>
        </li>
        <replyLine.Component moklyInstance="reply-line" reply={props.reply} />
      </ul>
      <replyFailure.Component
        moklyInstance="reply-failure"
        reply={props.reply}
        {...defined({ retryTo: props.retryTo })}
      />
    </confirmDialog.Component>
  )
}
