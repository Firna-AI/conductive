import type { ReactNode } from 'react'
import { providerWords } from '../../../docs/mockups/src/components/operator/providerCopy'
import { routes } from '../../app/router'
import { Page, type BackLink } from '../layout/Page'
import { LinkTabs } from '../ui/links'
import { useViewport } from '../ui/viewport'
import { PauseNotice } from './PauseParts'
import { WaitlistOffNotice } from './SwitchParts'

/** The tabs of the operator section. */
export type OperatorTab =
  'overview' | 'orgs' | 'users' | 'waitlist' | 'codes' | 'providers'

const tabs = [
  { tab: 'overview', label: 'Overview', to: routes.operator() },
  { tab: 'orgs', label: 'Orgs', to: routes.operatorOrgs() },
  { tab: 'users', label: 'Users', to: routes.operatorUsers() },
  { tab: 'waitlist', label: 'Waitlist', to: routes.operatorWaitlist() },
  { tab: 'codes', label: 'Invite codes', to: routes.operatorCodes() },
  {
    tab: 'providers',
    label: providerWords.tab,
    to: routes.operatorProviders(),
  },
] as const satisfies readonly { tab: OperatorTab; label: string; to: string }[]

/**
 * A page of the operator section: the header, and the tabs Overview, Orgs,
 * Users, Waitlist, Invite codes, and Providers under it. While sign-ups
 * are paused, the page starts with the notice of the pause. While the
 * waitlist is off, the notice of the switch follows it. On a phone the
 * tabs keep one line while they fit, and the last ones move to a second
 * line, so that each tab shows. The header of a phone leads back to the
 * workspaces, unless the page gives its own way back, which desktop shows
 * too. The actions sit in the header on desktop and in the footer on a
 * phone.
 */
export function OperatorPage(props: {
  tab: OperatorTab
  title: string
  subtitle?: string
  back?: BackLink
  actions?: ReactNode
  children: ReactNode
}) {
  const phone = useViewport() === 'phone'
  const home = { label: 'Workspaces', to: routes.home() }
  return (
    <Page
      actions={props.actions}
      back={props.back ?? (phone ? home : undefined)}
      backOnDesktop={props.back !== undefined}
      subtitle={props.subtitle}
      tabs={
        <LinkTabs
          flow={phone}
          label="Operator"
          tabs={tabs.map((item) => ({
            label: item.label,
            to: item.to,
            selected: item.tab === props.tab,
          }))}
        />
      }
      title={props.title}
    >
      <PauseNotice />
      <WaitlistOffNotice />
      {props.children}
    </Page>
  )
}
