import type { ReactElement } from 'react'
import type { Viewport } from '@mokly/mokly'
import {
  CircleAlert,
  CornerDownLeft,
  ImagePlus,
  Info,
  Reply,
} from 'lucide-react'
import type { Attachment } from '../../fixtures/attachments'
import { paths } from '../../paths'
import { AttachmentChips } from '../chat/AttachmentChips'
import { MessageField } from '../chat/MessageField'
import { ActionButton } from '../common/actions'
import { classes } from '../common/classes'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { Notice } from '../common/Notice'
import { ScreenLink } from '../common/ScreenLink'
import {
  addScreenshotsLabel,
  contextLine,
  feedbackPlaceholder,
  imageTypesBody,
  noReplyLine,
  notAddedTitle,
  notSentTitle,
  replyLine,
  screenshotLimitBody,
  screenshotsLabel,
  sendFeedbackLabel,
  sendingLabel,
  sendLabel,
} from './feedbackCopy'
import styles from './FeedbackDialog.module.css'

/**
 * What a notice under the message box names: a file that the dialog did
 * not add, because it passes the limit of the screenshots or is of another
 * type, or a send that failed, with the message of the server.
 */
export type FeedbackProblem =
  | { kind: 'too-large'; name: string }
  | { kind: 'other-type'; name: string }
  | { kind: 'not-sent'; message: string }

export type FeedbackDialogProps = {
  text: string
  screenshots: readonly Attachment[]
  /** The primary verified email of the GitHub account, when it has one. */
  replyTo?: string
  problem?: FeedbackProblem
  /** The send runs, so the dialog takes no change and stays open. */
  sending?: boolean
  /** The screen that Send leads to, when the mockups draw it. */
  sendTo?: string
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
 * message and Shift+Enter adds a line. Send waits for text. While the send
 * runs, a spinner leads its label. A new press after a failed send tries
 * again.
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
    <ActionButton
      busy={sending}
      disabled={!ready}
      tone={ready ? 'primary' : 'secondary'}
      trailing={key}
    >
      {sending ? sendingLabel : sendLabel}
    </ActionButton>
  )
  return linked(button, ready && !sending ? props.to : undefined)
}

/**
 * The Feedback dialog, drawn open over the page where the palette was: a
 * wide dialog on desktop, and a sheet on a phone. The message box has the
 * focus. Its screenshots show above the text as chips with their names,
 * their sizes, and Remove, as in every composer. Add screenshots opens the
 * file picker, and a paste of an image into the text or a drop on the
 * dialog adds one too. Two lines say what the message also carries and
 * where the team replies. Cancel closes the dialog and keeps the draft.
 */
export function FeedbackDialog(props: FeedbackDialogProps) {
  const phone = props.viewport === 'mobile'
  const sending = props.sending === true
  const words = props.problem ? problemWords(props.problem) : undefined
  const cancel = <ActionButton disabled={sending}>Cancel</ActionButton>
  return (
    <ConfirmDialog
      actions={
        <>
          {linked(cancel, sending ? undefined : paths.shell)}
          <SendButton
            phone={phone}
            ready={props.text !== ''}
            sending={sending}
            to={props.sendTo}
          />
        </>
      }
      title={sendFeedbackLabel}
      viewport={props.viewport}
      wide
    >
      <div className={styles.box}>
        {props.screenshots.length > 0 ? (
          <AttachmentChips
            attachments={props.screenshots}
            label={screenshotsLabel}
          />
        ) : null}
        <MessageField
          lines={phone ? 5 : 6}
          maxLines={12}
          placeholder={feedbackPlaceholder}
          text={props.text}
        />
        <div className={styles.bar}>
          <ActionButton disabled={sending} icon={ImagePlus} tone="plain">
            {addScreenshotsLabel}
          </ActionButton>
        </div>
      </div>
      {words ? (
        <Notice
          body={words.body}
          icon={CircleAlert}
          title={words.title}
          tone="danger"
        />
      ) : null}
      <ul className={classes(styles.facts, phone && styles.phone)}>
        <li className={styles.fact}>
          <Info aria-hidden className={styles.factIcon} size={14} />
          <span>{contextLine}</span>
        </li>
        <li className={styles.fact}>
          <Reply aria-hidden className={styles.factIcon} size={14} />
          <span>{props.replyTo ? replyLine(props.replyTo) : noReplyLine}</span>
        </li>
      </ul>
    </ConfirmDialog>
  )
}
