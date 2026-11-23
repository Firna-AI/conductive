import {
  useContext,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import card from '../../ui/components/common/ModalCard.module.css'
import { controlsOf, tabWithScrollingBody } from '../../shell/ui/tab-stops'
import ui from '../../shell/ui/ui.module.css'
import { ActionButton } from './actions'
import { useViewport } from './controls'
import { DialogClose, useModalDialog } from './modal'
import { Sheet } from './Sheet'
import styles from './ConfirmDialog.module.css'

type ConfirmDialogProps = {
  title: string
  /** The confirming action runs. */
  busy: boolean
  onCancel: () => void
  children: ReactNode
  /** The confirming action. Cancel comes before it. */
  action: ReactNode
}

/**
 * A question that the user confirms before an action. Desktop shows a
 * dialog over the dimmed app, and a phone shows a sheet. The actions come
 * last: Cancel, then the confirming action at the end.
 *
 * Cancel, Escape, a press on the dimmed page, and a close by the browser
 * ask to cancel in one way. While `busy`, the question refuses and stays
 * open, so the result or the error of the action shows in it. After an
 * action that worked, the caller closes the question.
 *
 * A desktop question taller than the room of the window keeps its title
 * and its actions, and its content scrolls between them. While that
 * content is text without a control, Tab stops on it too, in each browser,
 * so the keys of the keyboard scroll it. It never takes the first focus.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const viewport = useViewport()
  const actions = (
    <>
      <CancelButton />
      {props.action}
    </>
  )
  if (viewport === 'mobile') {
    return (
      <Sheet busy={props.busy} onDismiss={props.onCancel} title={props.title}>
        <div className={styles.sheetBody}>
          {props.children}
          <div className={styles.sheetActions}>{actions}</div>
        </div>
      </Sheet>
    )
  }
  return (
    <DesktopDialog
      actions={actions}
      busy={props.busy}
      onCancel={props.onCancel}
      title={props.title}
    >
      {props.children}
    </DesktopDialog>
  )
}

/** Cancel asks the dialog around it to close, in the same way as Escape. */
function CancelButton() {
  const close = useContext(DialogClose)
  return <ActionButton onPress={() => void close()}>Cancel</ActionButton>
}

function DesktopDialog(
  props: Omit<ConfirmDialogProps, 'action'> & { actions: ReactNode },
) {
  const ref = useRef<HTMLDialogElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const { dismiss, onCancel, onClick } = useModalDialog(
    ref,
    props.onCancel,
    props.busy,
  )
  // The browser leaves the body out of Tab, as the code alone focuses it.
  // So while it scrolls text, the question moves each Tab itself.
  const tabThroughBody = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return
    tabWithScrollingBody(event, controlsOf(event.currentTarget), body.current)
  }
  const titleId = useId()
  return (
    <dialog
      aria-labelledby={titleId}
      className={`${styles.layer} ${card.topLayer}`}
      onCancel={onCancel}
      onClick={onClick}
      onKeyDownCapture={tabThroughBody}
      ref={ref}
    >
      <div className={`${styles.dialog} ${card.card}`}>
        <h2 className={`${styles.title} ${card.head}`} id={titleId}>
          {props.title}
        </h2>
        <DialogClose value={dismiss}>
          {/*
           * Only the code focuses the body, so `useModalDialog` keeps the
           * first focus of the browser off it.
           */}
          <div
            className={`${styles.body} ${card.body} ${ui.focusable}`}
            data-skip-first-focus
            ref={body}
            tabIndex={-1}
          >
            {props.children}
          </div>
          <div className={`${styles.actions} ${card.foot}`}>
            {props.actions}
          </div>
        </DialogClose>
      </div>
    </dialog>
  )
}

/** A paragraph of a dialog. */
export function DialogText(props: { children: ReactNode }) {
  return <p className={styles.text}>{props.children}</p>
}
