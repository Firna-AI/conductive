import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { BillingTab } from '../components/billing/BillingTab'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { MembersTab } from '../components/members/MembersTab'
import { RemoveMemberDialog } from '../components/members/RemoveMemberDialog'
import { ComputerTab } from '../components/settings/ComputerTab'
import { DeleteOrgDialog } from '../components/settings/DeleteOrgDialog'
import {
  DeleteOrgSection,
  OrgDetailsSection,
  SettingsTabs,
} from '../components/settings/OrgSections'
import { RepositoryList } from '../components/settings/RepositoryList'
import { Section } from '../components/settings/Section'
import {
  freeOrgSections,
  workspaceSections,
} from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { memberViewer, people, you } from '../fixtures/members'
import { orgList, orgs, type Org } from '../fixtures/orgs'
import { acmeRepositories } from '../fixtures/repositories'
import { paths } from '../paths'

export const orgSettingsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tab', 'build', 'members', 'billing', 'dialog', 'viewer'],
  properties: {
    tab: {
      enum: ['general', 'repositories', 'computer', 'members', 'billing'],
    },
    /** The builds of the cloud computer, which its tab shows. */
    build: { enum: ['ready', 'building', 'failed', 'changed'] },
    /** The members tab: Acme on Team, or the free org that tries to invite. */
    members: { enum: ['team', 'free'] },
    /** The billing tab: Acme on Team, the free org, its upgrade, or after. */
    billing: { enum: ['team', 'free', 'upgrade', 'upgraded'] },
    /** A dialog over the page: Delete org, or the removal of a member. */
    dialog: { enum: ['none', 'delete-org', 'remove-member'] },
    /**
     * The person signed in: an owner, or a member who is not an owner and
     * sees no Billing tab and no actions on the members.
     */
    viewer: { enum: ['owner', 'member'] },
  },
} as const

export type OrgSettingsState = SchemaProps<typeof orgSettingsSchema>

/** The settings of Acme, on its General tab, with no dialog open. */
export const acmeSettings: OrgSettingsState = {
  tab: 'general',
  build: 'ready',
  members: 'team',
  billing: 'team',
  dialog: 'none',
  viewer: 'owner',
}

/** The free org shows on its members and billing tabs. Acme shows else. */
function orgFor(state: OrgSettingsState): Org {
  if (state.tab === 'members' && state.members === 'free') return orgs.firna
  if (state.tab === 'billing' && state.billing !== 'team') return orgs.firna
  return orgs.acme
}

function TabBody(props: { state: OrgSettingsState; org: Org }) {
  const { state, org } = props
  const owner = state.viewer === 'owner'
  switch (state.tab) {
    case 'general':
      return (
        <>
          <OrgDetailsSection initials={org.initials} name={org.name} />
          {owner ? <DeleteOrgSection name={org.name} /> : null}
        </>
      )
    case 'repositories':
      return (
        <Section
          description={`The cloud computer of ${org.name} holds these repositories, and its workspaces start in them. A change takes effect at the next build.`}
          title="Repositories"
        >
          <RepositoryList repositories={acmeRepositories} search="" />
        </Section>
      )
    case 'computer':
      return <ComputerTab build={state.build} org={org.name} />
    case 'members':
      return (
        <MembersTab
          canManage={owner}
          view={state.members}
          viewer={owner ? you : memberViewer}
        />
      )
    case 'billing':
      return <BillingTab view={state.billing} />
  }
}

/**
 * The settings of an org: its name and initials, the repositories that it
 * uses, its cloud computer, its members, and its billing. The app-wide
 * connections live in the account. Only an owner changes the members, sees
 * the billing, and deletes the org.
 */
export function OrgSettingsScreen(props: {
  state: OrgSettingsState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const org = orgFor(state)
  const free = org.key === 'firna'
  const owner = state.viewer === 'owner'
  const mobile = viewport === 'mobile'
  const list = free ? paths.newOrg : paths.shell
  const dialogs: Readonly<Record<OrgSettingsState['dialog'], ReactNode>> = {
    none: null,
    'delete-org': <DeleteOrgDialog viewport={viewport} />,
    'remove-member': <RemoveMemberDialog viewport={viewport} />,
  }
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: list } : undefined}
      subtitle="Org settings"
      tabs={<SettingsTabs billing={owner} tab={state.tab} wrap={mobile} />}
      title={org.name}
      viewport={viewport}
    >
      <TabBody org={org} state={state} />
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
      sections={free ? freeOrgSections() : workspaceSections()}
      settingsAlert={state.build === 'failed'}
    />
  )
  return (
    <AppFrame
      overlay={dialogs[state.dialog]}
      rail={{
        orgs: orgList,
        current: org.key,
        person: owner ? undefined : people[memberViewer],
      }}
      sidebar={sidebar}
    >
      {page}
    </AppFrame>
  )
}
