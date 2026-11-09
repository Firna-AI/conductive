import type { TriggerEdit } from '../../fixtures/routineTriggers'
import { orgs } from '../../fixtures/orgs'
import { LoginField } from './LoginField'
import styles from './AuthorFilter.module.css'

/**
 * The author filter of a pull request trigger (decision 206 C): an "is"
 * list and an "is not" list of GitHub logins. Members of the org start
 * runs. Another account, such as a bot, starts runs only when "is" names
 * it, and an author whom "is not" names starts none.
 */
export function AuthorFilter(props: { edit: TriggerEdit }) {
  const { edit } = props
  const filter =
    edit.trigger.kind === 'pull-request' && edit.trigger.authors
      ? edit.trigger.authors
      : { is: [], isNot: [] }
  const org = orgs.acme.name
  return (
    <div className={styles.filter}>
      <LoginField
        hint={`Only these authors start runs. Leave it empty for every member of ${org}.`}
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
        {`A bot or another account outside ${org} starts runs only when Author is names it.`}
      </p>
    </div>
  )
}
