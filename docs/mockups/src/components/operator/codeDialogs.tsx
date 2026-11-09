import type { Viewport } from '@mokly/mokly'
import { Ban, Plus } from 'lucide-react'
import { Input } from '@firna/ui/input'
import { productName } from '../../brand'
import { newCode } from '../../fixtures/operatorCodes'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ConfirmDialog, DialogText } from '../common/ConfirmDialog'
import { InlineText } from '../common/InlineText'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'

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
              Make code
            </ActionButton>
          </ScreenLink>
        </>
      }
      title="New invite code"
      viewport={props.viewport}
    >
      <DialogText>
        {productName} makes the code at random. Copy it from the list to share
        it.
      </DialogText>
      <Input
        hint="Only operators see it."
        label="Label"
        onChangeText={noop}
        size={field}
        value={newCode.label}
      />
      <Input
        hint="How many people the code lets in."
        inputMode="numeric"
        label="Use limit"
        onChangeText={noop}
        size={field}
        value={String(newCode.limit)}
      />
    </ConfirmDialog>
  )
}

/** Who keeps their app access after a disable. */
function keeps(used: number): string {
  if (used === 0) return 'Nobody has used it yet.'
  if (used === 1) return 'The person who used it keeps their app access.'
  return `The ${used} people who used it keep their app access.`
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
              Disable code
            </ActionButton>
          </ScreenLink>
        </>
      }
      title={props.title}
      viewport={props.viewport}
    >
      <DialogText>
        <InlineText text={`\`${props.code}\` stops working now.`} />{' '}
        {keeps(props.used)}
      </DialogText>
      <DialogText>
        {props.kind === 'invite'
          ? 'Disable is final. To share a code again, make a new one.'
          : 'Disable is final.'}
      </DialogText>
    </ConfirmDialog>
  )
}
