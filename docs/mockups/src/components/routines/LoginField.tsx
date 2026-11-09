import { useId } from 'react'
import { InputFrame } from '@firna/ui/input'
import { CircleAlert, X } from 'lucide-react'
import { acmeMembers, people, type Person } from '../../fixtures/members'
import { noop } from '../../noop'
import { classes } from '../common/classes'
import { Menu, type MenuEntry } from '../common/Menu'
import { useControlSizes } from '../common/touch'
import { PersonAvatar } from '../orgs/OrgTile'
import form from './form.module.css'
import styles from './LoginField.module.css'

/** The members whose name or login holds the typed text, and not listed yet. */
function matches(typed: string, listed: readonly string[]): Person[] {
  const text = typed.toLowerCase()
  return acmeMembers
    .map((membership) => people[membership.person])
    .filter(
      (person) =>
        !listed.includes(person.login) &&
        (person.login.includes(text) ||
          person.name.toLowerCase().includes(text)),
    )
}

function suggestionMenu(members: readonly Person[]): MenuEntry[] {
  return [
    { kind: 'label', label: 'Members of Acme' },
    ...members.map((person, index): MenuEntry => ({
      kind: 'item',
      label: person.name,
      detail: `@${person.login}`,
      mark: <PersonAvatar initials={person.initials} size={18} />,
      highlighted: index === 0,
    })),
  ]
}

/**
 * A list of GitHub logins, as chips with a field that adds one. The field
 * takes any login, such as a bot, and offers the members of the org that
 * match the typed text. A login that names no GitHub account shows its
 * refusal under the list, and its chip is marked.
 */
export function LoginField(props: {
  label: string
  logins: readonly string[]
  hint: string
  /** Text typed in the field, which the suggestions match. */
  typed?: string
  /** A login of the list that names no GitHub account. */
  unknown?: string
}) {
  const id = useId()
  const { field } = useControlSizes()
  const suggestions = props.typed ? matches(props.typed, props.logins) : []
  return (
    <div className={form.field}>
      <span className={form.label} id={`${id}-label`}>
        {props.label}
      </span>
      <div className={styles.anchor}>
        <div
          aria-labelledby={`${id}-label`}
          className={classes(styles.box, props.unknown && styles.invalid)}
          role="group"
        >
          {props.logins.map((login) => (
            <span
              className={classes(
                styles.chip,
                login === props.unknown && styles.unknown,
              )}
              key={login}
            >
              @{login}
              <button
                aria-label={`Remove @${login}`}
                className={styles.remove}
                type="button"
              >
                <X aria-hidden size={12} />
              </button>
            </span>
          ))}
          <span className={styles.entry}>
            <InputFrame
              accessibilityLabel={`Add a login to ${props.label}`}
              focusIndicator="none"
              onChangeText={noop}
              placeholder="Add a GitHub login"
              size={field}
              value={props.typed ?? ''}
              variant="seamless"
            />
          </span>
        </div>
        {suggestions.length > 0 ? (
          <Menu
            entries={suggestionMenu(suggestions)}
            label="Members of Acme"
            placement="below-start"
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
