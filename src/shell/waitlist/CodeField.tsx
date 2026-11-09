import { useRef, useState, type Ref } from 'react'
import { InputFrame, type InputFrameProps } from '@firna/ui/input'
import { CircleAlert, CirclePause } from 'lucide-react'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import forms from '../../../docs/mockups/src/screens/forms.module.css'
import styles from '../../../docs/mockups/src/screens/WaitlistScreen.module.css'
import { waitlistCopy as copy } from '../../../docs/mockups/src/screens/waitlistCopy'
import type { CodeUse, Opener } from '../../app/waitlist-state'
import { useApp } from '../context'
import { ActionButton } from '../ui/actions'

type InputHandle =
  NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle>
    ? Handle
    : never

/** The title of a link whose code the app could not use, such as offline. */
const linkNotUsed = "Your invite code wasn't used"

/**
 * The notice above the field: the pause, which leaves the code unused, or
 * the code of a join link that did not work. A typed code that did not
 * work shows its reason under the field instead.
 */
export function CodeNotice(props: { code: CodeUse }) {
  const { code } = props
  if (code.state === 'failed') {
    if (code.from === 'field') return null
    return (
      <Notice
        body={code.error.message}
        icon={CircleAlert}
        title={linkNotUsed}
        tone="danger"
      />
    )
  }
  if (code.state !== 'refused') return null
  const { reason } = code
  if (reason === 'paused') {
    return (
      <Notice
        body={code.from === 'link' ? copy.paused.link : copy.paused.typed}
        icon={CirclePause}
        title={copy.paused.title}
      />
    )
  }
  if (code.from === 'field') return null
  const text = copy.link[reason]
  return (
    <Notice
      body={text.body}
      icon={CircleAlert}
      title={text.title}
      tone="danger"
    />
  )
}

/** Why a typed code did not work, under the field, or nothing. */
function fieldError(code: CodeUse): string | null {
  if (code.state === 'failed') {
    return code.from === 'field' ? code.error.message : null
  }
  if (code.state !== 'refused' || code.from !== 'field') return null
  const { reason } = code
  return reason === 'paused' ? null : copy.typed[reason]
}

/**
 * The field of an invite code, with Use code. A code that works lets the
 * person in, and the app opens as usual. A typed code keeps its text
 * after it did not work, so the person can fix it. Use code with an empty
 * field moves the focus to the field, and sends nothing. Most people who
 * wait have no code, so Use code is not the main action.
 */
export function CodeField(props: { code: CodeUse; open: Opener }) {
  const { waitlist } = useApp()
  const { field } = useControlSizes()
  const [text, setText] = useState('')
  const input = useRef<InputHandle>(null)
  const error = fieldError(props.code)
  const submit = () => {
    const code = text.trim()
    if (code === '') {
      input.current?.focus()
      return
    }
    void waitlist.submitCode(code, props.open)
  }
  return (
    <div className={forms.field}>
      <span className={forms.fieldLabel}>{copy.codeLabel}</span>
      <div className={styles.row}>
        <InputFrame
          accessibilityLabel={copy.codeLabel}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect={false}
          inputRef={input}
          invalid={error !== null}
          onChangeText={setText}
          onSubmitEditing={submit}
          placeholder={copy.codePlaceholder}
          size={field}
          spellCheck={false}
          value={text}
        />
        <ActionButton busy={props.code.state === 'using'} onPress={submit}>
          {copy.useCode}
        </ActionButton>
      </div>
      {error === null ? null : (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
