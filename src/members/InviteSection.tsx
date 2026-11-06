import { useRef, useState, type Ref } from 'react'
import { CircleAlert, Mail, UserPlus } from 'lucide-react'
import { InputFrame, type InputFrameProps } from '@firna/ui/input'
import {
  normalizeEmail,
  runsAction,
  type MembersState,
  type MembersStore,
} from './membersStore'
import { ActionButton } from './ui/actions'
import { useControlSizes } from './ui/controls'
import { Notice } from './ui/Notice'
import { Section } from './ui/Section'
import styles from './Members.module.css'

type InputHandle =
  NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle>
    ? Handle
    : never

/**
 * The invite of an admin, by email. The person joins when they accept, with
 * a GitHub account that has that email verified. Invite with an empty field
 * moves the focus to the field. One invite runs at a time: while it runs,
 * Enter and Invite send nothing, and the field stays open for the next
 * email. A sent invite joins the list, and it clears the field only when the
 * field still holds the email that went out.
 */
export function InviteSection(props: {
  store: MembersStore
  state: MembersState
}) {
  const { field } = useControlSizes()
  const [email, setEmail] = useState('')
  const input = useRef<InputHandle>(null)
  const { state } = props
  const ready = state.status === 'ready'
  const busy = ready && runsAction(state.pending, 'invite')
  const failure =
    ready && state.failure?.action === 'invite' ? state.failure : null

  async function submit() {
    // The store's state, not the last render, says whether an invite runs.
    const now = props.store.getState()
    if (now.status === 'ready' && runsAction(now.pending, 'invite')) return
    const sent = email
    if (!normalizeEmail(sent)) {
      input.current?.focus()
      return
    }
    if (await props.store.invite(sent)) {
      setEmail((value) => (value === sent ? '' : value))
    }
  }

  return (
    <Section
      description="Invite a person by an email that is verified on their GitHub account. They join when they accept."
      title="Invite a member"
    >
      <div className={styles.invite}>
        <InputFrame
          accessibilityLabel="Email"
          autoCapitalize="none"
          // The field holds the email of another person, not the admin's own.
          autoComplete="off"
          autoCorrect={false}
          inputMode="email"
          inputRef={input}
          onChangeText={setEmail}
          onSubmitEditing={() => void submit()}
          placeholder="Email"
          prefixIcon={Mail}
          size={field}
          spellCheck={false}
          value={email}
        />
        <ActionButton
          busy={busy}
          disabled={!ready}
          icon={UserPlus}
          onPress={() => void submit()}
        >
          Invite
        </ActionButton>
      </div>
      {failure ? (
        <Notice
          body={failure.message}
          icon={CircleAlert}
          title={`The invite to ${failure.target} failed`}
          tone="danger"
        />
      ) : null}
    </Section>
  )
}
