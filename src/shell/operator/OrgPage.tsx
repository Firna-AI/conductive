import { useEffect, useState } from 'react'
import type { QuestionTarget } from '../../ui/components/operator/operatorCopy'
import { liftSwitchLine } from '../../ui/components/operator/switchCopy'
import { readOperatorOrg } from '../../app/api/read-operator-pages'
import { OperatorOrgSwitch } from '../../app/operator-org-switch'
import { OperatorProviders } from '../../app/operator-providers'
import { OperatorTarget } from '../../app/operator-target'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { useStore, type Loadable } from '../../app/store'
import {
  operatorOrgPath,
  orgSuspensionPath,
  type OperatorOrgDetail,
} from '../../shared/operator'
import type { OperatorProvidersResponse } from '../../shared/operator-providers'
import { useApp } from '../context'
import { Loaded } from '../settings/LoadState'
import {
  newSwitchWait,
  orgSwitchOf,
  switchRuns,
  switchTargets,
} from './account-switch'
import { StopSwitchDialog, SwitchDialog } from './AccountSwitchDialogs'
import { OperatorPage } from './OperatorPage'
import { OrgDetails, useDeletion } from './OrgDetails'
import { LiftDialog, SuspendDialog } from './TargetDialogs'
import { TargetAction, useTargetPage, type Question } from './TargetPage'

/**
 * The paragraph that the question of Lift adds while a switch waits for
 * Lift, because Lift then starts the switch build.
 */
function liftExtra(org: OperatorOrgDetail): string | undefined {
  const item = org.providerSwitch
  return item?.state === 'waiting' && item.waitReason === 'suspended'
    ? liftSwitchLine(item.toAccount)
    : undefined
}

/**
 * The questions of the Provider account box: Switch account, with the
 * configured accounts other than the account of the org, and Stop switch
 * while a switch waits or builds. A question that the state no longer
 * allows shows nothing.
 */
function SwitchQuestions(props: {
  org: OperatorOrgDetail
  question: Question | null
  accounts: Loadable<OperatorProvidersResponse>
  switches: OperatorOrgSwitch
  close: () => void
}) {
  const { org, question, accounts, switches, close } = props
  const { now, timeZone } = useServices()
  const clock = { now: now(), timeZone }
  const item = orgSwitchOf(org, clock)
  if (question === 'stop-switch' && item && switchRuns(item)) {
    return (
      <StopSwitchDialog
        close={close}
        from={org.providerAccount}
        item={item}
        org={org.name}
        stop={() => switches.stop()}
      />
    )
  }
  if (
    question !== 'switch' ||
    org.switchAvailable !== true ||
    accounts.state !== 'ready'
  )
    return null
  const ids = accounts.value.accounts.map((account) => account.id)
  const targets = switchTargets(ids, org.providerAccount)
  if (targets.length === 0) return null
  return (
    <SwitchDialog
      close={close}
      from={org.providerAccount}
      org={org.name}
      switchTo={(to, endRunningJob) =>
        switches.switchTo({ providerAccount: to, endRunningJob })
      }
      targets={targets}
      wait={newSwitchWait(org, clock)}
    />
  )
}

/**
 * The page of one org, from the Orgs tab or a link, with Suspend, or Lift for a
 * suspended org, in its header. A deleted org still has Suspend. The Provider
 * account box has Switch account, or Stop switch while a switch waits or
 * builds. The page reads the configured accounts when it opens, for Switch
 * account. After each write, the page reads the org again.
 */
export function OrgPage(props: { orgId: string }) {
  const app = useApp()
  const page = useTargetPage(
    () =>
      new OperatorTarget(
        app,
        {
          page: operatorOrgPath(props.orgId),
          suspension: orgSuspensionPath(props.orgId),
        },
        readOperatorOrg,
      ),
  )
  const { target, detail, question, ask } = page
  const [switches] = useState(
    () => new OperatorOrgSwitch(app, props.orgId, target.detail),
  )
  const [providers] = useState(() => new OperatorProviders(app))
  useEffect(() => providers.state.watch(), [providers])
  const accounts = useStore(providers.state.value)
  const org = detail.state === 'ready' ? detail.value : null
  const deletion = useDeletion(org)
  const named: QuestionTarget | null = org
    ? { kind: 'org', name: org.name, deletion }
    : null
  const close = () => ask(null)
  return (
    <OperatorPage
      actions={
        org ? (
          <TargetAction
            ask={ask}
            kind="org"
            suspended={org.suspension !== null}
          />
        ) : undefined
      }
      back={{ label: 'Orgs', to: routes.operatorOrgs() }}
      subtitle={org ? 'Org' : undefined}
      tab="orgs"
      title={org?.name ?? 'Org'}
    >
      <Loaded
        failure="The org could not load"
        retry={() => target.detail.refresh()}
        value={detail}
      >
        {(value) => (
          <OrgDetails
            accounts={accounts}
            ask={ask}
            org={value}
            retryAccounts={() => providers.state.refresh()}
            stopping={page.stopping}
          />
        )}
      </Loaded>
      {named && question === 'suspend' ? (
        <SuspendDialog
          close={close}
          self={false}
          suspend={() => target.suspend()}
          target={named}
        />
      ) : null}
      {org && named && question === 'lift' ? (
        <LiftDialog
          close={close}
          extra={liftExtra(org)}
          lift={() => target.lift()}
          target={named}
        />
      ) : null}
      {org ? (
        <SwitchQuestions
          accounts={accounts}
          close={close}
          org={org}
          question={question}
          switches={switches}
        />
      ) : null}
    </OperatorPage>
  )
}
