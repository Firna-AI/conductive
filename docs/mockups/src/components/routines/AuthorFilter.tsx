import type { TriggerEdit } from '../../fixtures/routineTriggers'
import { orgs } from '../../fixtures/orgs'
import { LoginField } from './LoginField'
import { membersEntry } from './triggerCopy'
import styles from './AuthorFilter.module.css'

/**
 * The author filter of a pull request trigger (decision 206 C): an "is"
 * list and an "is not" list of GitHub logins. An empty "is" means every
 * member of the org. "is" can hold the entry "Members of <org>", so a bot
 * joins the members and does not replace them. Another account starts
 * runs only when "is" names it, and an author whom "is not" names starts
 * none.
 */
export function AuthorFilter(props: { edit: TriggerEdit }) {
  const { edit } = props
  const filter =
    edit.trigger.kind === 'pull-request' && edit.trigger.authors
      ? edit.trigger.authors
      : { members: false, is: [], isNot: [] }
  const org = orgs.acme.name
  return (
    <div className={styles.filter}>
      <LoginField
        group={{ label: membersEntry(org), listed: filter.members }}
        hint={`Only these authors start runs. When it is empty, every member of ${org} does.`}
        label="Author is"
        logins={filter.is}
        typed={edit.typed}
        unknown={edit.unknownLogin}
      />
      <LoginField
        hint="These authors never start runs."
        label="Author is not"
        logins={filter.isNot}
      />
      <p className={styles.note}>
        {`To let a bot or another account outside ${org} start runs, add it to Author is.`}
      </p>
    </div>
  )
}
