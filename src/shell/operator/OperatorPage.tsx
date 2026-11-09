import type { ReactNode } from 'react'
import { routes } from '../../app/router'
import { Page, type BackLink } from '../layout/Page'
import { LinkTabs } from '../ui/links'
import { useViewport } from '../ui/viewport'

/** The tabs of the operator section. */
export type OperatorTab = 'overview' | 'orgs' | 'users'

const tabs = [
  { tab: 'overview', label: 'Overview', to: routes.operator() },
  { tab: 'orgs', label: 'Orgs', to: routes.operatorOrgs() },
  { tab: 'users', label: 'Users', to: routes.operatorUsers() },
] as const satisfies readonly { tab: OperatorTab; label: string; to: string }[]

/**
 * A page of the operator section: the header, and the tabs Overview, Orgs,
 * and Users under it. On a phone the header leads back to the workspaces,
 * unless the page gives its own way back, which desktop shows too. The
 * actions sit in the header on desktop and in the footer on a phone.
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
      {props.children}
    </Page>
  )
}
