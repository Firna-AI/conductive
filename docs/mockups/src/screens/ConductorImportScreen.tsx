import type { ReactNode } from 'react'
import { ArrowDownToLine } from 'lucide-react'
import { ConsentAlert } from '../components/conductor-import/ConsentAlert'
import { ImportOffer } from '../components/conductor-import/ImportOffer'
import { AppFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { MacScreen } from '../components/mac/MacScreen'
import { sectionsWithImport } from '../components/workspaces/importSections'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { ActionButton } from '../components/common/actions'
import { LinkedControl } from '../components/common/LinkedControl'
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
import {
  drawnImportList,
  importLinks,
  visibleImports,
  type ImportLinks,
} from './conductorImportLinks'
import type { ConductorImportState } from './conductorImportState'
import { WorkspaceScreen } from './WorkspaceScreen'
import { readyWorkspace } from './workspaceState'

/** Import, with the count of the selection, which opens `to`. */
function ImportButton(props: {
  state: ConductorImportState
  to: string | null
}) {
  const count = selectedOf(props.state, rowsOf(props.state)).size
  const label =
    count === 1 ? 'Import 1 workspace' : `Import ${count} workspaces`
  return (
    <LinkedControl to={props.to}>
      <ActionButton
        disabled={count === 0}
        icon={ArrowDownToLine}
        tone="primary"
      >
        {count === 0 ? 'Import' : label}
      </ActionButton>
    </LinkedControl>
  )
}

/**
 * The screen that the tile of Acme opens: the drawn list after the import
 * where the org list matches it, the native list before any workspace
 * appeared, and none while only some workspaces exist.
 */
function tileOf(state: ConductorImportState): string | null | undefined {
  if (visibleImports(state).length === 0) return undefined
  return drawnImportList(state) ? paths.importedList : null
}

/**
 * The page of the import, beside the sidebar of the org. Each workspace
 * joins Import from Conductor when its own upload ends, so the sidebar
 * shows only the workspaces whose work is complete, never an unfinished
 * upload. The rows and the tile of Acme open the drawn list after the
 * import only where the sidebar matches it.
 */
function ImportPage(props: {
  state: ConductorImportState
  step: PageStep
  links: ImportLinks
}) {
  const { state, links } = props
  const member = state.viewer === 'member'
  const visible = visibleImports(state)
  const sections =
    visible.length > 0
      ? sectionsWithImport(visible, undefined, undefined, {
          live: drawnImportList(state),
        })
      : workspaceSections()
  const list = state.step === 'list' && state.rows !== 'none'
  return (
    <AppFrame
      rail={{
        ...acmeRail,
        person: member ? people[memberViewer] : undefined,
        currentTo: tileOf(state),
      }}
      sidebar={
        <Sidebar
          org={orgs.acme}
          sections={sections}
          viewer={viewerMembership(state.viewer)}
        />
      }
    >
      <Page
        actions={
          list ? <ImportButton state={state} to={links.upload} /> : undefined
        }
        subtitle={orgs.acme.name}
        title="Import from Conductor"
        viewport="desktop"
      >
        <ImportPageBody links={links} state={state} step={props.step} />
      </Page>
    </AppFrame>
  )
}

function pageOf(state: ConductorImportState, links: ImportLinks): ReactNode {
  switch (state.step) {
    case 'offer':
      return <WorkspaceScreen state={readyWorkspace} viewport="desktop" />
    case 'settings':
      return (
        <AccountScreen
          importTo={links.consent}
          state={accountGeneral}
          viewport="desktop"
        />
      )
    default:
      return <ImportPage links={links} state={state} step={state.step} />
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
  const links = importLinks(props.state)
  return (
    <MacScreen
      active={step !== 'consent'}
      banner={
        step === 'offer' ? <ImportOffer importTo={links.consent} /> : undefined
      }
      mode="window"
      notification={
        step === 'consent' ? (
          <ConsentAlert allowTo={links.reading} denyTo={links.denied} />
        ) : undefined
      }
    >
      {pageOf(props.state, links)}
    </MacScreen>
  )
}
