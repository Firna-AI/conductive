import { Ban, CircleCheck, CircleMinus } from 'lucide-react'
import { agents } from '../../fixtures/agents'
import type { PersonKey } from '../../fixtures/members'
import { orgWithLogin } from '../../fixtures/orgLogins'
import { orgs } from '../../fixtures/orgs'
import type { SecretRunItem } from '../../fixtures/secretRequests'
import { paths } from '../../paths'
import { requestStackPaths } from '../../screens/requestStackPages'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { ScreenLink } from '../common/ScreenLink'
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

/** Whether a request names a secret of the org too. */
function namesStored(item: SecretRunItem): boolean {
  return item.request.secrets.some((secret) => secret.description !== undefined)
}

/**
 * The result that Allow leads to: in time or late, for a secret or a
 * value. The mockups draw no result of a mixed request. A card that hides
 * older requests for a secret of the org leads to the result of each of
 * them.
 */
function allowPath(item: SecretRunItem, hides: boolean): string | undefined {
  const value = asksValue(item)
  if (value && namesStored(item)) return undefined
  if (hides && !value) return requestStackPaths.secretAskedAllowed
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

/**
 * The result that Deny leads to. The Deny of a card that hides older
 * requests ends each of them too, so it leads to the result of each.
 */
function denyPath(item: SecretRunItem, hides: boolean): string {
  if (hides) return requestStackPaths.secretAskedDenied
  return item.state === 'late' ? paths.secretLateDenied : paths.secretDenied
}

/** Deny, which leads to the denied result. */
function DenyButton(props: { item: SecretRunItem; hides?: boolean }) {
  return (
    <ScreenLink asChild to={denyPath(props.item, props.hides === true)}>
      <ActionButton>{secretRunWords.deny}</ActionButton>
    </ScreenLink>
  )
}

/**
 * Allow. A secret of the org is allowed for the session, and a value for
 * the time that its choice gives. Allow of a value waits for each value.
 */
export function AllowButton(props: {
  item: SecretRunItem
  label: string
  hides?: boolean
}) {
  const { item } = props
  const typed = !asksValue(item) || item.draft?.typed === true
  const to = typed ? allowPath(item, props.hides === true) : undefined
  const button = (
    <ActionButton disabled={!typed} tone="primary">
      {props.label}
    </ActionButton>
  )
  if (to === undefined) return button
  return (
    <ScreenLink asChild to={to}>
      {button}
    </ScreenLink>
  )
}

/**
 * Deny and Allow, as a computer shows them, and for a secret of the org.
 * `hides` marks a card that hides older requests for the same secrets.
 */
export function Answers(props: { item: SecretRunItem; hides?: boolean }) {
  const value = asksValue(props.item)
  return (
    <>
      <DenyButton hides={props.hides} item={props.item} />
      <AllowButton
        hides={props.hides}
        item={props.item}
        label={value ? secretRunWords.allow : secretRunWords.allowSession}
      />
    </>
  )
}

/**
 * Deny and Give a value, as a phone shows a request for a value (item 4 C
 * of the mockups). Give a value opens a sheet with each value, the choice
 * of how long they last, and Allow.
 */
export function PhoneAnswers(props: { item: SecretRunItem; hides?: boolean }) {
  return (
    <>
      <DenyButton hides={props.hides} item={props.item} />
      <ScreenLink asChild to={valuePath(props.item)}>
        <ActionButton tone="primary">{secretRunWords.giveValue}</ActionButton>
      </ScreenLink>
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
