import type { ReactNode } from 'react'
import { secretRunWords } from '../../ui/components/chat/secretRunCopy'
import dialog from '../../ui/components/common/ConfirmDialog.module.css'
import { Sheet } from '../../shell/ui/Sheet'
import { ActionButton } from '../ui/actions'
import type { AnswerKind } from './secret-snapshot'

/** The answer that runs, and the two actions of a request. */
interface AnswerProps {
  answering: AnswerKind | null
  deny: () => void
  allow: () => void
}

/** Deny, which sends no value. */
function DenyButton(props: AnswerProps) {
  return (
    <ActionButton
      busy={props.answering === 'deny'}
      disabled={props.answering !== null}
      onPress={props.deny}
    >
      {secretRunWords.deny}
    </ActionButton>
  )
}

/**
 * Allow. A request for secrets of the org says that it allows them for the
 * session. Allow of values stays off until each value is typed.
 */
function AllowButton(props: AnswerProps & { label: string; ready: boolean }) {
  const { answering } = props
  return (
    <ActionButton
      busy={answering === 'allow' || answering === 'values'}
      disabled={answering !== null || !props.ready}
      onPress={props.allow}
      tone="primary"
    >
      {props.label}
    </ActionButton>
  )
}

/** Deny and Allow, as a computer shows them, at the end of the names or under the values. */
export function Answers(
  props: AnswerProps & { values: boolean; ready: boolean },
) {
  return (
    <>
      <DenyButton {...props} />
      <AllowButton
        {...props}
        label={
          props.values ? secretRunWords.allow : secretRunWords.allowSession
        }
      />
    </>
  )
}

/**
 * Deny and Give a value, as a phone shows a request for a value. Give a
 * value opens the sheet of the values.
 */
export function PhoneAnswers(props: AnswerProps & { give: () => void }) {
  return (
    <>
      <DenyButton {...props} />
      <ActionButton
        disabled={props.answering !== null}
        onPress={props.give}
        tone="primary"
      >
        {secretRunWords.giveValue}
      </ActionButton>
    </>
  )
}

/**
 * The sheet that Give a value opens on a phone: each value field, the
 * choice of how long the values last, and Allow. Deny stays on the card. It
 * opens in the layer of the frame, over the whole app, so no card or region
 * cuts it. The first field takes the focus, and a press on the dim page or
 * Escape closes the sheet with the values kept, and the focus goes back to
 * Give a value.
 */
export function ValueSheet(
  props: AnswerProps & {
    ready: boolean
    close: () => void
    children: ReactNode
  },
) {
  return (
    <Sheet close={props.close} title={secretRunWords.giveValue}>
      <div className={dialog.sheetBody}>
        {props.children}
        <div className={dialog.sheetActions}>
          <AllowButton {...props} label={secretRunWords.allow} />
        </div>
      </div>
    </Sheet>
  )
}
