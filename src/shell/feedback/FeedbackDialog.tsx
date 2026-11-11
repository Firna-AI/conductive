import { useRef, type ClipboardEvent } from 'react'
import { useToast } from '@firna/ui/toast'
import { CircleAlert, CornerDownLeft, ImagePlus } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import {
  addScreenshotsLabel,
  feedbackPlaceholder,
  imageTypesBody,
  notAddedTitle,
  notSentTitle,
  screenshotLimitBody,
  sendFeedbackLabel,
  sendingLabel,
  sendLabel,
  sentToastTitle,
} from '../../../docs/mockups/src/components/feedback/feedbackCopy'
import styles from '../../../docs/mockups/src/components/feedback/FeedbackDialog.module.css'
import {
  screenshotIntake,
  type RefusedScreenshot,
} from '../../app/screenshots/screenshot-intake'
import { useStore } from '../../app/store'
import { ChipTextField } from '../../chat/components/chip-field/ChipTextField'
import type { FieldHandle } from '../../chat/components/chip-field/focus-plugins'
import { useSendKey } from '../../chat/components/send-key'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'
import { Dialog } from '../ui/Dialog'
import ui from '../ui/ui.module.css'
import { useViewport } from '../ui/viewport'
import { FeedbackFacts } from './FeedbackFacts'
import { pastedFiles, useScreenshotDrop } from './screenshot-input'
import { ScreenshotChips } from './ScreenshotChips'

/** The four image types, which the file picker offers. The bytes decide. */
const imageTypes = 'image/png,image/jpeg,image/gif,image/webp'

/** The notice of a file that the dialog did not add. It gives no size. */
function RefusalNotice(props: { refusal: RefusedScreenshot }) {
  const { refusal } = props
  return (
    <Notice
      body={
        refusal.reason === 'too-large' ? screenshotLimitBody : imageTypesBody
      }
      icon={CircleAlert}
      title={notAddedTitle(refusal.name)}
      tone="danger"
    />
  )
}

/**
 * Send, with the hint of its key on a computer, where Enter sends and
 * Shift+Enter adds a line. While the send runs, a spinner leads "Sending".
 */
function SendButton(props: {
  ready: boolean
  sending: boolean
  phone: boolean
  send: () => void
}) {
  const on = props.ready || props.sending
  const key =
    props.phone || props.sending ? undefined : (
      <CornerDownLeft
        aria-hidden
        className={classes(styles.key, on && styles.keyOnSolid)}
        size={13}
      />
    )
  return (
    <ActionButton
      busy={props.sending}
      disabled={!on}
      onPress={props.send}
      tone={on ? 'primary' : 'secondary'}
      trailing={key}
    >
      {props.sending ? sendingLabel : sendLabel}
    </ActionButton>
  )
}

/**
 * The Feedback dialog over the page where the palette opened it: the wide
 * dialog of the app on desktop, and a sheet on a phone, as the mockups draw
 * it. The message box takes the focus and follows the send key of every
 * composer. Its screenshots sit above its text, and Add screenshots under
 * it. A paste of an image into the box, or a drop on the window, adds a
 * screenshot too. Send waits for text, for the reply address, and for the
 * screenshots that the intake still reads. While a send runs, the dialog
 * stays open and takes no change. A close keeps the draft. After a send,
 * the dialog closes and a toast thanks the person.
 */
export function FeedbackDialog() {
  const app = useApp()
  const model = app.feedback
  const intake = screenshotIntake(app)
  const state = useStore(model.state)
  const taken = useStore(intake.state)
  const { toast } = useToast()
  const phone = useViewport() === 'phone'
  const message = useRef<FieldHandle>(null)
  const picker = useRef<HTMLInputElement>(null)
  const sending = state.send.state === 'sending'
  const ready = model.canSend && taken.pending === 0
  const add = (files: readonly File[]) => {
    if (files.length > 0) void intake.add(files)
  }
  const send = () => {
    if (!ready) return
    void model.send().then((sent) => {
      if (!sent) return
      intake.clearRefused()
      toast({ title: sentToastTitle, tone: 'success' })
    })
  }
  const sendKey = useSendKey(ready, send)
  useScreenshotDrop(!sending, add)
  const close = () => model.close()
  const paste = (event: ClipboardEvent) => {
    const files = pastedFiles(event.clipboardData)
    if (files.length === 0) return
    event.preventDefault()
    event.stopPropagation()
    if (!sending) add(files)
  }
  return (
    <Dialog
      actions={
        <>
          <ActionButton disabled={sending} onPress={close}>
            Cancel
          </ActionButton>
          <SendButton
            phone={phone}
            ready={ready}
            send={send}
            sending={sending}
          />
        </>
      }
      close={close}
      initial={message}
      title={sendFeedbackLabel}
      wide
    >
      <div className={styles.box} onPasteCapture={paste}>
        {state.draft.screenshots.length > 0 ? (
          <ScreenshotChips
            onRemove={(id) => model.removeScreenshot(id)}
            screenshots={state.draft.screenshots}
          />
        ) : null}
        <ChipTextField
          caretAtEnd
          editable={!sending}
          handle={message}
          label="Message"
          lines={phone ? 5 : 6}
          maxLines={12}
          onChangeText={(text) => model.setText(text)}
          onEnter={sendKey}
          owner={model}
          placeholder={feedbackPlaceholder}
          value={state.draft.text}
        />
        <div className={styles.bar}>
          <ActionButton
            disabled={sending}
            icon={ImagePlus}
            onPress={() => picker.current?.click()}
            tone="plain"
          >
            {addScreenshotsLabel}
          </ActionButton>
          <input
            accept={imageTypes}
            className={ui.hidden}
            multiple
            onChange={(event) => {
              const chosen = Array.from(event.currentTarget.files ?? [])
              event.currentTarget.value = ''
              add(chosen)
            }}
            ref={picker}
            tabIndex={-1}
            type="file"
          />
        </div>
      </div>
      {taken.refused.map((refusal, index) => (
        <RefusalNotice key={`${index}:${refusal.name}`} refusal={refusal} />
      ))}
      {state.send.state === 'failed' ? (
        <Notice
          body={state.send.error.message}
          icon={CircleAlert}
          title={notSentTitle}
          tone="danger"
        />
      ) : null}
      <FeedbackFacts
        phone={phone}
        readReply={() => model.readReply()}
        reply={state.reply}
      />
    </Dialog>
  )
}
