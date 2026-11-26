import { KeyRound, TimerOff } from 'lucide-react'
import type { PersonKey } from '../../fixtures/members'
import { orgs } from '../../fixtures/orgs'
import type {
  SecretRequest as Request,
  SecretRunItem,
} from '../../fixtures/secretRequests'
import { classes } from '../../../../../src/ui/components/common/classes'
import { useTouch } from '../../../../../src/ui/components/common/touch'
import {
  Answers,
  endLine,
  LateEnd,
  PhoneAnswers,
  type AnswerLinks,
} from './RequestActions'
import { asksValue } from './requests'
import { ClaimedCommand, runNames } from './SecretRun'
import {
  askedTimes,
  notInOrg,
  secretRunWords,
} from '../../../../../src/ui/components/chat/secretRunCopy'
import { ValueAnswer } from './ValueAnswer'
import styles from '../../../../../src/ui/components/chat/SecretRequest.module.css'
import names from '../../../../../src/ui/components/chat/SecretRun.module.css'

/** The org of the workspaces that the chat mockups draw. */
const org = orgs.acme.name

/**
 * What each secret is, the reason of the agent, and the command that the
 * agent says it will run (secrets decision 11 D). One secret shows its
 * description alone. Several show each name with its description.
 */
function RequestFacts(props: { request: Request }) {
  const { secrets } = props.request
  const one = secrets.length === 1
  return (
    <div className={styles.details}>
      {one ? (
        <p className={styles.text}>{secrets[0].description ?? notInOrg(org)}</p>
      ) : null}
      <dl className={styles.facts}>
        {one
          ? null
          : secrets.map((secret) => (
              <div className={styles.fact} key={secret.name}>
                <dt className={names.names}>{secret.name}</dt>
                <dd className={styles.text}>
                  {secret.description ?? notInOrg(org)}
                </dd>
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

/**
 * A request for secrets (secrets decisions 4 and 7): each name, its
 * description, and the reason of the agent, never a value. While the tool
 * call waits, the chat pins it just above the composer. After the time
 * limit, or when the turn ends, it stays there as a late request, with the
 * same choices and its late line, until a member answers it or it ends
 * (needs-input decision 1 A). Then it takes its place in its turn, and it
 * does not fold with the work of the turn. Any member who sees the session
 * answers it. A name that the org does not have asks for a value and how
 * long it lasts: in the card on a computer, and in a sheet that Give a
 * value opens on a phone (item 4 C of the mockups). An ended request shows
 * its answer, or Not answered. In the stack above the composer, the stack
 * draws the outline of the card, and `hides` counts the older requests for
 * the same secrets that the card hides: the card then says how often the
 * agent asked, and its answer settles each of them. In a walk of the
 * catalogue, `links` gives the page of each answer.
 */
export function SecretRequest(props: {
  item: SecretRunItem
  viewer: PersonKey
  inStack?: boolean
  hides?: number
  links?: AnswerLinks
}) {
  const { item, links } = props
  const phone = useTouch()
  const value = asksValue(item)
  const open = item.state === 'waiting' || item.state === 'late'
  const inline = open && value && !phone
  const end = endLine(item, props.viewer)
  const hidden = props.hides ?? 0
  return (
    <section
      aria-label={`Request for ${runNames(item)}`}
      className={classes(styles.request, props.inStack && styles.stacked)}
    >
      <div className={styles.head}>
        <KeyRound aria-hidden className={styles.icon} size={14} />
        <span className={styles.names}>
          <span className={names.names}>{runNames(item)}</span>
          {hidden > 0 ? (
            <span className={styles.asked}>{askedTimes(hidden + 1)}</span>
          ) : null}
        </span>
        {inline ? null : (
          <span className={styles.end}>
            {open && phone && value ? (
              <PhoneAnswers item={item} links={links} />
            ) : null}
            {open && !value ? <Answers item={item} links={links} /> : null}
            {open ? null : <LateEnd item={item} />}
          </span>
        )}
      </div>
      <RequestFacts request={item.request} />
      {inline ? (
        <>
          <ValueAnswer
            item={item}
            labelled={item.request.secrets.length > 1}
            org={org}
          />
          <div className={styles.actions}>
            <Answers item={item} links={links} />
          </div>
        </>
      ) : null}
      {item.state === 'late' ? (
        <p className={styles.line}>
          <TimerOff aria-hidden className={styles.lineIcon} size={13} />
          {secretRunWords.late}
        </p>
      ) : null}
      {end ? <p className={styles.line}>{end}</p> : null}
    </section>
  )
}
