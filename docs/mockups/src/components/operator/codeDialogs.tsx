import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { Input } from '@firna/ui/input'
import { newCode } from '../../fixtures/operatorCodes'
import { noop } from '../../../../../src/ui/noop'
import { paths } from '../../paths'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  confirmDialog,
  dialogText,
} from '../../entries/components/common/ConfirmDialog.mockup'
import { inlineText } from '../../entries/components/common/InlineText.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import {
  disableCodeWords,
  newCodeWords,
} from '../../../../../src/ui/components/operator/codeCopy'

/**
 * New code: the operator gives a label and a use limit, and the app makes
 * the code at random.
 */
export function NewCodeDialog(props: { viewport: Viewport }) {
  const { field } = useControlSizes()
  return (
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={paths.operatorCodes}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={paths.operatorCodesMade}>
            <actionButton.Component
              icon="plus"
              moklyInstance="dialog-make-code"
              tone="primary"
            >
              {newCodeWords.make}
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="new-code-dialog"
      title={newCodeWords.title}
      viewport={props.viewport}
    >
      <dialogText.Component>{newCodeWords.text}</dialogText.Component>
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
    </confirmDialog.Component>
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
    <confirmDialog.Component
      actions={
        <>
          <ScreenLink asChild to={props.cancel}>
            <actionButton.Component moklyInstance="dialog-cancel">
              Cancel
            </actionButton.Component>
          </ScreenLink>
          <ScreenLink asChild to={props.done}>
            <actionButton.Component
              icon="ban"
              moklyInstance="dialog-disable-code"
              tone="danger"
            >
              {disableCodeWords.action}
            </actionButton.Component>
          </ScreenLink>
        </>
      }
      moklyInstance="disable-code-dialog"
      title={props.title}
      viewport={props.viewport}
    >
      <dialogText.Component moklyInstance="what-stops">
        <inlineText.Component text={disableCodeWords.stops(props.code)} />{' '}
        {disableCodeWords.keeps(props.used)}
      </dialogText.Component>
      <dialogText.Component moklyInstance="disable-is-final">
        {disableCodeWords.final(props.kind)}
      </dialogText.Component>
    </confirmDialog.Component>
  )
}
