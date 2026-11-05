import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { Hammer } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import {
  BuildSection,
  type BuildState,
} from '../components/settings/BuildSection'
import {
  EnvVarsSection,
  ScriptSection,
} from '../components/settings/EnvironmentSections'
import {
  DeleteOrgSection,
  OrgDetailsSection,
  SettingsTabs,
} from '../components/settings/OrgSections'
import { RepositoryList } from '../components/settings/RepositoryList'
import { Section } from '../components/settings/Section'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import {
  changedInstallScript,
  includedSoftware,
  installScript,
  startupScript,
} from '../fixtures/computer'
import { orgs } from '../fixtures/orgs'
import { acmeRepositories } from '../fixtures/repositories'
import { workspaceList } from '../fixtures/workspaces'
import { paths } from '../paths'
import styles from './OrgSettingsScreen.module.css'

export const orgSettingsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['tab', 'build'],
  properties: {
    tab: { enum: ['general', 'repositories', 'computer'] },
    /** The builds of the cloud computer, which its tab shows. */
    build: { enum: ['ready', 'building', 'failed', 'changed'] },
  },
} as const

export type OrgSettingsState = SchemaProps<typeof orgSettingsSchema>

const org = orgs.acme

/** The org's cloud computer: its builds, its scripts, and its env vars. */
function ComputerTab(props: { build: BuildState }) {
  const changed = props.build === 'changed'
  return (
    <>
      <div className={styles.intro}>
        <h2 className={styles.title}>Cloud computer</h2>
        <p className={styles.text}>
          The shared cloud computer of {org.name}. Every workspace starts from
          it, with every repository of the org.
        </p>
      </div>
      <BuildSection state={props.build} />
      <ScriptSection
        description={`${includedSoftware} The install script runs only when you build the computer.`}
        notice={
          changed ? (
            <Notice
              action={
                <ActionButton icon={Hammer} tone="primary">
                  Build computer
                </ActionButton>
              }
              body="It runs at the next build. Workspaces keep the current build until then."
              icon={Hammer}
              title="The install script changed"
            />
          ) : undefined
        }
        script={changed ? changedInstallScript : installScript}
        title="Install software"
      />
      <ScriptSection
        description="Runs in the cloud computer of each workspace, at each start and resume."
        script={startupScript}
        title="Startup script"
      />
      <EnvVarsSection org={org.name} />
    </>
  )
}

/**
 * The settings of an org: its name and initials, the repositories that it
 * uses, and its cloud computer. The app-wide connections live in the
 * account.
 */
export function OrgSettingsScreen(props: {
  state: OrgSettingsState
  viewport: Viewport
}) {
  const { tab, build } = props.state
  const tabs: Readonly<Record<OrgSettingsState['tab'], ReactNode>> = {
    general: (
      <>
        <OrgDetailsSection initials={org.initials} name={org.name} />
        <DeleteOrgSection name={org.name} workspaces={workspaceList.length} />
      </>
    ),
    repositories: (
      <Section
        description={`The cloud computer of ${org.name} holds these repositories, and its workspaces start in them. A change takes effect at the next build.`}
        title="Repositories"
      >
        <RepositoryList repositories={acmeRepositories} search="" />
      </Section>
    ),
    computer: <ComputerTab build={build} />,
  }
  const mobile = props.viewport === 'mobile'
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: paths.shell } : undefined}
      subtitle="Org settings"
      tabs={<SettingsTabs tab={tab} />}
      title={org.name}
      viewport={props.viewport}
    >
      {tabs[tab]}
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  const sidebar = (
    <Sidebar
      current="settings"
      org={org}
      sections={workspaceSections()}
      settingsAlert={build === 'failed'}
    />
  )
  return <AppFrame sidebar={sidebar}>{page}</AppFrame>
}
