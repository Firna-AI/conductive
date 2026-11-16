import { useId } from 'react'
import { InputFrame } from '@firna/ui/input'
import { CircleAlert, Users, X } from 'lucide-react'
import { acmeMembers, people, type Person } from '../../fixtures/members'
import { noop } from '../../noop'
import { classes } from '../common/classes'
import { Menu, type MenuEntry } from '../common/Menu'
import { useControlSizes } from '../common/touch'
import { PersonAvatar } from '../orgs/OrgTile'
import form from './form.module.css'
import styles from './LoginField.module.css'

/** The entry that stands for every member, and whether the list holds it. */
type Group = { label: string; listed: boolean }

const divider: MenuEntry = { kind: 'divider' }

/** The members whose name or login holds the text, and not listed yet. */
function matches(text: string, listed: readonly string[]): Person[] {
  return acmeMembers
    .map((membership) => people[membership.person])
    .filter(
      (person) =>
        !listed.includes(person.login) &&
        (person.login.includes(text) ||
          person.name.toLowerCase().includes(text)),
    )
}

/**
 * The suggestions for the typed text: the entry of every member first,
 * then each member that matches. An empty text offers each of them.
 */
function suggestionMenu(
  typed: string,
  logins: readonly string[],
  group?: Group,
): MenuEntry[] {
  const text = typed.toLowerCase()
  const members = matches(text, logins).map((person): MenuEntry => ({
    kind: 'item',
    label: person.name,
    detail: `@${person.login}`,
    mark: <PersonAvatar initials={person.initials} size={18} />,
  }))
  if (
    group === undefined ||
    group.listed ||
    !group.label.toLowerCase().includes(text)
  ) {
    return members
  }
  return [
    {
      kind: 'item',
      label: group.label,
      detail: 'Every member',
      icon: Users,
      highlighted: true,
    },
    ...(members.length > 0 ? [divider] : []),
    ...members,
  ]
}

function Chip(props: { label: string; unknown?: boolean; group?: boolean }) {
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
      <button
        aria-label={`Remove ${props.label}`}
        className={styles.remove}
        type="button"
      >
        <X aria-hidden size={12} />
      </button>
    </span>
  )
}

/**
 * A list of GitHub logins, as chips with a field that adds one. The field
 * takes any login, such as a bot, and offers the members of the org. A
 * list of authors can also hold one entry for every member. A login that
 * names no GitHub account shows its refusal, and its chip is marked.
 */
export function LoginField(props: {
  label: string
  logins: readonly string[]
  hint: string
  /** Text typed in the field. An empty text is a field with the focus. */
  typed?: string
  /** A login of the list that names no GitHub account. */
  unknown?: string
  /** The entry that stands for every member, in a list of authors. */
  group?: Group
}) {
  const id = useId()
  const { field } = useControlSizes()
  const suggestions =
    props.typed === undefined
      ? []
      : suggestionMenu(props.typed, props.logins, props.group)
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
          {props.group?.listed ? (
            <Chip group label={props.group.label} />
          ) : null}
          {props.logins.map((login) => (
            <Chip
              key={login}
              label={`@${login}`}
              unknown={login === props.unknown}
            />
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
            entries={suggestions}
            label="Suggestions"
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
