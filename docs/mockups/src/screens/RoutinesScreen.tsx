import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Plus, Repeat } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { EmptyState } from '../components/common/EmptyState'
import { ScreenLink } from '../components/common/ScreenLink'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { RoutineList } from '../components/routines/RoutineList'
import { SectionText } from '../components/settings/Section'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { orgs } from '../fixtures/orgs'
import { routineRows } from '../fixtures/routineRuns'
import { paths } from '../paths'

export const routinesSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['list'],
  properties: {
    /** The routines of Acme, or an org that has none yet. */
    list: { enum: ['routines', 'empty'] },
  },
} as const

export type RoutinesState = SchemaProps<typeof routinesSchema>

const org = orgs.acme

/** What a routine does, in the words of the page. */
const routineWords =
  'A routine runs a saved prompt on a schedule or on a pull request event, each time in a new workspace.'

const newRoutine = (
  <ScreenLink asChild to={paths.newRoutine}>
    <ActionButton icon={Plus} tone="primary">
      New routine
    </ActionButton>
  </ScreenLink>
)

/**
 * The routines of the org, which the Routines link of the sidebar opens.
 * Every member sees every routine. New routine opens an empty routine.
 */
export function RoutinesScreen(props: {
  state: RoutinesState
  viewport: Viewport
}) {
  const { viewport } = props
  const mobile = viewport === 'mobile'
  const empty = props.state.list === 'empty'
  const page = (
    <Page
      actions={empty ? undefined : newRoutine}
      back={mobile ? { label: 'Workspaces', to: paths.shell } : undefined}
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
          <SectionText muted>{routineWords}</SectionText>
          <RoutineList rows={routineRows} viewport={viewport} />
        </>
      )}
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return (
    <AppFrame
      sidebar={
        <Sidebar current="routines" org={org} sections={workspaceSections()} />
      }
    >
      {page}
    </AppFrame>
  )
}
