import styles from '../../../docs/mockups/src/components/routines/AuthorFilter.module.css'
import { membersEntry } from '../../../docs/mockups/src/components/routines/triggerCopy'
import { addAuthor, removeAuthor, setMembers } from '../../app/routine-triggers'
import type { User } from '../../shared/api'
import type { RoutineAuthorFilterInput } from '../../shared/routines'
import { LoginField } from './LoginField'
import type { RefusedLogin } from './useRoutineSave'

/**
 * The author filter of a pull request trigger: an "Author is" list and an
 * "Author is not" list of GitHub logins. An empty "Author is" means every
 * member of the org. Its entry "Members of <org>" keeps the members when
 * the owner names a bot. An account outside the org starts runs only when
 * "Author is" names it.
 */
export function AuthorFilter(props: {
  filter: RoutineAuthorFilterInput | undefined
  change: (filter: RoutineAuthorFilterInput | undefined) => void
  orgName: string
  members: readonly User[]
  /** A login of this filter that a save refused. */
  unknown: RefusedLogin | null
}) {
  const { filter, change, orgName, unknown } = props
  const current = filter ?? { members: false, is: [], isNot: [] }
  return (
    <div className={styles.filter}>
      <LoginField
        add={(login) => change(addAuthor(filter, 'is', login))}
        entry={{
          label: membersEntry(orgName),
          listed: current.members,
          add: () => change(setMembers(filter, true)),
          remove: () => change(setMembers(filter, false)),
        }}
        hint={`Only these authors start runs. When it is empty, every member of ${orgName} does.`}
        label="Author is"
        logins={current.is}
        members={props.members}
        remove={(login) => change(removeAuthor(filter, 'is', login))}
        unknown={unknown?.list === 'is' ? unknown.login : null}
      />
      <LoginField
        add={(login) => change(addAuthor(filter, 'isNot', login))}
        hint="These authors never start runs."
        label="Author is not"
        logins={current.isNot}
        members={props.members}
        remove={(login) => change(removeAuthor(filter, 'isNot', login))}
        unknown={unknown?.list === 'isNot' ? unknown.login : null}
      />
      <p className={styles.note}>
        {`To let a bot or another account outside ${orgName} start runs, add it to Author is.`}
      </p>
    </div>
  )
}
