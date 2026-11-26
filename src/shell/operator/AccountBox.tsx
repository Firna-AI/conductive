import type { ReactNode } from 'react'
import {
  ArrowLeftRight,
  CircleAlert,
  CircleStop,
  Hourglass,
} from 'lucide-react'
import { InlineText } from '../../ui/components/common/InlineText'
import { StatusText } from '../../ui/components/common/StatusText'
import countStyles from '../../ui/components/operator/AccountCounts.module.css'
import {
  orgAccountWords,
  providerWords,
} from '../../ui/components/operator/providerCopy'
import {
  lastSwitchLine,
  onlyAccountSwitchLine,
  switchBuildWords,
  switchStartedLine,
  switchWords,
  type OrgSwitch,
} from '../../ui/components/operator/switchCopy'
import {
  DetailList,
  type Detail,
} from '../../ui/components/settings/DetailList'
import { Section, SectionText } from '../../ui/components/settings/Section'
import type { ApiError } from '../../app/api/client'
import { useServices } from '../../app/services'
import type { Loadable } from '../../app/store'
import { useNow } from '../../app/time'
import type { OperatorOrgDetail } from '../../shared/operator'
import type { OperatorProvidersResponse } from '../../shared/operator-providers'
import { ActionButton } from '../ui/actions'
import { LoadFailure } from '../ui/LoadFailure'
import {
  lastSwitchOf,
  orgSwitchOf,
  switchRuns,
  switchTargets,
} from './account-switch'
import { StateWithReason } from './AccessSections'
import { AccountId } from './TargetParts'

/**
 * The state of the switch build as a glyph and words, so that a state never
 * depends on colour alone, with the line under it that says why.
 */
function SwitchBuildState(props: {
  org: string
  account: string
  item: OrgSwitch
}) {
  const { state } = props.item.build
  const words = switchBuildWords(props.org, props.account, props.item)
  const status =
    state === 'building' ? (
      <StatusText busy label={words.state} tone="active" />
    ) : (
      <StatusText
        icon={state === 'failed' ? CircleAlert : Hourglass}
        label={words.state}
        tone={state === 'failed' ? 'danger' : 'neutral'}
      />
    )
  return <StateWithReason reason={words.reason} state={status} />
}

/** The rows of the box: the account, the open switch, and the last switch. */
function accountRows(
  org: OperatorOrgDetail,
  item: OrgSwitch | undefined,
  last: string | null,
): Detail[] {
  const rows: Detail[] = [
    { term: orgAccountWords.term, value: org.providerAccount, mono: true },
  ]
  if (item) {
    rows.push(
      {
        term: switchWords.to,
        value: (
          <StateWithReason
            reason={switchStartedLine(item.when, item.by)}
            state={<AccountId id={item.to} />}
          />
        ),
      },
      {
        term: switchWords.build,
        value: (
          <SwitchBuildState
            account={org.providerAccount}
            item={item}
            org={org.name}
          />
        ),
      },
    )
  }
  if (last !== null) rows.push({ term: switchWords.last, value: last })
  return rows
}

/**
 * The workspaces of the org on each account, in the rows of Orgs by
 * account on the Providers tab, while they run on more than one account.
 * The counts add up to the workspaces by state, Removed included.
 */
function AccountWorkspaces(props: { org: OperatorOrgDetail }) {
  const accounts = props.org.workspacesByAccount ?? []
  if (accounts.length < 2) return null
  return (
    <>
      <SectionText muted>{switchWords.byAccount}</SectionText>
      <ul aria-label={switchWords.byAccount} className={countStyles.list}>
        {accounts.map((item) => (
          <li className={countStyles.row} key={item.id}>
            <span className={countStyles.account}>{item.id}</span>
            <span className={countStyles.count}>
              {item.workspaces.toLocaleString('en')}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

/** What the box offers: Switch account, Stop switch, a line, or a failure. */
type Offer =
  | { kind: 'none' }
  | { kind: 'switch'; primary: boolean }
  | { kind: 'stop' }
  | { kind: 'only-account' }
  | { kind: 'failed'; error: ApiError }

function offerOf(
  org: OperatorOrgDetail,
  item: OrgSwitch | undefined,
  accounts: Loadable<OperatorProvidersResponse>,
): Offer {
  if (org.providerSwitch === undefined) return { kind: 'none' }
  if (switchRuns(item)) return { kind: 'stop' }
  if (org.switchAvailable !== true) return { kind: 'none' }
  if (accounts.state === 'loading') return { kind: 'none' }
  if (accounts.state === 'failed') {
    return { kind: 'failed', error: accounts.error }
  }
  const ids = accounts.value.accounts.map((account) => account.id)
  if (switchTargets(ids, org.providerAccount).length === 0) {
    return { kind: 'only-account' }
  }
  return { kind: 'switch', primary: item?.build.state === 'failed' }
}

/** The action at the bottom of the box: Switch account or Stop switch. */
function offerAction(
  offer: Offer,
  ask: (question: 'switch' | 'stop-switch') => void,
): ReactNode {
  switch (offer.kind) {
    case 'stop':
      return (
        <ActionButton icon={CircleStop} onPress={() => ask('stop-switch')}>
          {switchWords.stop}
        </ActionButton>
      )
    case 'switch':
      return (
        <ActionButton
          icon={ArrowLeftRight}
          onPress={() => ask('switch')}
          tone={offer.primary ? 'primary' : 'secondary'}
        >
          {switchWords.action}
        </ActionButton>
      )
    case 'none':
    case 'only-account':
    case 'failed':
      return undefined
  }
}

/**
 * The provider account of an org on its page: the account by its ID, the
 * newest switch that did not change it, with its new account, its start,
 * and the state of its build, and the last switch. The workspaces by
 * account show when the org has workspaces on more than one account.
 * Switch account sits at the bottom, and Stop switch takes its place while
 * a switch waits or builds. After a failed switch build, Switch account
 * leads. With no other configured account, a line says so in its place.
 * While the configured accounts load, the box offers no switch, and a
 * failed read shows Try again. Each action asks first, with `ask`.
 */
export function AccountBox(props: {
  org: OperatorOrgDetail
  accounts: Loadable<OperatorProvidersResponse>
  retryAccounts: () => Promise<void>
  ask: (question: 'switch' | 'stop-switch') => void
}) {
  const { org, accounts } = props
  const { timeZone } = useServices()
  const now = useNow(org.providerSwitch?.state === 'building' ? 1_000 : 60_000)
  const clock = { now, timeZone }
  const item = orgSwitchOf(org, clock)
  const last = lastSwitchOf(org, clock)
  const offer = offerOf(org, item, accounts)
  return (
    <Section actions={offerAction(offer, props.ask)} title={switchWords.title}>
      <DetailList
        rows={accountRows(org, item, last ? lastSwitchLine(last) : null)}
      />
      <AccountWorkspaces org={org} />
      {offer.kind === 'only-account' ? (
        <SectionText>
          <InlineText text={onlyAccountSwitchLine(org.providerAccount)} />
        </SectionText>
      ) : null}
      {offer.kind === 'failed' ? (
        <LoadFailure
          error={offer.error}
          retry={props.retryAccounts}
          title={providerWords.notLoaded}
        />
      ) : null}
    </Section>
  )
}
