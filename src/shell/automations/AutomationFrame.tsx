import type { ReactNode } from 'react'
import { SuspendedOrgNotice } from '../../ui/components/orgs/SuspendedOrgNotice'
import styles from '../../ui/screens/AutomationScreen.module.css'
import { routes, type AutomationTab } from '../../app/router'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgAccess } from '../context'
import { Page } from '../layout/Page'
import { LinkTabs } from '../ui/links'
import { useViewport } from '../ui/viewport'

/** The tab of a saved automation that a phone shows: its form, or its runs. */
export interface AutomationTabs {
  automationId: string
  current: AutomationTab
}

/**
 * The frame of the automation page: Automations as the way back, the name, and
 * the actions, over the form. A desktop centres the form, with the Runs
 * list in a column at the right. A phone shows a saved automation in two tabs,
 * Automation and Runs, and a new automation without tabs, because it has no runs
 * yet. The frame alone shows the notice of a suspended org, in every view
 * of the page: at the top of the form on desktop, and above the content of
 * either tab on a phone.
 */
export function AutomationFrame(props: {
  org: OrgSummary
  /**
   * The name of the automation, or New automation, over the subtitle Automation. A
   * page that shows no automation, such as while it loads or when the org no
   * longer has it, has none, and its title is Automation alone.
   */
  title?: string
  actions?: ReactNode
  /** The Runs list: a column on desktop, and the Runs tab on a phone. */
  runs?: ReactNode
  /** The tabs of a saved automation on a phone. */
  tabs?: AutomationTabs
  /** The content, which a page of a suspended org can leave out. */
  children?: ReactNode
}) {
  const { org, tabs } = props
  const phone = useViewport() === 'phone'
  const { suspended } = useOrgAccess(org)
  const runsTab = phone && tabs?.current === 'runs'
  const notice = suspended ? <SuspendedOrgNotice org={org} /> : null
  return (
    <Page
      actions={props.actions}
      back={{ label: 'Automations', to: routes.automations(org.id) }}
      backOnDesktop
      fill
      subtitle={props.title === undefined ? undefined : 'Automation'}
      tabs={
        phone && tabs ? (
          <LinkTabs
            label="Automation"
            tabs={[
              {
                label: 'Automation',
                to: routes.automation(org.id, tabs.automationId),
                selected: tabs.current === 'automation',
              },
              {
                label: 'Runs',
                to: routes.automation(org.id, tabs.automationId, 'runs'),
                selected: tabs.current === 'runs',
              },
            ]}
          />
        ) : undefined
      }
      title={props.title ?? 'Automation'}
    >
      {phone ? (
        <div className={styles.phoneScroll}>
          <div className={styles.phoneContent}>
            {notice}
            {runsTab ? props.runs : props.children}
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.formScroll}>
            <div className={styles.form}>
              {notice}
              {props.children}
            </div>
          </div>
          {props.runs}
        </div>
      )}
    </Page>
  )
}
