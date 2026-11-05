import type { SchemaProps, Viewport } from '@mokly/mokly'
import { ArrowUpRight, Plus } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { StatusText } from '../components/common/StatusText'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import type { RailState } from '../components/layout/OrgRail'
import { Page } from '../components/layout/Page'
import { Section, SectionText } from '../components/settings/Section'
import { account, installations } from '../fixtures/orgs'
import { paths } from '../paths'
import styles from './GetStartedScreen.module.css'

export const getStartedSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['github'],
  properties: {
    /** The GitHub App is not installed yet, or it is, after GitHub. */
    github: { enum: ['not-installed', 'installed'] },
  },
} as const

export type GetStartedState = SchemaProps<typeof getStartedSchema>

/** The account that owns the repositories, where the user installed the app. */
const owner = installations[0]

function InstallStep(props: { installed: boolean }) {
  if (!props.installed) {
    return (
      <Section
        actions={
          <ScreenLink asChild to={paths.getStartedInstalled}>
            <ActionButton icon={ArrowUpRight} tone="primary">
              Install the GitHub App
            </ActionButton>
          </ScreenLink>
        }
        description="Install it on the GitHub account that owns your repositories, such as the organization of your company. You choose the repositories that it can reach."
        title="1. Install the GitHub App"
      />
    )
  }
  return (
    <Section
      actions={<ActionButton icon={Plus}>Add another account</ActionButton>}
      status={<StatusText label="Installed" tone="success" />}
      title="1. Install the GitHub App"
    >
      <SectionText>
        Installed on <span className={styles.owner}>{owner.account}</span>, with{' '}
        {owner.repositories} repositories.
      </SectionText>
    </Section>
  )
}

function OrgStep(props: { installed: boolean }) {
  const create = (
    <ActionButton
      disabled={!props.installed}
      icon={Plus}
      tone={props.installed ? 'primary' : 'secondary'}
    >
      Create org
    </ActionButton>
  )
  return (
    <Section
      actions={
        props.installed ? (
          <ScreenLink asChild to={paths.createOrg}>
            {create}
          </ScreenLink>
        ) : (
          create
        )
      }
      description="An org holds your workspaces, the repositories that they use, and their cloud computer."
      title="2. Create your first org"
    />
  )
}

/**
 * The first run after the GitHub sign-in: the user installs the GitHub App
 * on the account that owns their repositories, then creates the first org.
 * The rail has no org yet.
 */
export function GetStartedScreen(props: {
  state: GetStartedState
  viewport: Viewport
}) {
  const installed = props.state.github === 'installed'
  const page = (
    <Page
      subtitle={`@${account.login}`}
      title="Get started"
      viewport={props.viewport}
    >
      <p className={styles.intro}>
        Welcome, {account.name}. Two steps before your first workspace.
      </p>
      <ol className={styles.steps}>
        <li>
          <InstallStep installed={installed} />
        </li>
        <li>
          <OrgStep installed={installed} />
        </li>
      </ol>
    </Page>
  )
  if (props.viewport === 'mobile') return <MobileFrame>{page}</MobileFrame>
  const rail: RailState = { orgs: [], current: undefined, firstRun: !installed }
  return <AppFrame rail={rail}>{page}</AppFrame>
}
