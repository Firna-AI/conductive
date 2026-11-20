import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Play, Plus } from 'lucide-react'
import { ActionButton } from '../../components/common/actions'
import { ScreenLink } from '../../components/common/ScreenLink'
import { Page } from '../../components/layout/Page'
import {
  IssueDetail,
  type ActivityEntry,
} from '../../components/issues/IssueDetail'
import { IssueDialog } from '../../components/issues/IssueDialog'
import { IssueGroups } from '../../components/issues/IssueGroups'
import { issuePaths } from '../../components/issues/issuePaths'
import {
  issuesAt,
  pageSections,
  postcodeStarted,
} from '../../components/issues/issueSections'
import { IssueSidebar } from '../../components/issues/IssueSidebar'
import { IssueWorkspaces } from '../../components/issues/IssueWorkspaces'
import { postcodeIssue } from '../../fixtures/issues'
import { paths } from '../../paths'
import { IssueFrame } from './issueFrame'
import styles from './IssueScreens.module.css'

const viewer = { person: 'cal', role: 'admin' } as const

/** The screens that the rows of variation A open. */
const links = {
  [postcodeIssue.key]: issuePaths.pageIssue,
  'guest-postcode': issuePaths.pageWorkspace,
  'checkout-autocomplete': paths.app,
}

/** The sidebar of variation A: the list of the app, with Issues. */
export function pageSidebar(
  started: boolean,
  current?: 'issues',
  open?: string,
) {
  return (
    <IssueSidebar
      current={current}
      issuesCount={started ? 1 : 2}
      issuesTo={issuePaths.pageList}
      sections={pageSections({
        open,
        links,
        started: started ? postcodeStarted : undefined,
      })}
      viewer={viewer}
    />
  )
}

/** The activity of the postcode issue before its start. */
export const createdActivity: readonly ActivityEntry[] = [
  { who: 'priya', text: 'created the issue', time: '2h' },
  { who: 'priya', text: 'assigned it to Cal Moore', time: '2h' },
]

/** The activity of the postcode issue after Start. */
export const startedActivity: readonly ActivityEntry[] = [
  ...createdActivity,
  { who: 'cal', text: 'started W-403 with Claude', time: 'now' },
  { text: 'Moved to In progress, because W-403 started', time: 'now' },
]

/**
 * Variation A: the Issues page of the org, which the Issues link of the
 * sidebar opens. New issue opens its dialog over the page.
 */
export function IssuesPageScreen(props: {
  viewport: Viewport
  dialog?: boolean
}) {
  const { viewport } = props
  const mobile = viewport === 'mobile'
  const newIssue = (
    <ScreenLink asChild to={issuePaths.pageNew}>
      <ActionButton icon={Plus} tone="primary">
        New issue
      </ActionButton>
    </ScreenLink>
  )
  const overlay = props.dialog ? (
    <IssueDialog
      draft={{
        title: 'Refund email names the wrong amount',
        body: 'A partial refund shows the full order total in the email.',
        status: 'todo',
        priority: 'urgent',
        assignee: 'No one',
        repository: 'acme/billing-service',
      }}
      mode="issue"
      saveTo={issuePaths.pageList}
      startTo={issuePaths.pageStart}
    />
  ) : undefined
  return (
    <IssueFrame
      overlay={overlay}
      sidebar={pageSidebar(false, 'issues')}
      viewport={viewport}
    >
      <Page
        actions={newIssue}
        back={mobile ? { label: 'Workspaces', to: paths.shell } : undefined}
        fill
        subtitle="Acme"
        title="Issues"
        viewport={viewport}
      >
        <div className={styles.list}>
          <IssueGroups
            issues={issuesAt({})}
            links={links}
            viewport={viewport}
          />
        </div>
      </Page>
    </IssueFrame>
  )
}

/**
 * Variation A: one issue on its own page. Before a start, its Workspaces
 * block offers Start workspace. After it, the block lists the workspace,
 * live, and Add workspace starts another one.
 */
export function IssuePageScreen(props: {
  viewport: Viewport
  started: boolean
  overlay?: ReactNode
}) {
  const { viewport, started } = props
  const issue = issuesAt({
    started: started ? postcodeStarted : undefined,
  }).find((item) => item.key === postcodeIssue.key)
  if (!issue) return null
  const start = (
    <ScreenLink asChild to={issuePaths.pageStart}>
      <ActionButton icon={Play} tone="primary">
        Start workspace
      </ActionButton>
    </ScreenLink>
  )
  return (
    <IssueFrame
      overlay={props.overlay}
      sidebar={pageSidebar(started, 'issues')}
      viewport={viewport}
    >
      <Page
        back={{ label: 'Issues', to: issuePaths.pageList }}
        fill
        title={`I-${issue.number}`}
        viewport={viewport}
      >
        <IssueDetail
          activity={started ? startedActivity : createdActivity}
          issue={issue}
          viewport={viewport}
          workspaces={
            <IssueWorkspaces
              links={links}
              more={issuePaths.pageStart}
              start={start}
              startNote="Start opens a workspace in acme/storefront with the issue as its first message."
              workspaces={issue.workspaces}
            />
          }
        />
      </Page>
    </IssueFrame>
  )
}
