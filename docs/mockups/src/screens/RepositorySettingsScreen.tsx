import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { BaseSection } from '../components/settings/BaseSection'
import {
  EnvVarsSection,
  StartupScriptSection,
} from '../components/settings/EnvironmentSections'
import { workspaceGroups } from '../components/workspaces/groups'
import { Sidebar } from '../components/workspaces/Sidebar'
import { repositories } from '../fixtures/repositories'
import { paths } from '../paths'

export const repositorySettingsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['base'],
  properties: { base: { enum: ['ready', 'updating', 'failed'] } },
} as const

export type RepositorySettingsState = SchemaProps<
  typeof repositorySettingsSchema
>

/** The settings of one repository: its base, startup script, and env vars. */
export function RepositorySettingsScreen(props: {
  state: RepositorySettingsState
  viewport: Viewport
}) {
  const repository = repositories.storefront
  const mobile = props.viewport === 'mobile'
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: paths.shell } : undefined}
      subtitle="Repository settings"
      title={repository.name}
      viewport={props.viewport}
    >
      <BaseSection base={props.state.base} repository={repository} />
      <StartupScriptSection />
      <EnvVarsSection />
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  const groups = workspaceGroups({ storefrontBase: props.state.base })
  return <AppFrame sidebar={<Sidebar groups={groups} />}>{page}</AppFrame>
}
