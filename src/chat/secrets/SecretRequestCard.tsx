import { useState } from 'react'
import { KeyRound, TimerOff } from 'lucide-react'
import {
  askedTimes,
  secretRunWords,
} from '../../ui/components/chat/secretRunCopy'
import styles from '../../ui/components/chat/SecretRequest.module.css'
import names from '../../ui/components/chat/SecretRun.module.css'
import { classes } from '../../ui/components/common/classes'
import { useTouch } from '../../ui/components/common/touch'
import type {
  AnswerSecretRequest,
  SecretRequest,
} from '../../shared/secret-requests'
import { Answers, PhoneAnswers, ValueSheet } from './RequestAnswers'
import { RequestEnd, RequestFacts, requestNames } from './RequestParts'
import { isOpen, type AnswerKind } from './secret-snapshot'
import { missingNames } from '../../shared/secret-late-answer'
import { endLine, type RecoveryLogin } from './secret-words'
import {
  draftReady,
  emptyDraft,
  ValueFields,
  type ValueDraft,
} from './ValueFields'

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
 * leaves the page with the choices. In the stack above the composer, the
 * stack draws the outline of the card, and a card that hides older
 * requests for the same secrets says how often the agent asked.
 */
export function SecretRequestCard(props: {
  request: SecretRequest
  viewerId: string | null
  org: string
  /** The login that the session keeps and its agent, for a login that is gone. */
  login: RecoveryLogin | null
  choices: boolean
  answering: AnswerKind | null
  /** The card is on top of the stack above the composer. */
  inStack?: boolean
  /** The number of older requests for the same secrets that the card hides. */
  hides?: number
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
  const hides = props.hides ?? 0
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
      className={classes(styles.request, props.inStack && styles.stacked)}
    >
      <div className={styles.head}>
        <KeyRound aria-hidden className={styles.icon} size={14} />
        <span className={styles.names}>
          <span className={names.names}>{requestNames(request)}</span>
          {hides > 0 ? (
            <span className={styles.asked}>{askedTimes(hides + 1)}</span>
          ) : null}
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
