import { useState } from 'react'
import { Ban, CircleAlert, Plus } from 'lucide-react'
import { Input } from '@firna/ui/input'
import { InlineText } from '../../../docs/mockups/src/components/common/InlineText'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import {
  disableCodeWords,
  newCodeWords,
} from '../../../docs/mockups/src/components/operator/codeCopy'
import type {
  CreateOperatorCodeRequest,
  OperatorAccessCode,
} from '../../shared/operator-waitlist'
import { ActionButton } from '../ui/actions'
import { Dialog, DialogText } from '../ui/Dialog'
import { codeName } from './CodeParts'
import { useQuestion } from './useQuestion'

/** The longest label that the Worker takes. */
const LABEL_LENGTH = 80

/** The use limit that a field holds: a whole number of 1 or more, or `null`. */
function useLimitOf(text: string): number | null {
  const value = text.trim()
  if (!/^\d+$/.test(value)) return null
  const limit = Number(value)
  return limit >= 1 ? limit : null
}

/**
 * New code: the operator gives a label and a use limit, and the app makes
 * the code at random. Make code stays off until the label holds text and
 * the use limit is a whole number of 1 or more. A refusal shows in the
 * dialog, and the dialog stays open.
 */
export function NewCodeDialog(props: {
  make: (request: CreateOperatorCodeRequest) => Promise<void>
  close: () => void
}) {
  const { field } = useControlSizes()
  const [label, setLabel] = useState('')
  const [limit, setLimit] = useState('')
  const useLimit = useLimitOf(limit)
  const named = label.trim()
  const make = useQuestion(props.make, props.close)
  const submit = () => {
    if (named === '' || useLimit === null || make.pending) return
    make.run({ label: named, useLimit })
  }
  return (
    <Dialog
      actions={
        <>
          <ActionButton disabled={make.pending} onPress={make.dismiss}>
            Cancel
          </ActionButton>
          <ActionButton
            busy={make.pending}
            disabled={named === '' || useLimit === null}
            icon={Plus}
            onPress={submit}
            tone="primary"
          >
            {newCodeWords.make}
          </ActionButton>
        </>
      }
      close={make.dismiss}
      title={newCodeWords.title}
    >
      <DialogText>{newCodeWords.text}</DialogText>
      <Input
        editable={!make.pending}
        hint={newCodeWords.labelHint}
        label={newCodeWords.label}
        maxLength={LABEL_LENGTH}
        onChangeText={setLabel}
        onSubmitEditing={submit}
        size={field}
        value={label}
      />
      <Input
        editable={!make.pending}
        hint={newCodeWords.limitHint}
        inputMode="numeric"
        label={newCodeWords.limit}
        onChangeText={setLimit}
        onSubmitEditing={submit}
        size={field}
        value={limit}
      />
      {make.error ? (
        <Notice
          body={make.error.message}
          icon={CircleAlert}
          title="The code wasn't made"
          tone="danger"
        />
      ) : null}
    </Dialog>
  )
}

/**
 * The operator confirms the disable of a code. The question names the
 * code, says that the people who used it keep their app access, and says
 * that Disable is final. For an invite code it says what to do instead. A
 * failed disable shows its error, and the question stays open.
 */
export function DisableCodeDialog(props: {
  code: OperatorAccessCode
  disable: () => Promise<void>
  close: () => void
}) {
  const { code } = props
  const name = codeName(code)
  const disable = useQuestion(props.disable, props.close)
  return (
    <Dialog
      actions={
        <>
          <ActionButton disabled={disable.pending} onPress={disable.dismiss}>
            Cancel
          </ActionButton>
          <ActionButton
            busy={disable.pending}
            icon={Ban}
            onPress={() => disable.run()}
            tone="danger"
          >
            {disableCodeWords.action}
          </ActionButton>
        </>
      }
      close={disable.dismiss}
      title={disableCodeWords.title(name)}
    >
      <DialogText>
        <InlineText text={disableCodeWords.stops(code.code)} />{' '}
        {disableCodeWords.keeps(code.uses)}
      </DialogText>
      <DialogText>{disableCodeWords.final(code.kind)}</DialogText>
      {disable.error ? (
        <Notice
          body={disable.error.message}
          icon={CircleAlert}
          title={`${code.code} wasn't disabled`}
          tone="danger"
        />
      ) : null}
    </Dialog>
  )
}
