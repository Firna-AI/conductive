import type { Ref } from 'react'
import { Users } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import menu from '../../../docs/mockups/src/components/common/Menu.module.css'
import { personName } from '../../app/people'
import type { User } from '../../shared/api'
import { PersonAvatar } from '../ui/Avatars'
import ui from '../ui/ui.module.css'

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
export function suggestionsFor(
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

/** The items of the open suggestions, which the arrow keys move between. */
export function items(list: HTMLElement | null): HTMLElement[] {
  return Array.from(list?.querySelectorAll<HTMLElement>('button') ?? [])
}

/**
 * The open suggestions of a list of logins, below the list. A divider
 * follows the entry of every member. A press keeps the focus in the text
 * box, so the list stays open for the next login.
 */
export function SuggestionMenu({
  ref,
  ...props
}: {
  label: string
  suggestions: readonly Suggestion[]
  choose: (suggestion: Suggestion) => void
  /** The menu, whose items the arrow keys reach. */
  ref: Ref<HTMLDivElement>
}) {
  const { suggestions } = props
  return (
    <div
      aria-label={`Suggestions for ${props.label}`}
      className={classes(menu.menu, menu['below-start'])}
      ref={ref}
      role="menu"
    >
      {suggestions.map((suggestion, index) => (
        <div className={ui.contents} key={suggestion.key}>
          {index === 1 && suggestions[0].member === null ? (
            <hr className={menu.divider} />
          ) : null}
          <button
            className={classes(menu.item, ui.plainButton, ui.menuItem)}
            onClick={() => props.choose(suggestion)}
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
  )
}
