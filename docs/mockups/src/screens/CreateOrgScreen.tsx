import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ScreenLink } from '../components/common/ScreenLink'
import { ActionButton } from '../components/common/actions'
import { MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { OrgNameFields } from '../components/settings/OrgSections'
import { RepositoryList } from '../components/settings/RepositoryList'
import { newOrg } from '../fixtures/repositories'
import { paths } from '../paths'
import styles from './forms.module.css'

export const createOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['first'],
  properties: {
    /** The first org of a new user: Cancel returns to Get started. */
    first: { type: 'boolean' },
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
  const cancelTo = props.state.first ? paths.getStarted : paths.shell
  const actions = (
    <>
      <ScreenLink asChild to={cancelTo}>
        <ActionButton>Cancel</ActionButton>
      </ScreenLink>
      <ScreenLink asChild to={paths.newOrg}>
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
        <OrgNameFields initials={newOrg.initials} name={newOrg.name} />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Repositories</span>
          <span className={styles.fieldHint}>
            The cloud computer of the org holds these repositories, and its
            workspaces start in them.
          </span>
          <RepositoryList
            repositories={newOrg.repositories}
            search={newOrg.search}
          />
        </div>
        {mobile ? null : <div className={styles.actions}>{actions}</div>}
      </div>
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return <div className={styles.standalone}>{page}</div>
}
