import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { orgList } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { LinkTabs } from '../common/LinkTabs'
import { AppFrame, MobileFrame } from '../layout/AppFrame'
import type { RailState } from '../layout/OrgRail'
import { Page, type BackLink } from '../layout/Page'

/** The tabs of the operator section. */
export type OperatorTab = 'overview' | 'orgs' | 'users'

const tabs: readonly { key: OperatorTab; label: string; to: string }[] = [
  { key: 'overview', label: 'Overview', to: paths.operator },
  { key: 'orgs', label: 'Orgs', to: paths.operatorOrgs },
  { key: 'users', label: 'Users', to: paths.operatorUsers },
]

/** The rail of an operator, with the operator section open. */
const operatorRail: RailState = {
  orgs: orgList,
  current: 'operator',
  operator: true,
}

/**
 * A page of the operator section: the header, the tabs Overview, Orgs,
 * and Users, and a dialog over the page. On a phone the header leads back
 * to the workspaces, unless the page gives its own way back.
 */
export function OperatorPage(props: {
  viewport: Viewport
  tab: OperatorTab
  title: string
  subtitle?: string
  back?: BackLink
  actions?: ReactNode
  dialog?: ReactNode
  children: ReactNode
}) {
  const mobile = props.viewport === 'mobile'
  const home = { label: 'Workspaces', to: paths.shell }
  const page = (
    <Page
      actions={props.actions}
      back={props.back ?? (mobile ? home : undefined)}
      subtitle={props.subtitle}
      tabs={
        <LinkTabs
          label="Operator"
          tabs={tabs.map((tab) => ({
            label: tab.label,
            to: tab.to,
            selected: tab.key === props.tab,
          }))}
        />
      }
      title={props.title}
      viewport={props.viewport}
    >
      {props.children}
    </Page>
  )
  if (mobile) {
    return (
      <MobileFrame>
        {page}
        {props.dialog}
      </MobileFrame>
    )
  }
  return (
    <AppFrame overlay={props.dialog} rail={operatorRail}>
      {page}
    </AppFrame>
  )
}
