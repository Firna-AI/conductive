import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ScreenLink } from '../components/common/ScreenLink'
import { ActionButton } from '../components/common/actions'
import { MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { OrgNameFields } from '../components/settings/OrgSections'
import { RepositoryList } from '../components/settings/RepositoryList'
import {
  anotherOrg,
  newOrg,
  type ReachableRepository,
} from '../fixtures/repositories'
import { paths } from '../paths'
import styles from './forms.module.css'

export const createOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'repositories'],
  properties: {
    /**
     * Another org beside the user's orgs, or the first org of a new user,
     * which returns to Get started.
     */
    kind: { enum: ['another', 'first'] },
    /**
     * The repositories of the form: some chosen, none chosen yet, or none
     * that the GitHub App reaches. An org needs at least one, so Create
     * org stays off until one is chosen.
     */
    repositories: { enum: ['chosen', 'none', 'unreachable'] },
  },
} as const

export type CreateOrgState = SchemaProps<typeof createOrgSchema>

/** The repositories that the list shows in each state of the form. */
function listOf(
  repositories: readonly ReachableRepository[],
  state: CreateOrgState['repositories'],
): readonly ReachableRepository[] {
  switch (state) {
    case 'chosen':
      return repositories
    case 'none':
      return repositories.map((item) => ({ ...item, used: false }))
    case 'unreachable':
      return []
  }
}

/**
 * Creates an org: its name, its initials, and the repositories that its
 * workspaces use. The page stands alone, without the rail, until the org
 * exists. Create org needs at least one repository, because Create org
 * starts the first build of the cloud computer of the org.
 */
export function CreateOrgScreen(props: {
  state: CreateOrgState
  viewport: Viewport
}) {
  const first = props.state.kind === 'first'
  const form = first ? newOrg : anotherOrg
  const repositories = listOf(form.repositories, props.state.repositories)
  const ready = repositories.some((item) => item.used)
  const cancelTo = first ? paths.getStartedInstalled : paths.shell
  const createdTo = first ? paths.getStartedOrgCreated : paths.anotherNewOrg
  const create = (
    <ActionButton disabled={!ready} tone="primary">
      Create org
    </ActionButton>
  )
  const actions = (
    <>
      <ScreenLink asChild to={cancelTo}>
        <ActionButton>Cancel</ActionButton>
      </ScreenLink>
      {ready ? (
        <ScreenLink asChild to={createdTo}>
          {create}
        </ScreenLink>
      ) : (
        create
      )}
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
            workspaces start in them. Add at least one.
          </span>
          <RepositoryList repositories={repositories} search={form.search} />
        </div>
        {mobile ? null : <div className={styles.actions}>{actions}</div>}
      </div>
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return <div className={styles.standalone}>{page}</div>
}
