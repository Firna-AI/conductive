import type { ReactNode } from 'react'
import formStyles from '../../ui/components/settings/AgentConnectForm.module.css'
import type { LoginOwner } from '../../ui/components/settings/EndpointModels'
import styles from '../../ui/components/settings/EndpointModels.module.css'
import type { UnlistedModels } from '../../app/endpoint-models'
import { useServices } from '../../app/services'
import { useNow, whenOf } from '../../app/time'

/** Names in a sentence, such as "A", "A and B", or "A, B, and C". */
const names = new Intl.ListFormat('en', { type: 'conjunction' })

/**
 * The pickers that follow the list: those of the owner of a personal
 * login, or every picker on an org login, from decision 3 A of the org
 * logins plan.
 */
const pickerNames: Readonly<Record<LoginOwner, string>> = {
  personal: 'your model pickers',
  org: 'the model pickers on this login',
}

/**
 * What the pickers of the login do with the models that the list leaves
 * out: they hide them, or they show them all when the list names none.
 */
function listText(unlisted: UnlistedModels, owner: LoginOwner): string {
  const labels = names.format(unlisted.models.map((model) => model.label))
  const one = unlisted.models.length === 1
  const pickers = pickerNames[owner]
  if (unlisted.noneListed) {
    const shown = `${pickers.charAt(0).toUpperCase()}${pickers.slice(1)} show ${labels}`
    return one
      ? `${shown}, but this endpoint does not list it.`
      : `${shown}, but this endpoint lists none of them.`
  }
  return one
    ? `${labels} is hidden from ${pickers}, because this endpoint does not list it.`
    : `${labels} are hidden from ${pickers}, because this endpoint does not list them.`
}

/**
 * The models of the app that the last model list of an own endpoint does
 * not name, under the host of the login: what the pickers of the owner do
 * with them, their IDs as code that the owner can copy into the setup of
 * the endpoint, and the time of the last read of the list that worked.
 * `refresh` is the Refresh button of the login, which reads the list again,
 * and the line follows the new list. The row has one Refresh, so after a
 * read that failed the warning above holds it, and the line has none. On
 * an org login, `owner` is `org`, so the line names every picker on the
 * login.
 */
export function EndpointModels(props: {
  unlisted: UnlistedModels
  refresh: ReactNode
  owner?: LoginOwner
}) {
  const { timeZone } = useServices()
  const now = useNow(60_000)
  const { models, checkedAt } = props.unlisted
  const ids = names.formatToParts(models.map((model) => model.model))
  const checked = whenOf(now, checkedAt, timeZone)
  return (
    <div className={styles.models}>
      <div className={styles.text}>
        <span className={styles.label}>
          {listText(props.unlisted, props.owner ?? 'personal')}
        </span>
        <span className={styles.hint}>
          {models.length === 1 ? 'Its model ID is ' : 'Their model IDs are '}
          {ids.map((part, index) =>
            part.type === 'element' ? (
              <code className={formStyles.code} key={index}>
                {part.value}
              </code>
            ) : (
              part.value
            ),
          )}
          {`. Checked ${checked.kind === 'date' ? `on ${checked.text}` : checked.text}.`}
        </span>
      </div>
      {props.refresh}
    </div>
  )
}
