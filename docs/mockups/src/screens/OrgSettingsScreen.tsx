import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { LeaveOrgDialog } from '../components/members/LeaveOrgDialog'
import { RemoveMemberDialog } from '../components/members/RemoveMemberDialog'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { DeleteOrgDialog } from '../components/settings/DeleteOrgDialog'
import {
  SettingsTabs,
  suspendedSettingsLinks,
} from '../components/settings/OrgSections'
import {
  suspendedSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { memberViewer, people } from '../fixtures/members'
import { orgList, orgs } from '../fixtures/orgs'
import { paths } from '../paths'
import { settingsViewer, TabBody } from './orgSettingsTabs'

export const orgSettingsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tab', 'build', 'dialog', 'viewer', 'org'],
  properties: {
    tab: { enum: ['general', 'repositories', 'computer', 'members'] },
    /** The builds of the cloud computer, which its tab shows. */
    build: { enum: ['ready', 'building', 'failed', 'changed'] },
    /**
     * A dialog over the page: Delete org, the removal of a member, or the
     * leave of a suspended org.
     */
    dialog: { enum: ['none', 'delete-org', 'remove-member', 'leave-org'] },
    /**
     * The person signed in: an admin, or a member who is not an admin. A
     * member sees no actions on the members, no Delete org, and the name,
     * the repositories, and the cloud computer read-only.
     */
    viewer: { enum: ['admin', 'member'] },
    /**
     * The org: in use, or suspended by the operator. A suspended org shows
     * its notice above every tab, and every person, also an admin, sees
     * the settings read-only, without Delete org. Its one action is Leave
     * org, for each person whom the last-admin rule lets leave.
     */
    org: { enum: ['active', 'suspended'] },
  },
} as const

export type OrgSettingsState = SchemaProps<typeof orgSettingsSchema>

/** The settings of Acme, on its General tab, with no dialog open. */
export const acmeSettings: OrgSettingsState = {
  tab: 'general',
  build: 'ready',
  dialog: 'none',
  viewer: 'admin',
  org: 'active',
}

const org = orgs.acme

/**
 * The settings of an org: its name and initials, the repositories that it
 * uses, its cloud computer, and its members. The app-wide connections live
 * in the account. Only an admin changes the members and deletes the org. A
 * suspended org shows its notice first, and nobody changes its settings.
 */
export function OrgSettingsScreen(props: {
  state: OrgSettingsState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const admin = state.viewer === 'admin'
  const suspended = state.org === 'suspended'
  const mobile = viewport === 'mobile'
  // A suspended org opens only the leave, because nothing else in it can
  // change. An org in use has no Leave org.
  const dialogs: Readonly<Record<OrgSettingsState['dialog'], ReactNode>> = {
    none: null,
    'delete-org': suspended ? null : <DeleteOrgDialog viewport={viewport} />,
    'remove-member': suspended ? null : (
      <RemoveMemberDialog viewport={viewport} />
    ),
    'leave-org': suspended ? (
      <LeaveOrgDialog viewer={settingsViewer(state)} viewport={viewport} />
    ) : null,
  }
  const dialog = dialogs[state.dialog]
  const list = suspended ? paths.suspendedOrg : paths.shell
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: list } : undefined}
      subtitle="Org settings"
      tabs={
        <SettingsTabs
          links={suspended ? suspendedSettingsLinks : undefined}
          tab={state.tab}
          wrap={mobile}
        />
      }
      title={org.name}
      viewport={viewport}
    >
      {suspended ? <SuspendedOrgNotice org={org} /> : null}
      <TabBody state={state} />
    </Page>
  )
  if (mobile) {
    return (
      <MobileFrame>
        {page}
        {dialog}
      </MobileFrame>
    )
  }
  const sidebar = (
    <Sidebar
      current="settings"
      org={org}
      sections={suspended ? suspendedSections() : workspaceSections()}
      settingsAlert={state.build === 'failed'}
      suspended={suspended}
    />
  )
  return (
    <AppFrame
      overlay={dialog}
      rail={{
        orgs: orgList,
        current: org.key,
        suspended: suspended ? org.key : undefined,
        person: admin ? undefined : people[memberViewer],
      }}
      sidebar={sidebar}
    >
      {page}
    </AppFrame>
  )
}
