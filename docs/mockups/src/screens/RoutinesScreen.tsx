import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Plus, Repeat } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { EmptyState } from '../components/common/EmptyState'
import { ScreenLink } from '../components/common/ScreenLink'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { acmeRail } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { RoutineList } from '../components/routines/RoutineList'
import { SectionText } from '../components/settings/Section'
import {
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { orgs, suspendedOrg } from '../fixtures/orgs'
import { routineRows, suspendedRoutineRows } from '../fixtures/routineRows'
import { paths } from '../paths'

export const routinesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list', 'org'],
  properties: {
    /** The routines of Acme, or an org that has none yet. */
    list: { enum: ['routines', 'empty'] },
    /**
     * The org: in use, or suspended by the operator. A suspended org keeps
     * every read, so its members read its routines, without New routine.
     */
    org: { enum: ['active', 'suspended'] },
  },
} as const

export type RoutinesState = SchemaProps<typeof routinesSchema>

const org = orgs.acme

/** What a routine does, in the words of the page. */
const routineWords =
  'A routine runs a saved prompt on a schedule or on a pull request event, each time in a new workspace.'

/** The routine pages that the mockups draw, as Cal opens them. */
const routineLinks: Readonly<Record<string, string>> = {
  'review-prs': paths.routine,
  'dependency-updates': paths.routineAdmin,
  'copy-review': paths.routineOwnerLeft,
  'error-triage': paths.routineTurnedOff,
}

const suspendedLinks: Readonly<Record<string, string>> = {
  'review-prs': paths.suspendedRoutine,
}

const newRoutine = (
  <ScreenLink asChild to={paths.newRoutine}>
    <ActionButton icon={Plus} tone="primary">
      New routine
    </ActionButton>
  </ScreenLink>
)

/**
 * The routines of the org, which the Routines link of the sidebar opens.
 * Every member sees every routine. New routine opens an empty routine. A
 * suspended org shows its notice first, and no New routine.
 */
export function RoutinesScreen(props: {
  state: RoutinesState
  viewport: Viewport
}) {
  const { viewport } = props
  const mobile = viewport === 'mobile'
  const suspended = props.state.org === 'suspended'
  const empty = props.state.list === 'empty' && !suspended
  const list = suspended ? paths.suspendedOrg : paths.shell
  const page = (
    <Page
      actions={empty || suspended ? undefined : newRoutine}
      back={mobile ? { label: 'Workspaces', to: list } : undefined}
      fill={empty}
      subtitle={org.name}
      title="Routines"
      viewport={viewport}
    >
      {empty ? (
        <EmptyState
          action={newRoutine}
          body={routineWords}
          icon={Repeat}
          title={`Create the first routine in ${org.name}`}
        />
      ) : (
        <>
          {suspended ? <SuspendedOrgNotice org={orgs[suspendedOrg]} /> : null}
          <SectionText muted>{routineWords}</SectionText>
          <RoutineList
            links={suspended ? suspendedLinks : routineLinks}
            rows={suspended ? suspendedRoutineRows : routineRows}
            viewport={viewport}
          />
        </>
      )}
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return (
    <AppFrame
      rail={{ ...acmeRail, suspended: suspended ? suspendedOrg : undefined }}
      sidebar={
        <Sidebar
          current="routines"
          org={org}
          sections={suspended ? suspendedSections() : workspaceSections()}
          suspended={suspended}
        />
      }
    >
      {page}
    </AppFrame>
  )
}
