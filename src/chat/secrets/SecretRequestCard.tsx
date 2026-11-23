import { useState } from 'react'
import { Ban, CircleCheck, CircleMinus, KeyRound, TimerOff } from 'lucide-react'
import {
  notInOrg,
  secretRunWords,
} from '../../ui/components/chat/secretRunCopy'
import styles from '../../ui/components/chat/SecretRequest.module.css'
import names from '../../ui/components/chat/SecretRun.module.css'
import { StatusText } from '../../ui/components/common/StatusText'
import { useTouch } from '../../ui/components/common/touch'
import type {
  AnswerSecretRequest,
  SecretRequest,
} from '../../shared/secret-requests'
import { Answers, PhoneAnswers, ValueSheet } from './RequestAnswers'
import { ClaimedCommand } from './SecretRunCard'
import { isOpen, type AnswerKind } from './secret-snapshot'
import { missingNames } from '../../shared/secret-late-answer'
import { allowedLabel, endLine, type RecoveryLogin } from './secret-words'
import {
  draftReady,
  emptyDraft,
  ValueFields,
  type ValueDraft,
} from './ValueFields'

/** The names of the secrets of a request, in its order. */
function requestNames(request: SecretRequest): string {
  return request.secrets.map((secret) => secret.name).join(', ')
}

/**
 * What each secret is, the reason of the agent, and the command that the
 * agent says it will run (secrets decision 11 D). One secret shows its
 * description alone. Several show each name with its description.
 */
function RequestFacts(props: { request: SecretRequest; org: string }) {
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
function RequestEnd(props: { request: SecretRequest }) {
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

/**
 * A request for secrets (secrets decisions 4 B and 7): each name, its
 * description, the reason of the agent, and the command that the agent says
 * it will run, never a value. Any member who sees the session answers an
 * open request, while `choices` says that the chat takes answers. A name
 * that the org has no secret for asks for a value and how long it lasts: in
 * the card on a computer, and in a sheet that Give a value opens on a phone.
 * A late request says that the agent stopped waiting. A request that ended
 * shows its answer, or Not answered, and a line says what followed. Give
 * the card a key that changes when the request ends, so a typed value
 * leaves the page with the choices.
 */
export function SecretRequestCard(props: {
  request: SecretRequest
  viewerId: string | null
  org: string
  /** The login that the session keeps and its agent, for a login that is gone. */
  login: RecoveryLogin | null
  choices: boolean
  answering: AnswerKind | null
  /**
   * Answers a request by its ID. So one function serves each card, and a card
   * keeps the same props while its request stays the same.
   */
  onAnswer: (requestId: string, answer: AnswerSecretRequest) => void
}) {
  const { request, answering } = props
  const phone = useTouch()
  const [draft, setDraft] = useState<ValueDraft>(emptyDraft)
  const [sheet, setSheet] = useState(false)
  const missing = missingNames(request)
  const values = missing.length > 0
  const open = isOpen(request)
  const choices = props.choices && open
  const inline = choices && values && !phone
  const ready = !values || draftReady(request, draft)
  const end = endLine(request, props.viewerId, props.org, props.login)
  const answer = {
    answering,
    deny: () => props.onAnswer(request.id, { kind: 'deny' }),
    allow: () => {
      if (!values) return props.onAnswer(request.id, { kind: 'allow' })
      setSheet(false)
      props.onAnswer(request.id, {
        kind: 'values',
        lifetime: draft.lifetime,
        values: Object.fromEntries(
          missing.map((name) => [name, draft.values[name] ?? '']),
        ),
      })
    },
  }
  const fields = (labelled: boolean, inSheet: boolean) => (
    <ValueFields
      change={setDraft}
      disabled={answering !== null}
      draft={draft}
      labelled={labelled}
      org={props.org}
      request={request}
      sheet={inSheet}
    />
  )
  return (
    <section
      aria-label={`Request for ${requestNames(request)}`}
      className={styles.request}
    >
      <div className={styles.head}>
        <KeyRound aria-hidden className={styles.icon} size={14} />
        <span className={styles.names}>
          <span className={names.names}>{requestNames(request)}</span>
        </span>
        {inline ? null : (
          <span className={styles.end}>
            {choices && phone && values ? (
              <PhoneAnswers {...answer} give={() => setSheet(true)} />
            ) : null}
            {choices && !values ? (
              <Answers {...answer} ready={ready} values={false} />
            ) : null}
            {open ? null : <RequestEnd request={request} />}
          </span>
        )}
      </div>
      <RequestFacts org={props.org} request={request} />
      {inline ? (
        <>
          {fields(request.secrets.length > 1, false)}
          <div className={styles.actions}>
            <Answers {...answer} ready={ready} values />
          </div>
        </>
      ) : null}
      {request.state === 'late' ? (
        <p className={styles.line}>
          <TimerOff aria-hidden className={styles.lineIcon} size={13} />
          {secretRunWords.late}
        </p>
      ) : null}
      {end ? <p className={styles.line}>{end}</p> : null}
      {choices && phone && values && sheet ? (
        <ValueSheet {...answer} close={() => setSheet(false)} ready={ready}>
          {fields(true, true)}
        </ValueSheet>
      ) : null}
    </section>
  )
}
