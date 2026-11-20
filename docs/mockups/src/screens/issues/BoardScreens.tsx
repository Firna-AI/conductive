import type { Viewport } from '@mokly/mokly'
import { Plus } from 'lucide-react'
import { ActionButton } from '../../components/common/actions'
import { LinkTabs } from '../../components/common/LinkTabs'
import { ScreenLink } from '../../components/common/ScreenLink'
import { IssueBoard } from '../../components/issues/IssueBoard'
import { IssueDetail } from '../../components/issues/IssueDetail'
import { issuePaths } from '../../components/issues/issuePaths'
import {
  issuesAt,
  pageSections,
  postcodeStarted,
} from '../../components/issues/issueSections'
import { IssueSidebar } from '../../components/issues/IssueSidebar'
import { Page } from '../../components/layout/Page'
import { PanelBar } from '../../components/workspace/PanelBar'
import panel from '../../components/workspace/ToolsPanel.module.css'
import { postcodeIssue, type Issue } from '../../fixtures/issues'
import { postcodeChat, postcodeWorkspace } from '../../fixtures/issueWorkspaces'
import { paths } from '../../paths'
import { IssueFrame } from './issueFrame'
import { IssueWorkspaceScreen } from './IssueWorkspaceScreen'
import { startedActivity } from './PageScreens'
import styles from './IssueScreens.module.css'

const viewer = { person: 'cal', role: 'admin' } as const

function boardSidebar(started: boolean, open?: string) {
  return (
    <IssueSidebar
      current={open === undefined ? 'issues' : undefined}
      issuesCount={started ? 1 : 2}
      issuesTo={issuePaths.boardView}
      sections={pageSections({
        open,
        links: {
          'guest-postcode': issuePaths.boardWorkspace,
          'checkout-autocomplete': paths.app,
        },
        started: started ? postcodeStarted : undefined,
      })}
      viewer={viewer}
    />
  )
}

/**
 * Variation D: the Issues page as a board, one column for each state. A
 * card shows the live marks of its workspaces, so the board is also the
 * view of the work of the agents. `stage` draws the board, the drag of
 * the postcode card to In progress, or the board after the drop, when the
 * workspace of the card works.
 */
export function IssueBoardScreen(props: {
  viewport: Viewport
  stage: 'board' | 'drop' | 'live'
}) {
  const { viewport, stage } = props
  const started = stage === 'live'
  const links = {
    [postcodeIssue.key]: started
      ? issuePaths.boardWorkspace
      : issuePaths.boardDrop,
  }
  return (
    <IssueFrame sidebar={boardSidebar(started)} viewport={viewport}>
      <Page
        actions={
          <ScreenLink asChild to={issuePaths.pageNew}>
            <ActionButton icon={Plus} tone="primary">
              New issue
            </ActionButton>
          </ScreenLink>
        }
        back={
          viewport === 'mobile'
            ? { label: 'Workspaces', to: paths.shell }
            : undefined
        }
        fill
        subtitle="Acme"
        title="Issues"
        viewport={viewport}
      >
        <div className={styles.board}>
          <IssueBoard
            drag={
              stage === 'drop'
                ? { issue: postcodeIssue.key, to: 'in-progress' }
                : undefined
            }
            issues={issuesAt({
              started: started ? postcodeStarted : undefined,
            })}
            links={links}
          />
        </div>
      </Page>
    </IssueFrame>
  )
}

/** The postcode issue a few minutes after the drop: the agent ticked one item. */
function tickedIssue(): Issue {
  const issue = issuesAt({ started: postcodeStarted }).find(
    (item) => item.key === postcodeIssue.key,
  )
  const base = issue ?? postcodeIssue
  return {
    ...base,
    checklist: base.checklist?.map((item, index) => ({
      ...item,
      done: index === 0,
    })),
  }
}

/**
 * Variation D: the workspace of the card. The right column gets an Issue
 * tab beside Terminal and Preview. The agent ticks the checklist of the
 * issue and writes to its activity as it works. A phone shows the issue
 * in place of the chat.
 */
export function BoardWorkspaceScreen(props: { viewport: Viewport }) {
  const { viewport } = props
  const issue = tickedIssue()
  const detail = (
    <IssueDetail
      activity={[
        ...startedActivity,
        {
          text: 'Claude ticked “Reproduce on the guest checkout”',
          time: 'now',
        },
      ]}
      issue={issue}
      panel
      viewport={viewport}
      workspaces={null}
    />
  )
  const tools = (
    <section aria-label="Tools" className={panel.panel}>
      <PanelBar>
        <LinkTabs
          label="Tools"
          tabs={[
            { label: 'Issue', selected: true, to: issuePaths.boardWorkspace },
            { label: 'Terminal', selected: false, to: paths.terminal },
            { label: 'Preview', selected: false, to: paths.preview },
          ]}
        />
      </PanelBar>
      <div className={panel.body}>{detail}</div>
    </section>
  )
  return (
    <IssueWorkspaceScreen
      items={postcodeChat}
      phone={<div className={styles.centre}>{detail}</div>}
      sidebar={boardSidebar(true, 'guest-postcode')}
      tools={tools}
      viewport={viewport}
      workspace={postcodeWorkspace}
    />
  )
}
