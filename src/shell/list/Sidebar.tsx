import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/workspaces/Sidebar.module.css'
import links from '../../../docs/mockups/src/components/workspaces/SidebarLinks.module.css'
import { latestBuild } from '../../app/org-model'
import { routes } from '../../app/router'
import { useStore, valueOf } from '../../app/store'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgModel } from '../context'
import { AppLink } from '../ui/AppLink'
import ui from '../ui/ui.module.css'
import { OrgList } from './OrgList'
import type { RowVariant } from './WorkspaceRow'

/** What the main area shows, when the list links to it. */
export type ListCurrent =
  | { screen: 'settings' }
  | { screen: 'new-workspace' }
  | { screen: 'workspace'; workspaceId: string }
  | null

/**
 * The link to the settings of the org. A dot says that something there needs
 * the user: the last build of the cloud computer failed.
 */
export function SettingsLink(props: { orgId: string; current: boolean }) {
  const org = useOrgModel(props.orgId)
  const builds = valueOf(useStore(org.builds))
  useEffect(() => org.watch('builds'), [org])
  const alert = builds ? latestBuild(builds)?.state === 'failed' : false
  return (
    <AppLink
      aria-current={props.current ? 'page' : undefined}
      className={classes(links.settings, props.current && links.current)}
      to={routes.settings(props.orgId)}
    >
      {alert ? <span aria-hidden className={links.alert} /> : null}
      Settings
      {alert ? <span className={ui.hidden}>, a build failed</span> : null}
    </AppLink>
  )
}

/** The row at the top of the list that starts a new workspace in General. */
export function NewWorkspaceLink(props: {
  orgId: string
  current: boolean
  variant: RowVariant
}) {
  return (
    <AppLink
      aria-current={props.current ? 'page' : undefined}
      className={classes(
        links.newWorkspace,
        props.variant === 'page' && links.page,
        props.current && links.selected,
      )}
      to={routes.newWorkspace(props.orgId)}
    >
      <Plus aria-hidden className={links.plus} size={14} />
      New workspace
    </AppLink>
  )
}

/**
 * The desktop sidebar beside the org rail: the org name with its Settings
 * link, New workspace, and the sections of the org.
 */
export function Sidebar(props: { org: OrgSummary; current: ListCurrent }) {
  const { org, current } = props
  return (
    <>
      <div className={styles.top}>
        <h2 className={styles.org}>{org.name}</h2>
        <SettingsLink current={current?.screen === 'settings'} orgId={org.id} />
      </div>
      <div className={styles.scroll}>
        <NewWorkspaceLink
          current={current?.screen === 'new-workspace'}
          orgId={org.id}
          variant="sidebar"
        />
        <OrgList
          orgId={org.id}
          selectedId={
            current?.screen === 'workspace' ? current.workspaceId : null
          }
          variant="sidebar"
        />
      </div>
    </>
  )
}
