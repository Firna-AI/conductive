import type { Viewport } from '@mokly/mokly'
import { Ban, Plus } from 'lucide-react'
import { Input } from '@firna/ui/input'
import { newCode } from '../../fixtures/operatorCodes'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { InlineText } from '../common/InlineText'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { disableCodeWords, newCodeWords } from './codeCopy'

/**
 * New code: the operator gives a label and a use limit, and the app makes
 * the code at random.
 */
export function NewCodeDialog(props: { viewport: Viewport }) {
  const { field } = useControlSizes()
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={paths.operatorCodes}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={paths.operatorCodesMade}>
            <ActionButton icon={Plus} tone="primary">
              {newCodeWords.make}
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={newCodeWords.title}
      viewport={props.viewport}
    >
      <DialogText>{newCodeWords.text}</DialogText>
      <Input
        hint={newCodeWords.labelHint}
        label={newCodeWords.label}
        onChangeText={noop}
        size={field}
        value={newCode.label}
      />
      <Input
        hint={newCodeWords.limitHint}
        inputMode="numeric"
        label={newCodeWords.limit}
        onChangeText={noop}
        size={field}
        value={String(newCode.limit)}
      />
    </ConfirmDialog>
  )
}

/**
 * The operator confirms the disable of a code. The question names the
 * code, says that the people who used it keep their app access, and says
 * that Disable is final. For an invite code it names what to do instead.
 */
export function DisableCodeDialog(props: {
  title: string
  code: string
  used: number
  kind: 'invite' | 'referral'
  viewport: Viewport
  /** The page that Cancel returns to, and the page after the disable. */
  cancel: string
  done: string
}) {
  return (
    <ConfirmDialog
      actions={
        <>
          <ScreenLink asChild to={props.cancel}>
            <ActionButton>Cancel</ActionButton>
          </ScreenLink>
          <ScreenLink asChild to={props.done}>
            <ActionButton icon={Ban} tone="danger">
              {disableCodeWords.action}
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={props.title}
      viewport={props.viewport}
    >
      <DialogText>
        <InlineText text={disableCodeWords.stops(props.code)} />{' '}
        {disableCodeWords.keeps(props.used)}
      </DialogText>
      <DialogText>{disableCodeWords.final(props.kind)}</DialogText>
    </ConfirmDialog>
  )
}
