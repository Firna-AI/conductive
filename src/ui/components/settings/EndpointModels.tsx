import type { ReactNode } from 'react'
import type { ModelListCheck } from './modelListCheck'
import formStyles from './AgentConnectForm.module.css'
import styles from './EndpointModels.module.css'

/** Names in a sentence, such as "A", "A and B", or "A, B, and C". */
const names = new Intl.ListFormat('en', { type: 'conjunction' })

/**
 * The pickers that hide the models: those of the owner of a personal login,
 * or every picker on an org login (decision 3 A of the org logins plan).
 */
const pickerNames = {
  personal: 'your model pickers',
  org: 'the model pickers on this login',
} as const

/** Who owns an own endpoint login: a member, or the org. */
export type LoginOwner = keyof typeof pickerNames

/** Says which models the pickers hide, and why. */
function hiddenText(labels: string, count: number, pickers: string): string {
  return count === 1
    ? `${labels} is hidden from ${pickers}, because this endpoint does not list it.`
    : `${labels} are hidden from ${pickers}, because this endpoint does not list them.`
}

/**
 * The models of the app that the model list of an own endpoint does not
 * name, under the host of the login. The pickers of the owner hide them, so
 * the line says so, with their IDs as code that the owner can copy into the
 * setup of the endpoint, and the time of the last read of the list that
 * worked. `refresh` is the Refresh button of the login, which reads the
 * list again. The row has one Refresh, so after a read that failed the
 * warning above holds it, and the line has none. On an org login, `owner`
 * is `org`: every picker on the login hides the models, and only an admin
 * sees the line.
 */
export function EndpointModels(props: {
  check: ModelListCheck
  owner?: LoginOwner
  refresh?: ReactNode
}) {
  const { unlisted, checked } = props.check
  const labels = names.format(unlisted.map((model) => model.label))
  const ids = names.formatToParts(unlisted.map((model) => model.id))
  const pickers = pickerNames[props.owner ?? 'personal']
  return (
    <div className={styles.models}>
      <div className={styles.text}>
        <span className={styles.label}>
          {hiddenText(labels, unlisted.length, pickers)}
        </span>
        <span className={styles.hint}>
          {unlisted.length === 1 ? 'Its model ID is ' : 'Their model IDs are '}
          {ids.map((part, index) =>
            part.type === 'element' ? (
              <code className={formStyles.code} key={index}>
                {part.value}
              </code>
            ) : (
              part.value
            ),
          )}
          {`. Checked ${checked}.`}
        </span>
      </div>
      {props.refresh}
    </div>
  )
}
