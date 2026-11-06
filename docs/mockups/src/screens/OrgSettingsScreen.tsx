import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { MembersTab } from '../components/members/MembersTab'
import { RemoveMemberDialog } from '../components/members/RemoveMemberDialog'
import { BoatKeyTab, boatKeyStates } from '../components/settings/BoatKeyTab'
import { ComputerTab } from '../components/settings/ComputerTab'
import { DeleteOrgDialog } from '../components/settings/DeleteOrgDialog'
import {
  DeleteOrgSection,
  OrgDetailsSection,
  SettingsTabs,
} from '../components/settings/OrgSections'
import {
  OrgRepositoryList,
  RepositoryList,
} from '../components/settings/RepositoryList'
import { Section } from '../components/settings/Section'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { memberViewer, people, you } from '../fixtures/members'
import { orgList, orgs } from '../fixtures/orgs'
import { acmeRepositories } from '../fixtures/repositories'
import { paths } from '../paths'

export const orgSettingsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tab', 'build', 'boatKey', 'dialog', 'viewer'],
  properties: {
    tab: {
      enum: ['general', 'repositories', 'computer', 'boat-key', 'members'],
    },
    /** The builds of the cloud computer, which its tab shows. */
    build: { enum: ['ready', 'building', 'failed', 'changed'] },
    /** The Boat key of the org, which its tab shows to an admin. */
    boatKey: { enum: boatKeyStates },
    /** A dialog over the page: Delete org, or the removal of a member. */
    dialog: { enum: ['none', 'delete-org', 'remove-member'] },
    /**
     * The person signed in: an admin, or a member who is not an admin. A
     * member sees no actions on the members, no Boat key, no Delete org,
     * and the name, the repositories, and the cloud computer read-only.
     */
    viewer: { enum: ['admin', 'member'] },
  },
} as const

export type OrgSettingsState = SchemaProps<typeof orgSettingsSchema>

/** The settings of Acme, on its General tab, with no dialog open. */
export const acmeSettings: OrgSettingsState = {
  tab: 'general',
  build: 'ready',
  boatKey: 'saved',
  dialog: 'none',
  viewer: 'admin',
}

const org = orgs.acme

function TabBody(props: { state: OrgSettingsState }) {
  const { state } = props
  const admin = state.viewer === 'admin'
  switch (state.tab) {
    case 'general':
      return (
        <>
          <OrgDetailsSection
            initials={org.initials}
            name={org.name}
            readOnly={!admin}
          />
          {admin ? <DeleteOrgSection name={org.name} /> : null}
        </>
      )
    case 'repositories':
      return (
        <Section
          description={`The cloud computer of ${org.name} holds these repositories, and its workspaces start in them. ${admin ? 'A change takes effect at the next build.' : 'Only an admin can change them.'}`}
          title="Repositories"
        >
          {admin ? (
            <RepositoryList repositories={acmeRepositories} search="" />
          ) : (
            <OrgRepositoryList repositories={acmeRepositories} />
          )}
        </Section>
      )
    case 'computer':
      return (
        <ComputerTab build={state.build} org={org.name} readOnly={!admin} />
      )
    case 'boat-key':
      return admin ? <BoatKeyTab org={org.name} state={state.boatKey} /> : null
    case 'members':
      return (
        <MembersTab canManage={admin} viewer={admin ? you : memberViewer} />
      )
  }
}

/**
 * The settings of an org: its name and initials, the repositories that it
 * uses, its cloud computer, its Boat key, and its members. The app-wide
 * connections live in the account. Only an admin sees the Boat key,
 * changes the members, and deletes the org.
 */
export function OrgSettingsScreen(props: {
  state: OrgSettingsState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const admin = state.viewer === 'admin'
  const mobile = viewport === 'mobile'
  const dialogs: Readonly<Record<OrgSettingsState['dialog'], ReactNode>> = {
    none: null,
    'delete-org': <DeleteOrgDialog viewport={viewport} />,
    'remove-member': <RemoveMemberDialog viewport={viewport} />,
  }
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: paths.shell } : undefined}
      subtitle="Org settings"
      tabs={<SettingsTabs admin={admin} tab={state.tab} wrap={mobile} />}
      title={org.name}
      viewport={viewport}
    >
      <TabBody state={state} />
    </Page>
  )
  if (mobile) {
    return (
      <MobileFrame>
        {page}
        {dialogs[state.dialog]}
      </MobileFrame>
    )
  }
  const sidebar = (
    <Sidebar
      current="settings"
      org={org}
      sections={workspaceSections()}
      settingsAlert={state.build === 'failed'}
    />
  )
  return (
    <AppFrame
      overlay={dialogs[state.dialog]}
      rail={{
        orgs: orgList,
        current: org.key,
        person: admin ? undefined : people[memberViewer],
      }}
      sidebar={sidebar}
    >
      {page}
    </AppFrame>
  )
}
