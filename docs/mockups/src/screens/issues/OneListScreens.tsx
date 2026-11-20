import type { Viewport } from '@mokly/mokly'
import { IssueDetail } from '../../components/issues/IssueDetail'
import { IssueDialog } from '../../components/issues/IssueDialog'
import { issuePaths } from '../../components/issues/issuePaths'
import {
  issuesAt,
  oneListSections,
  postcodeStarted,
  type ListFocus,
} from '../../components/issues/issueSections'
import { IssueSidebar } from '../../components/issues/IssueSidebar'
import { StartComposer } from '../../components/issues/StartComposer'
import { Page } from '../../components/layout/Page'
import type { WorkspaceTab } from '../../components/workspace/TabItem'
import { postcodeIssue, type Issue } from '../../fixtures/issues'
import { postcodeChat, postcodeWorkspace } from '../../fixtures/issueWorkspaces'
import { paths } from '../../paths'
import { IssueFrame } from './issueFrame'
import { IssueWorkspaceScreen } from './IssueWorkspaceScreen'
import { createdActivity, startedActivity } from './PageScreens'
import styles from './IssueScreens.module.css'

const viewer = { person: 'cal', role: 'admin' } as const

const links = {
  [postcodeIssue.key]: issuePaths.listIssue,
  'guest-postcode': issuePaths.listWorkspace,
  'checkout-autocomplete': paths.app,
}

/** The sidebar of variation B: issues and workspaces in one list. */
function oneListSidebar(focus: ListFocus, current?: 'new-workspace') {
  return (
    <IssueSidebar
      current={current}
      items={oneListSections({ ...focus, links })}
      newWorkspaceTo={issuePaths.listNew}
      viewer={viewer}
    />
  )
}

/** The postcode issue at the time of the screen. */
function postcodeAt(started: boolean): Issue {
  const issue = issuesAt({
    started: started ? postcodeStarted : undefined,
  }).find((item) => item.key === postcodeIssue.key)
  return issue ?? postcodeIssue
}

/**
 * Variation B: an issue in the list opens as a workspace that has not
 * started. The issue is its brief, and its message box has Start in place
 * of Send.
 */
export function OneListIssueScreen(props: {
  viewport: Viewport
  dialog?: boolean
}) {
  const { viewport } = props
  const issue = postcodeIssue
  const overlay = props.dialog ? (
    <IssueDialog
      draft={{
        title: '',
        body: 'Let shoppers add a gift message at checkout, up to 200 characters. Print it on the packing slip.',
        status: 'todo',
        priority: 'medium',
        assignee: 'Cal Moore',
        repository: 'acme/storefront',
      }}
      mode="task"
      saveTo={issuePaths.listIssue}
      startTo={issuePaths.listWorkspace}
    />
  ) : undefined
  return (
    <IssueFrame
      overlay={overlay}
      sidebar={oneListSidebar(
        { open: props.dialog ? undefined : issue.key },
        props.dialog ? 'new-workspace' : undefined,
      )}
      viewport={viewport}
    >
      <Page
        back={
          viewport === 'mobile'
            ? { label: 'Workspaces', to: paths.shell }
            : undefined
        }
        fill
        subtitle="I-31 · Not started · acme/storefront"
        title={issue.title}
        viewport={viewport}
      >
        <div className={styles.centre}>
          <IssueDetail
            activity={createdActivity}
            issue={issue}
            panel
            viewport={viewport}
            workspaces={null}
          />
          <StartComposer startTo={issuePaths.listWorkspace} />
        </div>
      </Page>
    </IssueFrame>
  )
}

/** The tab row of the started workspace: the issue first, then the session. */
function oneListTabs(selected: 'issue' | 'session'): WorkspaceTab[] {
  return [
    {
      key: 'issue',
      kind: 'markdown',
      title: 'I-31 Issue',
      selected: selected === 'issue',
      to: issuePaths.listBrief,
    },
    {
      key: 'session',
      kind: 'session',
      title: postcodeWorkspace.name,
      selected: selected === 'session',
      running: true,
      to: issuePaths.listWorkspace,
    },
  ]
}

/**
 * Variation B after Start: the row of the issue is now the row of its
 * workspace, in the same place. The issue stays as the first tab of the
 * workspace, and `tab` chooses the shown tab.
 */
export function OneListWorkspaceScreen(props: {
  viewport: Viewport
  tab: 'issue' | 'session'
}) {
  const { viewport, tab } = props
  const issue = postcodeAt(true)
  const ticked: Issue = {
    ...issue,
    checklist: issue.checklist?.map((item, index) => ({
      ...item,
      done: index === 0,
    })),
  }
  const brief = (
    <div className={styles.centre}>
      <IssueDetail
        activity={[
          ...startedActivity,
          {
            text: 'Claude ticked “Reproduce on the guest checkout”',
            time: 'now',
          },
        ]}
        issue={ticked}
        panel
        viewport={viewport}
        workspaces={null}
      />
    </div>
  )
  return (
    <IssueWorkspaceScreen
      centre={tab === 'issue' ? brief : undefined}
      items={postcodeChat}
      phone={tab === 'issue' ? brief : undefined}
      sidebar={oneListSidebar({
        open: 'guest-postcode',
        started: postcodeStarted,
      })}
      tabs={oneListTabs(tab)}
      viewport={viewport}
      workspace={postcodeWorkspace}
    />
  )
}
