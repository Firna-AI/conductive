import { useEffect } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { SearchX } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import { SuspendedOrgNotice } from '../../../docs/mockups/src/components/orgs/SuspendedOrgNotice'
import { newRoutineDraft } from '../../app/routine-draft'
import { routineModel } from '../../app/routine-model'
import { routes, type RoutineTab } from '../../app/router'
import { useServices } from '../../app/services'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgAccess, useOrgModel } from '../context'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { LoadFailure } from '../ui/LoadFailure'
import ui from '../ui/ui.module.css'
import { RoutineEditor } from './RoutineEditor'
import { RoutineFrame } from './RoutineFrame'
import { RoutineReader } from './RoutineReader'

function Waiting(props: { org: OrgSummary; title: string }) {
  const theme = useSharedUiTheme()
  return (
    <RoutineFrame org={props.org} title={props.title}>
      <div className={ui.center}>
        <Spinner
          accessibilityLabel="Loading the routine"
          color={theme.colors.muted}
          size={13}
        />
      </div>
    </RoutineFrame>
  )
}

/** A routine that the org no longer has, such as one that was deleted. */
function Missing(props: { org: OrgSummary }) {
  const go = useGo()
  return (
    <RoutineFrame org={props.org} title="Routine">
      <EmptyState
        action={
          <ActionButton
            onPress={() => go(routes.routines(props.org.id))}
            tone="primary"
          >
            Open Routines
          </ActionButton>
        }
        icon={SearchX}
        title="This routine is not available"
      />
    </RoutineFrame>
  )
}

function SavedRoutine(props: {
  org: OrgSummary
  routineId: string
  tab: RoutineTab
  user: User
}) {
  const { org } = props
  const orgModel = useOrgModel(org.id)
  const model = routineModel(orgModel, props.routineId)
  const routine = useStore(model.routine)
  const runs = useStore(model.runs.shown)
  const repositories = useStore(orgModel.repositories)
  const sections = useStore(orgModel.sections)
  const { suspended } = useOrgAccess(org)
  // The runs read with the routine, and stop when the routine fails to read.
  const failed = routine.state === 'failed'
  useEffect(() => model.watch(), [model])
  useEffect(() => (failed ? undefined : model.runs.watch()), [model, failed])
  useEffect(() => orgModel.watch('repositories', 'list', 'members'), [orgModel])
  if (routine.state === 'failed') {
    if (routine.error.code === 'routine_not_found') return <Missing org={org} />
    return (
      <RoutineFrame org={org} title="Routine">
        <LoadFailure
          error={routine.error}
          retry={() => model.reload()}
          title="The routine didn't load"
        />
      </RoutineFrame>
    )
  }
  if (
    routine.state === 'loading' ||
    repositories.state === 'loading' ||
    sections.state === 'loading'
  ) {
    return <Waiting org={org} title="Routine" />
  }
  const shared = {
    repositories: repositories.state === 'ready' ? repositories.value : [],
    sections: sections.state === 'ready' ? sections.value : [],
    tab: props.tab,
    runs: {
      routine: routine.value,
      runs,
      loadOlder: () => model.runs.loadOlder(),
      retry: () => model.runs.reload(),
    },
  }
  if (!suspended && routine.value.owner.id === props.user.id) {
    return (
      <RoutineEditor
        org={org}
        routine={routine.value}
        user={props.user}
        {...shared}
      />
    )
  }
  return (
    <RoutineReader
      access={
        suspended ? 'suspended' : org.role === 'admin' ? 'admin' : 'member'
      }
      org={org}
      routine={routine.value}
      {...shared}
    />
  )
}

/**
 * A new routine: active, in the first chosen repository and General, with
 * the owner's default model and the time zone of the browser. A suspended
 * org creates nothing, so it shows only its notice.
 */
function NewRoutine(props: { org: OrgSummary; user: User }) {
  const { org } = props
  const app = useApp()
  const orgModel = useOrgModel(org.id)
  const account = useStore(app.account.account)
  const repositories = useStore(orgModel.repositories)
  const sections = useStore(orgModel.sections)
  const { suspended } = useOrgAccess(org)
  const { timeZone } = useServices()
  useEffect(() => orgModel.watch('repositories', 'list', 'members'), [orgModel])
  if (suspended) {
    return (
      <RoutineFrame org={org} title="New routine">
        <SuspendedOrgNotice org={org} />
      </RoutineFrame>
    )
  }
  if (
    !account ||
    repositories.state === 'loading' ||
    sections.state === 'loading'
  ) {
    return <Waiting org={org} title="New routine" />
  }
  const lists = {
    repositories: repositories.state === 'ready' ? repositories.value : [],
    sections: sections.state === 'ready' ? sections.value : [],
  }
  const initial = newRoutineDraft({
    ...lists,
    choice: account.defaultChoice,
    timeZone: timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  return (
    <RoutineEditor
      initial={initial}
      org={org}
      routine={null}
      runs={null}
      tab="routine"
      user={props.user}
      {...lists}
    />
  )
}

/**
 * The page of a routine, or of a new routine when `routineId` is null,
 * with its runs. Its owner changes it and uses Run now. Every other member
 * reads it, and an admin can also turn it off and delete it. A suspended
 * org shows it read-only to all. `tab` is the tab that a phone shows.
 */
export function RoutineScreen(props: {
  org: OrgSummary
  routineId: string | null
  tab: RoutineTab
  user: User
}) {
  if (props.routineId === null) {
    return <NewRoutine org={props.org} user={props.user} />
  }
  return (
    <SavedRoutine
      org={props.org}
      routineId={props.routineId}
      tab={props.tab}
      user={props.user}
    />
  )
}
