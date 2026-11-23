import type { ReactNode } from 'react'
import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { orgList } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { linkTabs } from '../../entries/components/common/LinkTabs.mockup'
import {
  appFrame,
  mobileFrame,
} from '../../entries/components/layout/AppFrame.mockup'
import type { RailState } from '../layout/OrgRail'
import type { BackLink } from '../layout/Page'
import { page as pagePart } from '../../entries/components/layout/Page.mockup'
import { PauseNotice } from './pause'
import { stopTimeWords } from '../../../../../src/ui/components/operator/stopTimeCopy'
import { WaitlistOffNotice, type WaitlistState } from './waitlistSwitch'
import { defined } from '../../defined'

/** The tabs of the operator section. */
export type OperatorTab =
  | 'overview'
  | 'orgs'
  | 'users'
  | 'waitlist'
  | 'codes'
  | 'providers'
  | 'settings'

/**
 * Whether new people can get in with a code or an org invitation, or an
 * operator paused sign-ups.
 */
export type SignUps = 'open' | 'paused'

const tabs: readonly { key: OperatorTab; label: string; to: string }[] = [
  { key: 'overview', label: 'Overview', to: paths.operator },
  { key: 'orgs', label: 'Orgs', to: paths.operatorOrgs },
  { key: 'users', label: 'Users', to: paths.operatorUsers },
  { key: 'waitlist', label: 'Waitlist', to: paths.operatorWaitlist },
  { key: 'codes', label: 'Invite codes', to: paths.operatorCodes },
  { key: 'providers', label: 'Providers', to: paths.operatorProviders },
  { key: 'settings', label: stopTimeWords.tab, to: paths.operatorSettings },
]

/** The rail of an operator, with the operator section open. */
const operatorRail: RailState = {
  orgs: orgList,
  current: 'operator',
  operator: true,
}

/**
 * A page of the operator section: the header, the tabs Overview, Orgs,
 * Users, Waitlist, Invite codes, Providers, and Settings, and a dialog over the
 * page. While sign-ups are paused, each tab starts with the notice of the
 * pause. While the waitlist is off, the notice of the switch follows it.
 * On a phone the seven tabs keep one line while they fit. When they do not
 * fit, as on a phone of 390 px, the last ones move to a second line, so
 * that each tab shows. The header leads back to the workspaces, unless the
 * page gives its own way back.
 */
export function OperatorPage(props: {
  viewport: Viewport
  tab: OperatorTab
  title: string
  subtitle?: string
  back?: BackLink
  actions?: ReactNode
  dialog?: ReactNode
  signUps?: SignUps
  waitlist?: WaitlistState
  children: ReactNode
}) {
  const mobile = props.viewport === 'mobile'
  const paused = props.signUps === 'paused'
  const waitlist = props.waitlist ?? 'on'
  const home = { label: 'Workspaces', to: paths.shell }
  const page = (
    <pagePart.Component
      {...defined({
        actions: props.actions,
        back: props.back ?? (mobile ? home : undefined),
        subtitle: props.subtitle,
      })}
      tabs={
        <linkTabs.Component
          label="Operator"
          moklyInstance="operator-tabs"
          tabs={tabs.map((tab) => ({
            label: tab.label,
            to: tab.to,
            selected: tab.key === props.tab,
          }))}
          flow={mobile}
        />
      }
      title={props.title}
      viewport={props.viewport}
    >
      {paused ? <PauseNotice waitlist={waitlist} /> : null}
      {waitlist === 'off' ? <WaitlistOffNotice paused={paused} /> : null}
      {props.children}
    </pagePart.Component>
  )
  if (mobile) {
    return (
      <mobileFrame.Component>
        {page}
        {props.dialog}
      </mobileFrame.Component>
    )
  }
  return (
    <appFrame.Component
      rail={operatorRail}
      {...defined({ overlay: props.dialog })}
    >
      {page}
    </appFrame.Component>
  )
}
