import type { Viewport } from '@mokly/mokly'
import { ChevronDown, GitCompare, Play } from 'lucide-react'
import { AgentMark } from '../../components/chat/AgentMark'
import { ActionButton } from '../../components/common/actions'
import { Menu } from '../../components/common/Menu'
import { ScreenLink } from '../../components/common/ScreenLink'
import { IssueDetail } from '../../components/issues/IssueDetail'
import { IssueLine } from '../../components/issues/IssueLine'
import { issuePaths } from '../../components/issues/issuePaths'
import {
  issuesAt,
  parentSections,
  postcodeAttempts,
} from '../../components/issues/issueSections'
import { IssueSidebar } from '../../components/issues/IssueSidebar'
import { IssueWorkspaces } from '../../components/issues/IssueWorkspaces'
import { Page } from '../../components/layout/Page'
import { postcodeIssue, type Issue } from '../../fixtures/issues'
import {
  postcodeChat,
  postcodeCodexWorkspace,
} from '../../fixtures/issueWorkspaces'
import { paths } from '../../paths'
import { IssueFrame } from './issueFrame'
import { IssueWorkspaceScreen } from './IssueWorkspaceScreen'
import { createdActivity } from './PageScreens'
import styles from './ParentScreens.module.css'

const viewer = { person: 'cal', role: 'admin' } as const

const links = {
  [postcodeIssue.key]: issuePaths.parentAttempts,
  'guest-postcode-claude': issuePaths.parentWorkspace,
  'guest-postcode-codex': issuePaths.parentWorkspace,
  'checkout-autocomplete': paths.app,
}

/**
 * The sidebar of variation C: each issue with workspaces heads their tree.
 * Issues that wait for a start stay on the Issues page.
 */
function parentSidebar(started: boolean, open?: string) {
  return (
    <IssueSidebar
      current={open === undefined ? 'issues' : undefined}
      issuesCount={started ? 1 : 2}
      issuesTo={issuePaths.pageList}
      items={parentSections({
        open,
        links,
        started: started ? postcodeAttempts : undefined,
        statuses: inReview,
      })}
      viewer={viewer}
    />
  )
}

/** The pull request of the Claude attempt moved the issue to In review. */
const inReview = { [postcodeIssue.key]: 'in-review' } as const

/** The postcode issue, before or after the start of its two attempts. */
function postcodeAt(started: boolean): Issue {
  const issue = issuesAt({
    started: started ? postcodeAttempts : undefined,
    statuses: inReview,
  }).find((item) => item.key === postcodeIssue.key)
  return issue ?? postcodeIssue
}

/** The ways to start, in the menu of Start. */
const startMenu = [
  { kind: 'label', label: 'Start' },
  {
    kind: 'item',
    label: 'One workspace',
    muted: 'Claude',
    mark: <AgentMark agent="claude" />,
  },
  {
    kind: 'item',
    label: 'Two attempts',
    muted: 'Claude and Codex',
    icon: GitCompare,
    highlighted: true,
  },
  {
    kind: 'item',
    label: 'Plan, then split',
    muted: 'The agent makes sub-workspaces',
  },
  { kind: 'divider' },
  {
    kind: 'note',
    text: 'Each attempt has its own cloud computer, branch, and pull request.',
  },
] as const

/**
 * Start, with a menu of the ways to start. `open` draws the menu, because
 * a view runs no script.
 */
function StartMenuButton(props: { open: boolean }) {
  return (
    <span className={styles.anchor}>
      <ScreenLink
        asChild
        to={props.open ? issuePaths.parentAttempts : issuePaths.parentStart}
      >
        <ActionButton
          expanded={props.open}
          icon={Play}
          menu
          tone="primary"
          trailing={<ChevronDown aria-hidden size={13} />}
        >
          Start
        </ActionButton>
      </ScreenLink>
      {props.open ? (
        <Menu entries={startMenu} label="Start" placement="below-end" />
      ) : null}
    </span>
  )
}

/** The changes of each attempt, for the comparison. */
const attemptStats = {
  'guest-postcode-claude': { added: 42, removed: 9, files: 3 },
  'guest-postcode-codex': { added: 61, removed: 14, files: 4 },
}

/**
 * Variation C: the issue is the hub of its work. Start can open one
 * workspace, two attempts with different agents, or a plan that the agent
 * splits into sub-workspaces. `stage` draws the issue before its start,
 * with the menu of Start open, or with its two attempts.
 */
export function ParentHubScreen(props: {
  viewport: Viewport
  stage: 'todo' | 'menu' | 'attempts'
}) {
  const { viewport, stage } = props
  const started = stage === 'attempts'
  const issue = postcodeAt(started)
  return (
    <IssueFrame
      sidebar={parentSidebar(started, started ? issue.key : undefined)}
      viewport={viewport}
    >
      <Page
        back={{ label: 'Issues', to: issuePaths.pageList }}
        fill
        title="I-31"
        viewport={viewport}
      >
        <IssueDetail
          activity={
            started
              ? [
                  ...createdActivity,
                  {
                    who: 'cal',
                    text: 'started two attempts: W-403 with Claude, W-404 with Codex',
                    time: '20m',
                  },
                  {
                    text: 'W-403 opened pull request #491, and its checks passed',
                    time: '4m',
                  },
                  {
                    text: 'Moved to In review, because W-403 opened pull request #491',
                    time: '4m',
                  },
                  { text: 'W-404 opened pull request #492', time: '1m' },
                ]
              : createdActivity
          }
          issue={issue}
          viewport={viewport}
          workspaces={
            <IssueWorkspaces
              links={links}
              more={issuePaths.parentStart}
              start={<StartMenuButton open={stage === 'menu'} />}
              startNote="Start one workspace, or two attempts to compare."
              stats={attemptStats}
              title={started ? 'Attempts' : 'Workspaces'}
              workspaces={issue.workspaces}
            />
          }
        />
      </Page>
    </IssueFrame>
  )
}

/**
 * Variation C: the Codex attempt, under its issue in the list. The line
 * under the header names the issue and its count of attempts.
 */
export function ParentWorkspaceScreen(props: { viewport: Viewport }) {
  const issue = postcodeAt(true)
  return (
    <IssueWorkspaceScreen
      items={postcodeChat}
      sidebar={parentSidebar(true, 'guest-postcode-codex')}
      under={
        <IssueLine count={2} issue={issue} to={issuePaths.parentAttempts} />
      }
      viewport={props.viewport}
      workspace={postcodeCodexWorkspace}
    />
  )
}
