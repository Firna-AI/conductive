import { Ban, CircleCheck, CircleMinus } from 'lucide-react'
import {
  notInOrg,
  secretRunWords,
} from '../../ui/components/chat/secretRunCopy'
import styles from '../../ui/components/chat/SecretRequest.module.css'
import names from '../../ui/components/chat/SecretRun.module.css'
import { StatusText } from '../../ui/components/common/StatusText'
import type { SecretRequest } from '../../shared/secret-requests'
import { ClaimedCommand } from './SecretRunCard'
import { allowedLabel } from './secret-words'

// The parts of the card of a secret request: its names, its facts, and the
// answer of a request that ended.

/** The names of the secrets of a request, in its order. */
export function requestNames(request: SecretRequest): string {
  return request.secrets.map((secret) => secret.name).join(', ')
}

/**
 * What each secret is, the reason of the agent, and the command that the
 * agent says it will run (secrets decision 11 D). One secret shows its
 * description alone. Several show each name with its description.
 */
export function RequestFacts(props: { request: SecretRequest; org: string }) {
  const { secrets } = props.request
  const one = secrets.length === 1
  const describe = (secret: SecretRequest['secrets'][number]) =>
    secret.secretId === null ? notInOrg(props.org) : secret.description
  return (
    <div className={styles.details}>
      {one ? <p className={styles.text}>{describe(secrets[0])}</p> : null}
      <dl className={styles.facts}>
        {one
          ? null
          : secrets.map((secret) => (
              <div className={styles.fact} key={secret.name}>
                <dt className={names.names}>{secret.name}</dt>
                <dd className={styles.text}>{describe(secret)}</dd>
              </div>
            ))}
        <div className={styles.fact}>
          <dt className={styles.term}>{secretRunWords.reason}</dt>
          <dd className={styles.text}>{props.request.reason}</dd>
        </div>
      </dl>
      <ClaimedCommand command={props.request.command} />
    </div>
  )
}

/** The answer of a request that ended: what Allow gave, Denied, or Not answered. */
export function RequestEnd(props: { request: SecretRequest }) {
  const { request } = props
  if (request.state === 'allowed') {
    return (
      <StatusText
        icon={CircleCheck}
        label={allowedLabel(request.lifetime)}
        tone="success"
      />
    )
  }
  if (request.state === 'not-answered') {
    return (
      <StatusText
        icon={CircleMinus}
        label={secretRunWords.notAnswered}
        tone="muted"
      />
    )
  }
  return <StatusText icon={Ban} label={secretRunWords.denied} tone="muted" />
}
