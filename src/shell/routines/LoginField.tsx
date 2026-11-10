import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react'
import { InputFrame, type InputFrameProps } from '@firna/ui/input'
import { Users, X } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import menu from '../../../docs/mockups/src/components/common/Menu.module.css'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import form from '../../../docs/mockups/src/components/routines/form.module.css'
import styles from '../../../docs/mockups/src/components/routines/LoginField.module.css'
import { personName } from '../../app/people'
import type { User } from '../../shared/api'
import { PersonAvatar } from '../ui/Avatars'
import ui from '../ui/ui.module.css'

type InputHandle =
  NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle>
    ? Handle
    : never

/** The entry of "Author is" that stands for every member of the org. */
export interface MembersEntry {
  label: string
  listed: boolean
  add: () => void
  remove: () => void
}

interface Suggestion {
  key: string
  label: string
  detail: string
  member: User | null
  choose: () => void
}

/**
 * The suggestions for the typed text: the entry of every member first,
 * then each member whose login or name holds the text, and who is not
 * listed yet. An empty text offers each of them.
 */
function suggestionsFor(
  typed: string,
  logins: readonly string[],
  members: readonly User[],
  entry: MembersEntry | undefined,
  add: (login: string) => void,
): Suggestion[] {
  const text = typed.trim().replace(/^@/, '').toLowerCase()
  const listed = new Set(logins.map((login) => login.toLowerCase()))
  const people = members
    .filter(
      (member) =>
        !listed.has(member.githubLogin.toLowerCase()) &&
        (member.githubLogin.toLowerCase().includes(text) ||
          personName(member).toLowerCase().includes(text)),
    )
    .map((member) => ({
      key: member.id,
      label: personName(member),
      detail: `@${member.githubLogin}`,
      member,
      choose: () => add(member.githubLogin),
    }))
  if (!entry || entry.listed || !entry.label.toLowerCase().includes(text)) {
    return people
  }
  const everyone = {
    key: 'members',
    label: entry.label,
    detail: 'Every member',
    member: null,
    choose: entry.add,
  }
  return [everyone, ...people]
}

function Chip(props: { label: string; group?: boolean; remove: () => void }) {
  return (
    <span className={classes(styles.chip, props.group && styles.group)}>
      {props.group ? <Users aria-hidden size={12} /> : null}
      {props.label}
      <button
        aria-label={`Remove ${props.label}`}
        className={styles.remove}
        onClick={props.remove}
        type="button"
      >
        <X aria-hidden size={12} />
      </button>
    </span>
  )
}

/** The items of the open suggestions, which the arrow keys move between. */
function items(list: HTMLElement | null): HTMLElement[] {
  return Array.from(list?.querySelectorAll<HTMLElement>('button') ?? [])
}

/**
 * A list of GitHub logins, as chips with a field that adds one. Enter adds
 * the typed login, such as a bot. While the field has the focus, it offers
 * the members of the org, and the arrow keys reach them. A list of authors
 * can also hold the entry for every member.
 */
export function LoginField(props: {
  label: string
  hint: string
  logins: readonly string[]
  add: (login: string) => void
  remove: (login: string) => void
  members: readonly User[]
  entry?: MembersEntry
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
        onFocus={() => setFocused(true)}
        onKeyDown={keys}
      >
        <div
          aria-labelledby={`${id}-label`}
          className={styles.box}
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
          <div
            aria-label={`Suggestions for ${props.label}`}
            className={classes(menu.menu, menu['below-start'])}
            ref={list}
            role="menu"
          >
            {suggestions.map((suggestion, index) => (
              <div className={ui.contents} key={suggestion.key}>
                {index === 1 && suggestions[0].member === null ? (
                  <hr className={menu.divider} />
                ) : null}
                <button
                  className={classes(menu.item, ui.plainButton, ui.menuItem)}
                  onClick={() => {
                    suggestion.choose()
                    finish()
                  }}
                  // A press keeps the focus in the field, as some browsers
                  // do not focus a button that the pointer presses.
                  onMouseDown={(event) => event.preventDefault()}
                  role="menuitem"
                  tabIndex={-1}
                  type="button"
                >
                  {suggestion.member ? (
                    <span className={menu.mark}>
                      <PersonAvatar person={suggestion.member} size={18} />
                    </span>
                  ) : (
                    <Users aria-hidden className={menu.icon} size={14} />
                  )}
                  <span className={menu.label}>{suggestion.label}</span>
                  <span className={menu.detail}>{suggestion.detail}</span>
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <p className={form.hint}>{props.hint}</p>
    </div>
  )
}
