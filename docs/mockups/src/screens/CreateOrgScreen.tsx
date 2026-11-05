import type { SchemaProps, Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { Plug } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { Notice } from '../components/common/Notice'
import { MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { OrgNameFields } from '../components/settings/OrgSections'
import { RepositoryList } from '../components/settings/RepositoryList'
import { firstOrg, newOrg } from '../fixtures/repositories'
import { paths } from '../paths'
import styles from './forms.module.css'

export const createOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['connections'],
  properties: {
    /** GitHub and the agents are connected, or not yet, as at the first run. */
    connections: { enum: ['connected', 'not-connected'] },
  },
} as const

export type CreateOrgState = SchemaProps<typeof createOrgSchema>

/** Before GitHub is connected, the org cannot list repositories yet. */
function ConnectNotice() {
  return (
    <Notice
      action={
        <MockLink asChild to={paths.accountSetup}>
          <ActionButton>Open account</ActionButton>
        </MockLink>
      }
      body="Install the GitHub App and connect Claude or Codex in your account. Every org shares them."
      icon={Plug}
      title="Connect GitHub to choose repositories"
    />
  )
}

/**
 * Creates an org: its name, its initials, and the repositories that its
 * workspaces use. The page stands alone, without the rail, until the org
 * exists.
 */
export function CreateOrgScreen(props: {
  state: CreateOrgState
  viewport: Viewport
}) {
  const connected = props.state.connections === 'connected'
  const org = connected ? newOrg : firstOrg
  const cancelTo = connected ? paths.shell : paths.firstRun
  const create = <ActionButton tone="primary">Create org</ActionButton>
  const actions = (
    <>
      <MockLink asChild to={cancelTo}>
        <ActionButton>Cancel</ActionButton>
      </MockLink>
      {connected ? (
        <MockLink asChild to={paths.newOrg}>
          {create}
        </MockLink>
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
        <OrgNameFields initials={org.initials} name={org.name} />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Repositories</span>
          <span className={styles.fieldHint}>
            The cloud computer of the org holds these repositories, and its
            workspaces start in them.
          </span>
          {connected ? (
            <RepositoryList
              repositories={newOrg.repositories}
              search={newOrg.search}
            />
          ) : (
            <ConnectNotice />
          )}
        </div>
        {mobile ? null : <div className={styles.actions}>{actions}</div>}
      </div>
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return <div className={styles.standalone}>{page}</div>
}
