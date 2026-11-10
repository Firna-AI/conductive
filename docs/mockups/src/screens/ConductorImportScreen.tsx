import type { SchemaProps } from '@mokly/mokly'
import type { ReactNode } from 'react'
import { ArrowDownToLine } from 'lucide-react'
import { ConsentAlert } from '../components/conductor-import/ConsentAlert'
import { ImportOffer } from '../components/conductor-import/ImportOffer'
import { AppFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { MacScreen } from '../components/mac/MacScreen'
import {
  sectionsWithImport,
  workspaceSections,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { importedWorkspaces } from '../fixtures/importedWorkspaces'
import { memberViewer, people, viewerMembership } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import { paths } from '../paths'
import { AccountScreen, accountGeneral } from './AccountScreen'
import {
  ImportPageBody,
  rowsOf,
  selectedOf,
  type PageStep,
} from './conductorImportParts'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace } from './workspaceState'

export const conductorImportSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['step', 'selection', 'rows', 'viewer'],
  properties: {
    /**
     * The step of the import: the one-time offer over a workspace, the
     * entry in the settings, the question of the Mac app before its first
     * read, the read, the answer Don't Allow, the list, the upload, and its
     * end.
     */
    step: {
      enum: [
        'offer',
        'settings',
        'consent',
        'reading',
        'denied',
        'list',
        'progress',
        'done',
      ],
    },
    /** The rows that the list selects: two, all, one, or none. */
    selection: { enum: ['two', 'all', 'one', 'none'] },
    /**
     * What the list finds: the workspaces of Conductor, the same after the
     * first import, whose two rows link to their workspaces, or none.
     */
    rows: { enum: ['first', 'after-import', 'none'] },
    /** The person signed in: an admin of the org, or a member who is not. */
    viewer: { enum: ['admin', 'member'] },
  },
} as const

export type ConductorImportState = SchemaProps<typeof conductorImportSchema>

/** The list of the first import, with the first two rows selected. */
export const firstImport: ConductorImportState = {
  step: 'list',
  selection: 'two',
  rows: 'first',
  viewer: 'admin',
}

/** Import, with the count of the selection. The first import leads on. */
function ImportButton(props: { state: ConductorImportState }) {
  const count = selectedOf(props.state, rowsOf(props.state)).size
  const label =
    count === 1 ? 'Import 1 workspace' : `Import ${count} workspaces`
  const button = (
    <ActionButton disabled={count === 0} icon={ArrowDownToLine} tone="primary">
      {count === 0 ? 'Import' : label}
    </ActionButton>
  )
  const first = props.state.rows === 'first' && props.state.selection === 'two'
  return first ? (
    <ScreenLink asChild to={paths.macImportProgress}>
      {button}
    </ScreenLink>
  ) : (
    button
  )
}

/**
 * The page of the import, beside the sidebar of the org. The import makes
 * each workspace at once, so the sidebar shows Import from Conductor from
 * the upload on, and on a later visit.
 */
function ImportPage(props: { state: ConductorImportState; step: PageStep }) {
  const { state } = props
  const member = state.viewer === 'member'
  const afterImport =
    state.step === 'progress' ||
    state.step === 'done' ||
    state.rows === 'after-import'
  const sections = afterImport
    ? sectionsWithImport(importedWorkspaces)
    : workspaceSections()
  const list = state.step === 'list' && state.rows !== 'none'
  return (
    <AppFrame
      rail={{ ...acmeRail, person: member ? people[memberViewer] : undefined }}
      sidebar={
        <Sidebar
          org={orgs.acme}
          sections={sections}
          viewer={viewerMembership(state.viewer)}
        />
      }
    >
      <Page
        actions={list ? <ImportButton state={state} /> : undefined}
        subtitle={orgs.acme.name}
        title="Import from Conductor"
        viewport="desktop"
      >
        <ImportPageBody state={state} step={props.step} />
      </Page>
    </AppFrame>
  )
}

function pageOf(state: ConductorImportState): ReactNode {
  switch (state.step) {
    case 'offer':
      return <WorkspaceScreen state={readyWorkspace} viewport="desktop" />
    case 'settings':
      return <AccountScreen state={accountGeneral} viewport="desktop" />
    default:
      return <ImportPage state={state} step={state.step} />
  }
}

/**
 * The import from Conductor in the Mac app, the only app that imports. It
 * reads the local data of Conductor on this Mac, after the person allows
 * it in an alert of the Mac app. The app has no phone layout, so a phone
 * view shows the same screen, smaller.
 */
export function ConductorImportScreen(props: { state: ConductorImportState }) {
  const { step } = props.state
  return (
    <MacScreen
      active={step !== 'consent'}
      banner={step === 'offer' ? <ImportOffer /> : undefined}
      mode="window"
      notification={step === 'consent' ? <ConsentAlert /> : undefined}
    >
      {pageOf(props.state)}
    </MacScreen>
  )
}
