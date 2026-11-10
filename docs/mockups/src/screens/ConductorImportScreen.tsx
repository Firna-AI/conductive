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
import { LinkedControl } from '../components/common/LinkedControl'
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
import { importedWorkspace, readyWorkspace } from './workspaceState'

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

/**
 * Where the own controls of the import flow lead, in one state of the
 * flow. Null keeps a control static.
 */
export type ImportLinks = Readonly<{
  /**
   * The question before the read, which Import of the offer, Choose
   * workspaces, and Ask again open.
   */
  consent: string | null
  /** The read, after Allow. */
  reading: string | null
  /** The answer Don't Allow. */
  denied: string | null
  /** The upload, after Import of the list. */
  progress: string | null
  /** The imported workspace that the mockups draw, which its chip opens. */
  workspace: string | null
  /** The list after the import, which the tile of Acme opens. */
  list: string | null
}>

/**
 * Whether a state equals the first import in every field of its schema
 * apart from the step. Every saved step of the flow does, so only such a
 * state has a drawn step to open.
 */
function matchesFirstImport(state: ConductorImportState): boolean {
  return conductorImportSchema.required.every(
    (field) => field === 'step' || state[field] === firstImport[field],
  )
}

/**
 * The links of the import flow, from its full state. A step opens only
 * from a state that matches the first import apart from the step, so no
 * link changes the selection, the rows, or the person signed in. The chip
 * opens its workspace only for the viewer of that example, and the tile of
 * Acme opens the list after the import only for an admin, whom that list
 * shows. Every other state keeps the control static.
 */
function importLinks(state: ConductorImportState): ImportLinks {
  const steps = matchesFirstImport(state)
  return {
    consent: steps ? paths.macImportConsent : null,
    reading: steps ? paths.macImportReading : null,
    denied: steps ? paths.macImportDenied : null,
    progress: steps ? paths.macImportProgress : null,
    workspace:
      state.viewer === importedWorkspace.viewer ? paths.imported : null,
    list: state.viewer === 'admin' ? paths.importedList : null,
  }
}

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
 * The page of the import, beside the sidebar of the org. The import makes
 * each workspace at once, so the sidebar shows Import from Conductor from
 * the upload on, and on a later visit. From then on the tile of Acme opens
 * the list with the import, or stays static where none matches.
 */
function ImportPage(props: {
  state: ConductorImportState
  step: PageStep
  links: ImportLinks
}) {
  const { state, links } = props
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
      rail={{
        ...acmeRail,
        person: member ? people[memberViewer] : undefined,
        currentTo: afterImport ? links.list : undefined,
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
          list ? <ImportButton state={state} to={links.progress} /> : undefined
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
