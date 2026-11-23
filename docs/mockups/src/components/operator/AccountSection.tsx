import {
  ArrowLeftRight,
  CircleAlert,
  CircleStop,
  Hourglass,
} from 'lucide-react'
import { ActionButton } from '../../../../../src/ui/components/common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../../../../../src/ui/components/common/StatusText'
import {
  DetailList,
  type Detail,
} from '../../../../../src/ui/components/settings/DetailList'
import {
  Section,
  SectionText,
} from '../../../../../src/ui/components/settings/Section'
import { StateWithReason } from './AccessSections'
import { AccountId } from './directory'
import { orgAccountWords } from '../../../../../src/ui/components/operator/providerCopy'
import {
  lastSwitchLine,
  switchBuildWords,
  switchStartedLine,
  switchWords,
  type LastSwitch,
  type OrgSwitch,
} from '../../../../../src/ui/components/operator/switchCopy'
import countStyles from '../../../../../src/ui/components/operator/AccountCounts.module.css'

/** A provider account by its ID, and the workspaces of the org on it. */
export type AccountWorkspaces = { id: string; workspaces: number }

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

/**
 * The workspaces of the org on each account, in the rows of Orgs by
 * account on the Providers tab. The counts add up to the workspaces by
 * state, Removed included, as a count of orgs includes a deleted org.
 */
function AccountWorkspaceList(props: {
  accounts: readonly AccountWorkspaces[]
}) {
  return (
    <ul aria-label={switchWords.byAccount} className={countStyles.list}>
      {props.accounts.map((item) => (
        <li className={countStyles.row} key={item.id}>
          <span className={countStyles.account}>{item.id}</span>
          <span className={countStyles.count}>
            {item.workspaces.toLocaleString('en')}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Switch account, or Stop switch while a switch waits or builds. After a
 * failed switch build, Switch account leads, so that the operator can try
 * again. Each asks first.
 */
function SwitchAction(props: { item?: OrgSwitch; to?: string }) {
  const state = props.item?.build.state
  const button =
    state === 'waiting' || state === 'building' ? (
      <ActionButton icon={CircleStop}>{switchWords.stop}</ActionButton>
    ) : (
      <ActionButton
        icon={ArrowLeftRight}
        tone={state === 'failed' ? 'primary' : 'secondary'}
      >
        {switchWords.action}
      </ActionButton>
    )
  if (props.to === undefined) return button
  return (
    <ScreenLink asChild to={props.to}>
      {button}
    </ScreenLink>
  )
}

/**
 * The provider account of an org on its page in the operator section: the
 * account by its ID, the newest switch that did not change it, with its new
 * account, its start, and the state of its build, and the last switch. The
 * workspaces by account show when the org has workspaces on more than one
 * account. Operator screens name each account by its ID. It imports no
 * fixture, so the app uses it too.
 */
export function AccountSection(props: {
  org: string
  account: string
  switch?: OrgSwitch
  last?: LastSwitch
  workspaces?: readonly AccountWorkspaces[]
  /** The question of the action, for the page that draws it. */
  to?: string
}) {
  const item = props.switch
  const rows: Detail[] = [
    { term: orgAccountWords.term, value: props.account, mono: true },
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
            account={props.account}
            item={item}
            org={props.org}
          />
        ),
      },
    )
  }
  if (props.last) {
    rows.push({ term: switchWords.last, value: lastSwitchLine(props.last) })
  }
  const accounts = props.workspaces ?? []
  return (
    <Section
      actions={<SwitchAction item={item} to={props.to} />}
      title={switchWords.title}
    >
      <DetailList rows={rows} />
      {accounts.length > 1 ? (
        <>
          <SectionText muted>{switchWords.byAccount}</SectionText>
          <AccountWorkspaceList accounts={accounts} />
        </>
      ) : null}
    </Section>
  )
}
