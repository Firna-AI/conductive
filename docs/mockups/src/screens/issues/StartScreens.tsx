import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { CornerDownLeft } from 'lucide-react'
import { MessageField } from '../../components/chat/MessageField'
import { ActionButton } from '../../components/common/actions'
import { ScreenLink } from '../../components/common/ScreenLink'
import { IssueLine } from '../../components/issues/IssueLine'
import { issuePaths } from '../../components/issues/issuePaths'
import { postcodeStarted } from '../../components/issues/issueSections'
import { StartNote } from '../../components/issues/StartNote'
import { MobileFrame } from '../../components/layout/AppFrame'
import { Page } from '../../components/layout/Page'
import { NewWorkspaceDialog } from '../../components/new-workspace/NewWorkspaceDialog'
import { defaultChoice } from '../../fixtures/agents'
import { postcodeIssue } from '../../fixtures/issues'
import {
  postcodeChat,
  postcodeFirstMessage,
  postcodeWorkspace,
} from '../../fixtures/issueWorkspaces'
import { IssueWorkspaceScreen } from './IssueWorkspaceScreen'
import { IssuePageScreen, pageSidebar } from './PageScreens'
import styles from './IssueScreens.module.css'

/**
 * New workspace, filled in from the issue: its repository, its section,
 * and a first message with its label, title, and description. The note
 * says that the workspace links to the issue. A phone opens the New
 * workspace page in place of the dialog.
 */
export function StartFromIssue(props: {
  viewport: Viewport
  createTo: string
  backTo: string
  note?: string
}) {
  const note = <StartNote issue={postcodeIssue} key="issue" text={props.note} />
  if (props.viewport === 'mobile') {
    return (
      <MobileFrame>
        <Page
          actions={
            <ScreenLink asChild to={props.createTo}>
              <ActionButton
                tone="primary"
                trailing={<CornerDownLeft aria-hidden size={13} />}
              >
                Create
              </ActionButton>
            </ScreenLink>
          }
          back={{ label: 'Issue', to: props.backTo }}
          subtitle="Acme · Checkout"
          title="New workspace"
          viewport="mobile"
        >
          <div className={styles.startPage}>
            <span className={styles.repository}>acme/storefront</span>
            <MessageField
              lines={8}
              maxLines={14}
              placeholder=""
              text={postcodeFirstMessage}
            />
            {note}
          </div>
        </Page>
      </MobileFrame>
    )
  }
  return (
    <NewWorkspaceDialog
      attachments={[]}
      choice={defaultChoice}
      notices={[note]}
      place="Acme · Checkout"
      placeholder=""
      ready
      repository="acme/storefront"
      section="Checkout"
      text={postcodeFirstMessage}
    />
  )
}

/** Variation A: Start workspace opened New workspace over the issue. */
export function PageStartScreen(props: { viewport: Viewport }) {
  const dialog = (
    <StartFromIssue
      backTo={issuePaths.pageIssue}
      createTo={issuePaths.pageWorkspace}
      viewport={props.viewport}
    />
  )
  if (props.viewport === 'mobile') return dialog
  return <IssuePageScreen overlay={dialog} started={false} viewport="desktop" />
}

/**
 * The workspace that Start made, with the line of its issue under the
 * header. The line opens the issue, and its state follows the workspace.
 */
export function startedWorkspace(
  viewport: Viewport,
  options: { sidebar: ReactNode; under: ReactNode },
) {
  return (
    <IssueWorkspaceScreen
      items={postcodeChat}
      sidebar={options.sidebar}
      under={options.under}
      viewport={viewport}
      workspace={postcodeWorkspace}
    />
  )
}

/** Variation A: the new workspace, which links back to its issue. */
export function PageWorkspaceScreen(props: { viewport: Viewport }) {
  const issue = {
    ...postcodeIssue,
    status: 'in-progress' as const,
    workspaces: postcodeStarted[postcodeIssue.key],
  }
  return startedWorkspace(props.viewport, {
    sidebar: pageSidebar(true, undefined, 'guest-postcode'),
    under: <IssueLine issue={issue} to={issuePaths.pageLinked} />,
  })
}
