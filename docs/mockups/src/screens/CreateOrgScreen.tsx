import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ArrowUpRight } from 'lucide-react'
import { TeamTerms } from '../components/billing/TeamTerms'
import { ScreenLink } from '../components/common/ScreenLink'
import { ActionButton } from '../components/common/actions'
import { MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { OrgNameFields } from '../components/settings/OrgSections'
import { RepositoryList } from '../components/settings/RepositoryList'
import { orgs } from '../fixtures/orgs'
import { newOrg, teamOrg } from '../fixtures/repositories'
import { paths } from '../paths'
import styles from './forms.module.css'

export const createOrgSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind'],
  properties: {
    /**
     * A new org of a person who already owns a free org, which starts on
     * Team, or the first org of a new user, which is free.
     */
    kind: { enum: ['team', 'first'] },
  },
} as const

export type CreateOrgState = SchemaProps<typeof createOrgSchema>

/** A field of the form, labelled as Firna labels its fields. */
function Field(props: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{props.label}</span>
      <span className={styles.fieldHint}>{props.hint}</span>
      {props.children}
    </div>
  )
}

/**
 * Creates an org: its name, its initials, and the repositories that its
 * workspaces use. Each person owns one free org, so a person who already
 * owns one sees Team and continues to the payment on Stripe Checkout. The
 * page stands alone, without the rail, until the org exists.
 */
export function CreateOrgScreen(props: {
  state: CreateOrgState
  viewport: Viewport
}) {
  const team = props.state.kind === 'team'
  const form = team ? teamOrg : newOrg
  const cancelTo = team ? paths.shell : paths.getStarted
  const actions = (
    <>
      <ScreenLink asChild to={cancelTo}>
        <ActionButton>Cancel</ActionButton>
      </ScreenLink>
      {team ? (
        <ScreenLink asChild to={paths.newTeamOrg}>
          <ActionButton icon={ArrowUpRight} tone="primary">
            Continue to payment
          </ActionButton>
        </ScreenLink>
      ) : (
        <ScreenLink asChild to={paths.newOrg}>
          <ActionButton tone="primary">Create org</ActionButton>
        </ScreenLink>
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
        <Field
          hint="The cloud computer of the org holds these repositories, and its workspaces start in them."
          label="Repositories"
        >
          <RepositoryList
            repositories={form.repositories}
            search={form.search}
          />
        </Field>
        {team ? (
          <Field
            hint={`${orgs.firna.name} is your free org, so a new org starts on Team.`}
            label="Plan"
          >
            <TeamTerms after="the new org opens" members={1} />
          </Field>
        ) : null}
        {mobile ? null : <div className={styles.actions}>{actions}</div>}
      </div>
    </Page>
  )
  if (mobile) return <MobileFrame>{page}</MobileFrame>
  return <div className={styles.standalone}>{page}</div>
}
