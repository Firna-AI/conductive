import { useEffect, type ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Plus, Repeat } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { SuspendedOrgNotice } from '../../../docs/mockups/src/components/orgs/SuspendedOrgNotice'
import { SectionText } from '../../../docs/mockups/src/components/settings/Section'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgAccess, useOrgModel } from '../context'
import { Page } from '../layout/Page'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { LoadFailure } from '../ui/LoadFailure'
import ui from '../ui/ui.module.css'
import { routineWords } from './routine-copy'
import { RoutineList } from './RoutineList'

/**
 * The routines of the org, which the Routines link of the sidebar and of
 * the phone list opens. Every member sees every routine, and New routine
 * opens an empty routine. An org without routines says what a routine
 * does, with one New routine. A suspended org shows its notice first, and
 * its routines without New routine, because nothing in it can change.
 */
export function RoutinesScreen(props: { org: OrgSummary }) {
  const { org } = props
  const model = useOrgModel(org.id)
  const routines = useStore(model.routines)
  const repositories = useStore(model.repositories)
  const { suspended } = useOrgAccess(org)
  const theme = useSharedUiTheme()
  const go = useGo()
  useEffect(() => model.watch('routines', 'repositories'), [model])
  const listed = routines.state === 'ready' ? routines.value : null
  const empty = listed !== null && listed.length === 0 && !suspended
  const newRoutine = (
    <ActionButton
      icon={Plus}
      onPress={() => go(routes.newRoutine(org.id))}
      tone="primary"
    >
      New routine
    </ActionButton>
  )
  let body: ReactNode
  if (routines.state === 'failed') {
    body = (
      <LoadFailure
        error={routines.error}
        retry={() => model.reload('routines')}
        title="The routines didn't load"
      />
    )
  } else if (listed === null || repositories.state === 'loading') {
    body = (
      <div className={ui.center}>
        <Spinner
          accessibilityLabel="Loading the routines"
          color={theme.colors.muted}
          size={13}
        />
      </div>
    )
  } else if (empty) {
    body = (
      <EmptyState
        action={newRoutine}
        body={routineWords}
        icon={Repeat}
        title={`Create the first routine in ${org.name}`}
      />
    )
  } else {
    body = (
      <>
        <SectionText muted>{routineWords}</SectionText>
        {listed.length > 0 ? (
          <RoutineList
            orgId={org.id}
            repositories={
              repositories.state === 'ready' ? repositories.value : []
            }
            routines={listed}
          />
        ) : null}
      </>
    )
  }
  return (
    <Page
      actions={
        listed !== null && listed.length > 0 && !suspended
          ? newRoutine
          : undefined
      }
      back={{ label: 'Workspaces', to: routes.org(org.id) }}
      fill={empty}
      subtitle={org.name}
      title="Routines"
    >
      {suspended ? <SuspendedOrgNotice org={org} /> : null}
      {body}
    </Page>
  )
}
