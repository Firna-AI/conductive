import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react'
import { InputFrame, type InputFrameProps } from '@firna/ui/input'
import { CircleAlert, Users, X } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import form from '../../../docs/mockups/src/components/routines/form.module.css'
import styles from '../../../docs/mockups/src/components/routines/LoginField.module.css'
import type { User } from '../../shared/api'
import ui from '../ui/ui.module.css'
import {
  items,
  SuggestionMenu,
  suggestionsFor,
  type MembersEntry,
} from './LoginSuggestions'

type InputHandle =
  NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle>
    ? Handle
    : never

function Chip(props: {
  label: string
  group?: boolean
  unknown?: boolean
  remove: () => void
}) {
  return (
    <span
      className={classes(
        styles.chip,
        props.group && styles.group,
        props.unknown && styles.unknown,
      )}
    >
      {props.group ? <Users aria-hidden size={12} /> : null}
      {props.label}
      {props.unknown ? (
        <span className={ui.hidden}>, not found on GitHub</span>
      ) : null}
      <button
        aria-label={`Remove ${props.label}`}
        className={styles.remove}
        // A sheet that opens on a refused login puts the focus here, where
        // it opens no suggestions over the refusal.
        data-autofocus={props.unknown || undefined}
        onClick={props.remove}
        type="button"
      >
        <X aria-hidden size={12} />
      </button>
    </span>
  )
}

/**
 * A list of GitHub logins, as chips with a field that adds one. Enter adds
 * the typed login, such as a bot. While its text box or a suggestion has
 * the focus, it offers the members of the org, and the arrow keys reach
 * them. The Remove button of a chip opens no suggestions, so a sheet that
 * opens on it keeps the line under the list in view. A list of authors
 * can also hold the entry for every member. A login that a save refused,
 * because no GitHub account has it, marks its chip, and its refusal shows
 * in place of the hint.
 */
export function LoginField(props: {
  label: string
  hint: string
  logins: readonly string[]
  add: (login: string) => void
  remove: (login: string) => void
  members: readonly User[]
  entry?: MembersEntry
  /** A login of the list that no GitHub account has. */
  unknown: string | null
}) {
  const id = useId()
  const { field } = useControlSizes()
  const [typed, setTyped] = useState('')
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const input = useRef<InputHandle>(null)
  const list = useRef<HTMLDivElement>(null)
  const suggestions = suggestionsFor(
    typed,
    props.logins,
    props.members,
    props.entry,
    props.add,
  )
  const open = focused && !dismissed && suggestions.length > 0
  const unknown = props.unknown?.toLowerCase()
  const finish = () => {
    setTyped('')
    setDismissed(false)
    input.current?.focus()
  }
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    const choices = items(list.current)
    const at = choices.findIndex((item) => item === document.activeElement)
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setDismissed(true)
      input.current?.focus()
    } else if (event.key === 'ArrowDown' && open) {
      event.preventDefault()
      choices[at + 1 < choices.length ? at + 1 : 0]?.focus()
    } else if (event.key === 'ArrowUp' && open && at >= 0) {
      event.preventDefault()
      if (at === 0) input.current?.focus()
      else choices[at - 1]?.focus()
    }
  }
  // The text box and the suggestions offer the members. A chip does not.
  const offers = (target: EventTarget) =>
    target instanceof HTMLInputElement ||
    (target instanceof Node && (list.current?.contains(target) ?? false))
  const blur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
      setFocused(false)
      setDismissed(false)
    }
  }
  return (
    <div className={form.field}>
      <span className={form.label} id={`${id}-label`}>
        {props.label}
      </span>
      <div
        className={styles.anchor}
        onBlur={blur}
        onFocus={(event) => setFocused(offers(event.target))}
        onKeyDown={keys}
      >
        <div
          aria-labelledby={`${id}-label`}
          className={classes(
            styles.box,
            unknown !== undefined && styles.invalid,
          )}
          role="group"
        >
          {props.entry?.listed ? (
            <Chip group label={props.entry.label} remove={props.entry.remove} />
          ) : null}
          {props.logins.map((login) => (
            <Chip
              key={login}
              label={`@${login}`}
              remove={() => props.remove(login)}
              unknown={login.toLowerCase() === unknown}
            />
          ))}
          <span className={styles.entry}>
            <InputFrame
              accessibilityLabel={`Add a login to ${props.label}`}
              autoCapitalize="none"
              autoCorrect={false}
              focusIndicator="none"
              inputRef={input}
              onChangeText={(text) => {
                setTyped(text)
                setDismissed(false)
              }}
              onSubmitEditing={() => {
                if (typed.trim() === '') return
                props.add(typed)
                finish()
              }}
              placeholder="Add a GitHub login"
              size={field}
              spellCheck={false}
              value={typed}
              variant="seamless"
            />
          </span>
        </div>
        {open ? (
          <SuggestionMenu
            choose={(suggestion) => {
              suggestion.choose()
              finish()
            }}
            label={props.label}
            ref={list}
            suggestions={suggestions}
          />
        ) : null}
      </div>
      {props.unknown ? (
        <p className={form.error} role="alert">
          <CircleAlert aria-hidden className={form.errorIcon} size={12} />
          {`No GitHub account is named ${props.unknown}. Check the spelling, then save.`}
        </p>
      ) : (
        <p className={form.hint}>{props.hint}</p>
      )}
    </div>
  )
}
