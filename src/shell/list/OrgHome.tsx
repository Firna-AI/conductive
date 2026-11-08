import { useEffect } from 'react'
import { FolderGit2, PanelLeft, Plus } from 'lucide-react'
import { EmptyState } from '../../../docs/mockups/src/components/common/EmptyState'
import responsive from '../../../docs/mockups/src/components/layout/responsive.module.css'
import { routes } from '../../app/router'
import { useServices } from '../../app/services'
import { useStore, valueOf } from '../../app/store'
import { DeletedOrgPage } from '../../members/DeletedOrgPage'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp, useOrgModel } from '../context'
import { useMembersApi, useMembersViewport } from '../settings/members-api'
import { ActionButton } from '../ui/actions'
import { useGo } from '../ui/AppLink'
import { HomeList } from './HomeList'
import list from './list.module.css'

/** The main area of a desktop list, which waits for the user's choice. */
function ChooseWorkspace(props: { org: OrgSummary }) {
  const model = useOrgModel(props.org.id)
  const workspaces = valueOf(useStore(model.workspaces))
  const repositories = valueOf(useStore(model.repositories))
  const go = useGo()
  useEffect(() => model.watch('repositories'), [model])
  const newWorkspace = (
    <ActionButton
      icon={Plus}
      onPress={() => go(routes.newWorkspace(props.org.id))}
      tone="primary"
    >
      New workspace
    </ActionButton>
  )
  if (workspaces === undefined || workspaces.length > 0) {
    return (
      <EmptyState
        action={newWorkspace}
        icon={PanelLeft}
        title="Choose a workspace"
      />
    )
  }
  const chosen = (repositories ?? []).filter((item) => item.selected)
  if (repositories !== undefined && chosen.length === 0) {
    const admin = props.org.role === 'admin'
    return (
      <EmptyState
        action={
          admin ? (
            <ActionButton
              icon={FolderGit2}
              onPress={() => go(routes.settings(props.org.id, 'repositories'))}
              tone="primary"
            >
              Choose repositories
            </ActionButton>
          ) : undefined
        }
        body={
          admin
            ? `Choose the repositories of ${props.org.name} first.`
            : `An admin of ${props.org.name} chooses its repositories first.`
        }
        icon={FolderGit2}
        title={`Start the first workspace in ${props.org.name}`}
      />
    )
  }
  return (
    <EmptyState
      action={newWorkspace}
      body={
        chosen.length > 0
          ? `Workspaces of ${props.org.name} start in ${chosen.map((item) => item.fullName).join(' or ')}.`
          : undefined
      }
      icon={Plus}
      title={`Start the first workspace in ${props.org.name}`}
    />
  )
}

/**
 * The page of an org that an admin deleted (decision 30): the restore page
 * of the members UI. Its cloud computers are stopped, and its members
 * cannot open it. An admin restores it until the day when everything is
 * deleted. The answer of Restore shows the org as an active org again.
 */
export function DeletedOrg(props: { org: OrgSummary }) {
  const app = useApp()
  const { timeZone } = useServices()
  return (
    <DeletedOrgPage
      api={useMembersApi()}
      onRestored={(restored) => app.putOrg(restored)}
      org={props.org}
      timeZone={timeZone}
      viewport={useMembersViewport()}
    />
  )
}

/**
 * The main area of an org. On a wide desktop the sidebar lists the
 * workspaces, so the main area waits for a choice. Below 900 px the list
 * moves into the main area.
 */
export function OrgHome(props: { org: OrgSummary; user: User }) {
  return (
    <>
      <div className={`${responsive.wideOnly} ${list.choose}`}>
        <ChooseWorkspace org={props.org} />
      </div>
      <div className={`${responsive.narrowOnly} ${list.narrowList}`}>
        <HomeList org={props.org} user={props.user} />
      </div>
    </>
  )
}
