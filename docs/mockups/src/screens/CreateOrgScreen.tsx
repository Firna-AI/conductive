import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ScreenLink } from '../components/common/ScreenLink'
import { ActionButton } from '../components/common/actions'
import { MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { OrgNameFields } from '../components/settings/OrgSections'
import { RepositoryList } from '../components/settings/RepositoryList'
import { anotherOrg, newOrg } from '../fixtures/repositories'
import { paths } from '../paths'
import styles from './forms.module.css'

export const createOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind'],
  properties: {
    /**
     * Another org beside the user's orgs, or the first org of a new user,
     * which returns to Get started.
     */
    kind: { enum: ['another', 'first'] },
  },
} as const

export type CreateOrgState = SchemaProps<typeof createOrgSchema>

/**
 * Creates an org: its name, its initials, and the repositories that its
 * workspaces use. The page stands alone, without the rail, until the org
 * exists. Get started installs the GitHub App first, so the page always
 * lists repositories.
 */
export function CreateOrgScreen(props: {
  state: CreateOrgState
  viewport: Viewport
}) {
  const first = props.state.kind === 'first'
  const form = first ? newOrg : anotherOrg
  const cancelTo = first ? paths.getStartedInstalled : paths.shell
  const createdTo = first ? paths.getStartedOrgCreated : paths.anotherNewOrg
  const actions = (
    <>
      <ScreenLink asChild to={cancelTo}>
        <ActionButton>Cancel</ActionButton>
      </ScreenLink>
      <ScreenLink asChild to={createdTo}>
        <ActionButton tone="primary">Create org</ActionButton>
      </ScreenLink>
    </>
  )
  const mobile = props.viewport === 'mobile'
  const page = (
    <Page
      actions={mobile ? actions : undefined}
      back={mobile ? { label: 'Cancel', to: cancelTo } : undefined}
      title="Create an org"
      viewport={props.viewport}
    >
      <div className={styles.form}>
        <OrgNameFields initials={form.initials} name={form.name} />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Repositories</span>
          <span className={styles.fieldHint}>
            The cloud computer of the org holds these repositories, and its
            workspaces start in them.
          </span>
          <RepositoryList
            repositories={form.repositories}
            search={form.search}
          />
        </div>
        {mobile ? null : <div className={styles.actions}>{actions}</div>}
      </div>
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return <div className={styles.standalone}>{page}</div>
}
