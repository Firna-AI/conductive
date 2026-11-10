import { RefreshCw } from 'lucide-react'
import type { ModelListCheck } from '../../fixtures/endpointModels'
import { ActionButton } from '../common/actions'
import formStyles from './AgentConnectForm.module.css'
import styles from './EndpointModels.module.css'

/** Names in a sentence, such as "A", "A and B", or "A, B, and C". */
const names = new Intl.ListFormat('en', { type: 'conjunction' })

/**
 * The models of the app that the model list of an own endpoint does not
 * name, under the host of the login: their labels, their IDs as code that
 * the owner can copy into the setup of the endpoint, and the time of the
 * last read of the list. Refresh reads the list again. Each model stays a
 * choice in the picker, because the list of a gateway need not name every
 * model that it serves. `agent` is the name of the agent, for the spoken
 * name of Refresh.
 */
export function EndpointModels(props: {
  agent: string
  check: ModelListCheck
}) {
  const { unlisted, checked } = props.check
  const labels = names.format(unlisted.map((model) => model.label))
  const ids = names.formatToParts(unlisted.map((model) => model.id))
  return (
    <div className={styles.models}>
      <div className={styles.text}>
        <span className={styles.label}>
          This endpoint does not list {labels}
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
      <ActionButton
        accessibilityLabel={`Refresh the model list of ${props.agent}`}
        icon={RefreshCw}
      >
        Refresh
      </ActionButton>
    </div>
  )
}
