import { Ban, CircleCheck, CircleMinus } from 'lucide-react'
import { agents } from '../../fixtures/agents'
import type { PersonKey } from '../../fixtures/members'
import { orgWithLogin } from '../../fixtures/orgLogins'
import { orgs } from '../../fixtures/orgs'
import type { SecretRunItem } from '../../fixtures/secretRequests'
import { paths } from '../../paths'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { Linked } from '../common/ScreenLink'
import { StatusText } from '../../../../../src/ui/components/common/StatusText'
import { asksValue } from './requests'
import { whoOf } from './SecretRun'
import {
  endedLine,
  lateAllowedLabel,
  lateAnswerNote,
  reconnectNote,
  secretRunWords,
  type SessionLoginOwner,
} from '../../../../../src/ui/components/chat/secretRunCopy'

/**
 * The pages that the answers of a card open in a walk of the catalogue,
 * which keeps the other open requests of its example. An answer without a
 * page draws no link there.
 */
export type AnswerLinks = { allow?: string; deny?: string; value?: string }

/** Whether a request names a secret of the org too. */
function namesStored(item: SecretRunItem): boolean {
  return item.request.secrets.some((secret) => secret.description !== undefined)
}

/**
 * The result that Allow leads to: in time or late, for a secret or a
 * value. The mockups draw no result of a mixed request.
 */
function allowPath(item: SecretRunItem): string | undefined {
  const value = asksValue(item)
  if (value && namesStored(item)) return undefined
  if (item.state === 'late') {
    return value ? paths.secretLateGiven : paths.secretLateAllowed
  }
  return value ? paths.secretValue : paths.secretResults
}

/** The sheet of the values that Give a value opens, on a phone. */
function valuePath(item: SecretRunItem): string {
  if (item.state === 'late') return paths.secretLateValue
  return namesStored(item) ? paths.secretMixedValue : paths.secretTemporaryValue
}

/** The result that Deny leads to. */
function denyPath(item: SecretRunItem): string {
  return item.state === 'late' ? paths.secretLateDenied : paths.secretDenied
}

/**
 * Deny, which leads to the denied result, or in a walk to the page that
 * the walk gives.
 */
function DenyButton(props: { item: SecretRunItem; links?: AnswerLinks }) {
  const { links } = props
  return (
    <Linked to={links ? links.deny : denyPath(props.item)}>
      <ActionButton>{secretRunWords.deny}</ActionButton>
    </Linked>
  )
}

/**
 * Allow. A secret of the org is allowed for the session, and a value for
 * the time that its choice gives. Allow of a value waits for each value.
 * In a walk, it leads to the page that the walk gives.
 */
export function AllowButton(props: {
  item: SecretRunItem
  label: string
  links?: AnswerLinks
}) {
  const { item, links } = props
  const typed = !asksValue(item) || item.draft?.typed === true
  const result = links ? links.allow : allowPath(item)
  return (
    <Linked to={typed ? result : undefined}>
      <ActionButton disabled={!typed} tone="primary">
        {props.label}
      </ActionButton>
    </Linked>
  )
}

/**
 * Deny and Allow, as a computer shows them, and for a secret of the org.
 * `links` gives the pages of a walk.
 */
export function Answers(props: { item: SecretRunItem; links?: AnswerLinks }) {
  const value = asksValue(props.item)
  return (
    <>
      <DenyButton item={props.item} links={props.links} />
      <AllowButton
        item={props.item}
        label={value ? secretRunWords.allow : secretRunWords.allowSession}
        links={props.links}
      />
    </>
  )
}

/**
 * Deny and Give a value, as a phone shows a request for a value (item 4 C
 * of the mockups). Give a value opens a sheet with each value, the choice
 * of how long they last, and Allow.
 */
export function PhoneAnswers(props: {
  item: SecretRunItem
  links?: AnswerLinks
}) {
  const { links } = props
  return (
    <>
      <DenyButton item={props.item} links={links} />
      <Linked to={links ? links.value : valuePath(props.item)}>
        <ActionButton tone="primary">{secretRunWords.giveValue}</ActionButton>
      </Linked>
    </>
  )
}

/** The end of a late request: its answer, or Not answered. */
export function LateEnd(props: { item: SecretRunItem }) {
  const { grant, state } = props.item
  if (state === 'late-allowed' && grant) {
    return (
      <StatusText
        icon={CircleCheck}
        label={lateAllowedLabel(grant)}
        tone="success"
      />
    )
  }
  if (state === 'not-answered') {
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

/** The member who answered a late request, if a member did. */
function answeredBy(item: SecretRunItem): PersonKey | undefined {
  if (item.state === 'late-denied') return item.deniedBy
  if (item.state !== 'late-allowed' || !item.grant) return undefined
  return 'by' in item.grant ? item.grant.by : undefined
}

/**
 * The line under a late request that ended: who answered and what
 * followed, or why it ended with no answer. A late Allow starts a turn for
 * the sender of the turn that asked (secrets decision 10 B). When that
 * turn cannot run, the line says when the agent learns of the answer: at
 * the next message, or when the login of the session is connected again,
 * by its starter or, for the org login, by an admin.
 */
export function endLine(
  item: SecretRunItem,
  viewer: PersonKey,
): string | undefined {
  if (item.state === 'not-answered' && item.endedBy) {
    return endedLine(item.endedBy, orgs.acme.name)
  }
  const by = answeredBy(item)
  if (by === undefined) return undefined
  const who = whoOf(by, viewer).subject
  if (item.state === 'late-denied') return lateAnswerNote(who, 'denied')
  const delivery = item.delivery ?? { kind: 'turn' }
  if (delivery.kind !== 'reconnect') return lateAnswerNote(who, delivery.kind)
  const { login } = delivery
  const owner: SessionLoginOwner =
    login.type === 'org'
      ? { type: 'org', name: orgWithLogin.name }
      : { type: 'personal', name: whoOf(login.starter, viewer).object }
  return reconnectNote(who, owner, agents[delivery.agent].name)
}
